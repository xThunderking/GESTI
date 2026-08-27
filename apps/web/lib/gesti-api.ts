export type RoleName = 'ADMIN' | 'SUPERVISOR' | 'TI' | 'USUARIO';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: RoleName[];
  sessionId: string;
  mustChangePassword: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: RoleName[];
  essential: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function publicApiRequest<T>(
  path: string,
  tabId: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Tab-Id': tabId,
      ...init?.headers,
    },
  });

  return parseResponse<T>(response);
}

export async function protectedApiRequest<T>(
  path: string,
  tabId: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Tab-Id': tabId,
      ...init?.headers,
    },
  });

  return parseResponse<T>(response);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message)
    ? body.message.join(' ')
    : (body?.message ?? 'No fue posible completar la solicitud.');

  throw new ApiError(message, response.status);
}
