import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE_NAME, SESSION_ABSOLUTE_TTL_MS, TAB_ID_HEADER } from './auth.constants';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PasswordChangeTokenGuard } from './guards/password-change-token.guard';
import { getTabId } from './tab-id';

@ApiTags('Autenticacion')
@ApiHeader({ name: TAB_ID_HEADER, required: true, description: 'UUID exclusivo de la pestana.' })
@Controller('auth')
export class AuthController {
  private readonly production: boolean;

  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) configService: ConfigService,
  ) {
    this.production = configService.get('NODE_ENV') === 'production';
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesion' })
  async login(
    @Body(
      new ValidationPipe({
        expectedType: LoginDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      getTabId(request),
      request.ip,
      request.headers['user-agent'],
    );
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotar el refresh token y renovar el JWT' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(
      request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
      getTabId(request),
    );
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar la sesion actual' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(
      request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
      getTabId(request),
    );
    response.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el usuario de la sesion actual' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PasswordChangeTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Establecer la contrasena personal en el primer acceso' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(
      new ValidationPipe({
        expectedType: ChangePasswordDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: SESSION_ABSOLUTE_TTL_MS,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.production,
      sameSite: 'strict' as const,
      path: '/api/auth',
    };
  }
}
