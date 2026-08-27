import type { RoleName } from '../generated/prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
  sessionId: string;
  mustChangePassword: boolean;
};

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  type: 'access';
};
