import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RoleName } from '../../generated/prisma/client';
import { ROLES_METADATA_KEY } from '../auth.constants';
import type { AuthenticatedUser } from '../auth.types';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const allowed = request.user?.roles.some((role) => requiredRoles.includes(role));

    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para realizar esta accion.');
    }

    return true;
  }
}
