import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../../generated/prisma/client';
import { ROLES_METADATA_KEY } from '../auth.constants';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_METADATA_KEY, roles);
