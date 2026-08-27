import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  ACTIVITY_UPDATE_INTERVAL_MS,
  INACTIVITY_LIMIT_MS,
  SESSION_ABSOLUTE_TTL_MS,
} from './auth.constants';
import type { AccessTokenPayload, AuthenticatedUser } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly dummyPasswordHash = argon2.hash(randomBytes(32));

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) configService: ConfigService,
  ) {
    this.accessTokenSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    if (this.accessTokenSecret.length < 32 || this.accessTokenSecret.startsWith('change_me')) {
      throw new Error(
        'JWT_ACCESS_SECRET debe tener al menos 32 caracteres y no ser un placeholder.',
      );
    }
  }

  async login(dto: LoginDto, tabId: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: { include: { role: true } } },
    });
    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const passwordMatches = await argon2.verify(passwordHash, dto.password);

    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.');
    }

    const now = new Date();
    const sessionId = randomUUID();
    const sessionExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS);
    const refreshToken = this.createOpaqueToken();

    await this.prisma.$transaction([
      this.prisma.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tabIdHash: this.hash(tabId),
          expiresAt: sessionExpiresAt,
          ipAddress: ipAddress?.slice(0, 255),
          userAgent: userAgent?.slice(0, 1000),
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          id: refreshToken.id,
          tokenHash: this.hash(refreshToken.value),
          expiresAt: sessionExpiresAt,
          userId: user.id,
          sessionId,
        },
      }),
    ]);

    const authenticatedUser = this.mapUser(user, sessionId);

    return {
      accessToken: await this.signAccessToken(user.id, sessionId),
      refreshToken: refreshToken.value,
      user: authenticatedUser,
    };
  }

  async refresh(rawToken: string | undefined, tabId: string) {
    const tokenId = this.getTokenId(rawToken);
    const storedToken = tokenId
      ? await this.prisma.refreshToken.findUnique({
          where: { id: tokenId },
          include: {
            session: true,
            user: { include: { roles: { include: { role: true } } } },
          },
        })
      : null;

    if (!rawToken || !storedToken || !this.hashMatches(rawToken, storedToken.tokenHash)) {
      throw new UnauthorizedException('Sesion no valida.');
    }

    if (storedToken.revokedAt) {
      await this.revokeSession(storedToken.sessionId);
      throw new UnauthorizedException('Se detecto la reutilizacion de un token.');
    }

    await this.assertSessionIsUsable(storedToken.session, storedToken.user.isActive, tabId);

    const now = new Date();
    if (storedToken.expiresAt <= now) {
      await this.revokeSession(storedToken.sessionId);
      throw new UnauthorizedException('La sesion expiro.');
    }

    const rotatedToken = this.createOpaqueToken();
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: now },
    });

    if (revoked.count !== 1) {
      await this.revokeSession(storedToken.sessionId);
      throw new UnauthorizedException('La sesion ya fue renovada.');
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          id: rotatedToken.id,
          tokenHash: this.hash(rotatedToken.value),
          expiresAt: storedToken.expiresAt,
          userId: storedToken.userId,
          sessionId: storedToken.sessionId,
        },
      }),
      this.prisma.authSession.update({
        where: { id: storedToken.sessionId },
        data: { lastActivityAt: now },
      }),
    ]);

    return {
      accessToken: await this.signAccessToken(storedToken.userId, storedToken.sessionId),
      refreshToken: rotatedToken.value,
      user: this.mapUser(storedToken.user, storedToken.sessionId),
    };
  }

  async logout(rawToken: string | undefined, tabId: string) {
    const tokenId = this.getTokenId(rawToken);

    if (!rawToken || !tokenId) {
      return;
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { session: true },
    });

    if (
      storedToken &&
      this.hashMatches(rawToken, storedToken.tokenHash) &&
      this.hashMatches(tabId, storedToken.session.tabIdHash)
    ) {
      await this.revokeSession(storedToken.sessionId);
    }
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    if (!user.mustChangePassword) {
      throw new ForbiddenException('El cambio obligatorio de contrasena ya fue completado.');
    }

    if (dto.newPassword !== dto.confirmation) {
      throw new BadRequestException('La confirmacion de la contrasena no coincide.');
    }

    const existing = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (await argon2.verify(existing.passwordHash, dto.newPassword)) {
      throw new BadRequestException('La nueva contrasena debe ser diferente a la temporal.');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await transaction.authSession.updateMany({
        where: { userId: user.id, id: { not: user.sessionId }, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: { userId: user.id, sessionId: { not: user.sessionId }, revokedAt: null },
        data: { revokedAt: now },
      });
      return transaction.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { roles: { include: { role: true } } },
      });
    });

    return this.mapUser(updated, user.sessionId);
  }

  async validateAccessToken(
    token: string,
    tabId: string,
    allowPasswordChangeRequired = false,
  ): Promise<AuthenticatedUser> {
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.accessTokenSecret,
      });
    } catch {
      throw new UnauthorizedException('Token de acceso no valido.');
    }

    if (payload.type !== 'access' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException('Token de acceso no valido.');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Sesion no valida.');
    }

    await this.assertSessionIsUsable(session, session.user.isActive, tabId);

    if (session.user.mustChangePassword && !allowPasswordChangeRequired) {
      throw new ForbiddenException('Debes establecer tu contrasena personal antes de continuar.');
    }

    const now = new Date();
    if (now.getTime() - session.lastActivityAt.getTime() >= ACTIVITY_UPDATE_INTERVAL_MS) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { lastActivityAt: now },
      });
    }

    return this.mapUser(session.user, session.id);
  }

  private async assertSessionIsUsable(
    session: {
      id: string;
      tabIdHash: string;
      lastActivityAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
    },
    userIsActive: boolean,
    tabId: string,
  ) {
    const now = Date.now();
    const expiredByInactivity = now - session.lastActivityAt.getTime() >= INACTIVITY_LIMIT_MS;

    if (
      !userIsActive ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      expiredByInactivity ||
      !this.hashMatches(tabId, session.tabIdHash)
    ) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('La sesion expiro o no pertenece a esta pestana.');
    }
  }

  private async revokeSession(sessionId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  private async signAccessToken(userId: string, sessionId: string) {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId, type: 'access' };
    return this.jwtService.signAsync(payload, {
      secret: this.accessTokenSecret,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  private createOpaqueToken() {
    const id = randomUUID();
    return { id, value: `${id}.${randomBytes(48).toString('base64url')}` };
  }

  private getTokenId(token?: string) {
    const id = token?.split('.', 1)[0];
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ? id
      : null;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashMatches(value: string, expectedHash: string) {
    const actual = Buffer.from(this.hash(value), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private mapUser(
    user: {
      id: string;
      email: string;
      name: string;
      mustChangePassword: boolean;
      roles: Array<{ role: { name: AuthenticatedUser['roles'][number] } }>;
    },
    sessionId: string,
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(({ role }) => role.name),
      sessionId,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
