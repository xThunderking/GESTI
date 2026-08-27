import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import type { AuthenticatedUser } from '../auth.types';
import { getTabId } from '../tab-id';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class PasswordChangeTokenGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Se requiere un token de acceso.');
    }

    request.user = await this.authService.validateAccessToken(token, getTabId(request), true);
    return true;
  }
}
