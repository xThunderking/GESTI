import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { ESSENTIAL_ADMIN_EMAIL } from '../auth/auth.constants';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const userInclude = { roles: { include: { role: true } } } as const;

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailService) private readonly mailService: MailService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: userInclude,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
    return users.map((user) => this.toResponse(user));
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailAvailable(email);
    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });

    if (!role) {
      throw new BadRequestException('El rol seleccionado no existe.');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        isActive: dto.isActive,
        mustChangePassword: true,
        roles: { create: { roleId: role.id } },
      },
      include: userInclude,
    });

    try {
      await this.mailService.sendTemporaryPassword({
        email: user.email,
        name: user.name,
        temporaryPassword,
      });
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } });
      throw error;
    }

    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.assertNotEssential(existing.email);
    const email = dto.email?.trim().toLowerCase();

    if (email) {
      await this.assertEmailAvailable(email, id);
    }

    const role = dto.role ? await this.prisma.role.findUnique({ where: { name: dto.role } }) : null;

    if (dto.role && !role) {
      throw new BadRequestException('El rol seleccionado no existe.');
    }

    const now = new Date();
    const user = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          email,
          isActive: dto.isActive,
        },
      });

      if (role) {
        await transaction.userRole.deleteMany({ where: { userId: id } });
        await transaction.userRole.create({ data: { userId: id, roleId: role.id } });
      }

      if (dto.isActive === false) {
        await transaction.authSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
        await transaction.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      return transaction.user.findUniqueOrThrow({ where: { id }, include: userInclude });
    });

    return this.toResponse(user);
  }

  async remove(id: string, currentUserId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.assertNotEssential(existing.email);

    if (id === currentUserId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }

    await this.prisma.user.delete({ where: { id } });
  }

  private async assertEmailAvailable(email: string, excludedUserId?: string) {
    const duplicated = await this.prisma.user.findFirst({
      where: { email, id: excludedUserId ? { not: excludedUserId } : undefined },
      select: { id: true },
    });

    if (duplicated) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }
  }

  private assertNotEssential(email: string) {
    if (email.toLowerCase() === ESSENTIAL_ADMIN_EMAIL) {
      throw new ForbiddenException('El administrador esencial no se puede modificar ni eliminar.');
    }
  }

  private generateTemporaryPassword() {
    return `Tmp!${randomBytes(12).toString('base64url')}42A`;
  }

  private toResponse(user: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    mustChangePassword: boolean;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{ role: { name: string } }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles.map(({ role }) => role.name),
      essential: user.email.toLowerCase() === ESSENTIAL_ADMIN_EMAIL,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
