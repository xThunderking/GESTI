'use client';

import Image from 'next/image';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  Filter,
  KeyRound,
  LogOut,
  Mail,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  ApiError,
  protectedApiRequest,
  publicApiRequest,
  type ApiUser,
  type AuthResponse,
  type RoleName,
} from '@/lib/gesti-api';
import { cn } from '@/lib/utils';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

type ViewName = 'dashboard' | 'users';
type UserStatus = 'Activo' | 'Inactivo';
type UserRow = {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  status: UserStatus;
  essential?: boolean;
  mustChangePassword: boolean;
};

type UserFormState = {
  email: string;
  name: string;
  role: RoleName;
  status: UserStatus;
};

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

const usersAllowedRoles = new Set<RoleName>(['ADMIN', 'SUPERVISOR']);

const emptyUserForm: UserFormState = {
  email: '',
  name: '',
  role: 'USUARIO',
  status: 'Activo',
};

const tabStorageKey = 'gesti-tab-id';
const inactivityLimitMs = 2 * 60 * 60 * 1000;
const activityUpdateIntervalMs = 60 * 1000;
const brandLogoPath = '/brand/gesti-logo-horizontal.png';
const brandIconPath = '/brand/gesti-icon.png';
const passwordSchema = z
  .string()
  .min(9, 'Debe tener mas de 8 caracteres.')
  .regex(/[A-Z]/, 'Debe incluir una mayuscula.')
  .regex(/(?:.*\d){2}/, 'Debe incluir al menos 2 numeros.')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir un simbolo especial.');

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiUrl}/health`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('API sin respuesta');
  }

  return response.json() as Promise<HealthResponse>;
}

const ticketTrend = [
  { day: 'Lun', abiertos: 18, resueltos: 12 },
  { day: 'Mar', abiertos: 24, resueltos: 18 },
  { day: 'Mie', abiertos: 16, resueltos: 20 },
  { day: 'Jue', abiertos: 28, resueltos: 22 },
  { day: 'Vie', abiertos: 21, resueltos: 19 },
  { day: 'Sab', abiertos: 9, resueltos: 11 },
  { day: 'Dom', abiertos: 7, resueltos: 8 },
];

const assetStatus = [
  { name: 'Asignados', value: 134, color: '#00afaa' },
  { name: 'Stock', value: 28, color: '#0a1f44' },
  { name: 'Reparacion', value: 12, color: '#d97706' },
  { name: 'Retiro', value: 7, color: '#be123c' },
];

const serviceQueue = [
  {
    folio: 'TI-2026-0184',
    title: 'Equipo de imagenologia sin acceso a red',
    area: 'Radiologia',
    priority: 'Critica',
    status: 'En proceso',
  },
  {
    folio: 'TI-2026-0183',
    title: 'Alta de usuario para expediente clinico',
    area: 'Admision',
    priority: 'Media',
    status: 'Abierto',
  },
  {
    folio: 'TI-2026-0182',
    title: 'Cambio preventivo de UPS en site principal',
    area: 'Infraestructura',
    priority: 'Alta',
    status: 'Programado',
  },
];

const inventory = [
  { tag: 'LAP-0421', device: 'Laptop Dell Latitude', owner: 'Soporte clinico', state: 'Asignado' },
  { tag: 'IMP-0098', device: 'Impresora Zebra', owner: 'Farmacia', state: 'Reparacion' },
  { tag: 'SRV-0003', device: 'Servidor virtual HIS', owner: 'Infraestructura', state: 'Operativo' },
  { tag: 'MON-0165', device: 'Monitor 24 pulgadas', owner: 'Almacen TI', state: 'Stock' },
];

const kpis = [
  {
    label: 'Tickets abiertos',
    value: '42',
    delta: '+8 hoy',
    icon: ClipboardList,
    tone: 'text-[#0a1f44] bg-[#e6ebf0]',
  },
  {
    label: 'Activos registrados',
    value: '181',
    delta: '12 en revision',
    icon: Boxes,
    tone: 'text-[#007a78] bg-[#dff7f5]',
  },
  {
    label: 'Usuarios activos',
    value: '326',
    delta: 'RBAC pendiente',
    icon: Users,
    tone: 'text-slate-700 bg-slate-100',
  },
  {
    label: 'Servicios criticos',
    value: '7',
    delta: '100% monitoreado',
    icon: Server,
    tone: 'text-amber-700 bg-amber-50',
  },
];

export function GestiDashboard() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loginNotice, setLoginNotice] = useState('');
  const [activeView, setActiveView] = useState<ViewName>('dashboard');
  const refreshPromise = useRef<Promise<AuthResponse> | null>(null);
  const queryClient = useQueryClient();
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: fetchHealth,
  });
  const currentUser = session?.user ?? null;
  const currentRole = currentUser?.roles[0] ?? 'USUARIO';
  const canViewUsers = currentUser
    ? currentUser.roles.some((role) => usersAllowedRoles.has(role))
    : false;
  const navigationItems: Array<{ id: ViewName; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: 'Tablero', icon: BarChart3 },
    ...(canViewUsers ? [{ id: 'users' as const, label: 'Usuarios', icon: Users }] : []),
  ];

  const clearLocalSession = useCallback(
    (notice = '') => {
      window.sessionStorage.removeItem(tabStorageKey);
      window.sessionStorage.removeItem('gesti-session');
      setSession(null);
      setActiveView('dashboard');
      setLoginNotice(notice);
      queryClient.removeQueries({ queryKey: ['users'] });
    },
    [queryClient],
  );

  const renewSession = useCallback(async (tabId: string) => {
    if (!refreshPromise.current) {
      refreshPromise.current = publicApiRequest<AuthResponse>('/auth/refresh', tabId, {
        method: 'POST',
      }).finally(() => {
        refreshPromise.current = null;
      });
    }

    return refreshPromise.current;
  }, []);

  const authenticatedRequest = useCallback<AuthenticatedRequest>(
    async <T,>(path: string, init?: RequestInit) => {
      if (!session) {
        throw new ApiError('No hay una sesion activa.', 401);
      }

      const tabId = window.sessionStorage.getItem(tabStorageKey);
      if (!tabId) {
        clearLocalSession('La sesion de esta pestana ya no es valida.');
        throw new ApiError('Falta el identificador de la pestana.', 401);
      }

      try {
        return await protectedApiRequest<T>(path, tabId, session.accessToken, init);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        try {
          const renewed = await renewSession(tabId);
          setSession(renewed);
          return await protectedApiRequest<T>(path, tabId, renewed.accessToken, init);
        } catch (refreshError) {
          clearLocalSession('Tu sesion expiro. Inicia sesion nuevamente.');
          throw refreshError;
        }
      }
    },
    [clearLocalSession, renewSession, session],
  );

  useEffect(() => {
    const restoreSessionTimer = window.setTimeout(async () => {
      window.sessionStorage.removeItem('gesti-session');
      const tabId = window.sessionStorage.getItem(tabStorageKey);

      if (tabId) {
        try {
          setSession(await renewSession(tabId));
        } catch {
          window.sessionStorage.removeItem(tabStorageKey);
        }
      }

      setSessionReady(true);
    }, 0);

    return () => window.clearTimeout(restoreSessionTimer);
  }, [renewSession]);

  const handleLogout = useCallback(
    async (notice = '') => {
      const tabId = window.sessionStorage.getItem(tabStorageKey);

      if (tabId) {
        try {
          await publicApiRequest<void>('/auth/logout', tabId, { method: 'POST' });
        } catch {
          // Local cleanup still prevents this tab from reusing the session.
        }
      }

      clearLocalSession(notice);
    },
    [clearLocalSession],
  );

  useEffect(() => {
    if (!sessionReady || !currentUser) {
      return;
    }

    let lastServerUpdateAt = Date.now();
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const scheduleLogout = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        void handleLogout('Tu sesion se cerro despues de 2 horas sin actividad.');
      }, inactivityLimitMs);
    };

    const registerActivity = () => {
      const now = Date.now();
      scheduleLogout();

      if (now - lastServerUpdateAt >= activityUpdateIntervalMs) {
        lastServerUpdateAt = now;
        void authenticatedRequest('/auth/me').catch(() => undefined);
      }
    };

    scheduleLogout();
    const activityEvents: Array<keyof WindowEventMap> = [
      'pointermove',
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, registerActivity, { passive: true }),
    );

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, registerActivity),
      );
    };
  }, [authenticatedRequest, currentUser, handleLogout, sessionReady]);

  async function handleLogin(email: string, password: string) {
    const tabId = crypto.randomUUID();
    const authenticated = await publicApiRequest<AuthResponse>('/auth/login', tabId, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    window.sessionStorage.setItem(tabStorageKey, tabId);
    setSession(authenticated);
    setActiveView('dashboard');
    setLoginNotice('');
  }

  async function handleChangePassword(newPassword: string, confirmation: string) {
    const user = await authenticatedRequest<AuthResponse['user']>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmation }),
    });
    setSession((current) => (current ? { ...current, user } : current));
  }

  if (!sessionReady) {
    return <main className="min-h-screen bg-background" />;
  }

  if (!currentUser) {
    return <LoginView notice={loginNotice} onLogin={handleLogin} />;
  }

  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordView
        email={currentUser.email}
        onChangePassword={handleChangePassword}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col border-b border-white/10 bg-[#061b38] px-4 py-4 text-white lg:border-b-0 lg:border-r">
          <BrandMark />

          <nav className="mt-6 grid gap-1">
            {navigationItems.map((item) => (
              <button
                aria-current={activeView === item.id ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                  activeView === item.id && 'bg-[#00afaa] text-[#061b38]',
                )}
                onClick={() => setActiveView(item.id)}
                key={item.label}
                type="button"
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-6 border-t border-white/10 pt-4 lg:mt-auto">
            <div className="rounded-md border border-white/10 bg-white/8 p-3">
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="mt-1 break-all text-xs text-white/65">{currentUser.email}</p>
              <span className="mt-3 inline-flex rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold text-white">
                {currentUser.roles.join(', ')}
              </span>
            </div>
            <Button
              className="mt-3 w-full justify-start border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => handleLogout()}
              variant="outline"
            >
              <LogOut />
              Cerrar sesion
            </Button>
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          {activeView === 'dashboard' ? (
            <>
              <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                    Operacion de TI
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tickets, activos, usuarios y servicios del hospital en una sola vista.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-9 min-w-64 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground">
                    <Search className="size-4" />
                    <span>Buscar folio, equipo o usuario</span>
                  </div>
                  <Button variant="outline">
                    <Filter />
                    Filtrar
                  </Button>
                  <Button variant="outline">
                    <Download />
                    Exportar
                  </Button>
                  <Button>
                    <Plus />
                    Nuevo ticket
                  </Button>
                </div>
              </header>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <StatusPill
                  icon={healthQuery.isSuccess ? CheckCircle2 : AlertTriangle}
                  label={
                    healthQuery.isSuccess
                      ? `API ${healthQuery.data.status}`
                      : healthQuery.isLoading
                        ? 'Verificando API'
                        : 'API pendiente'
                  }
                  tone={healthQuery.isSuccess ? 'success' : 'warning'}
                />
                <StatusPill icon={ShieldCheck} label="JWT + RBAC planeado" tone="neutral" />
                <StatusPill icon={Server} label="PostgreSQL 18 local" tone="neutral" />
              </div>

              <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((item) => (
                  <article className="rounded-md border bg-card p-4 shadow-sm" key={item.label}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-3xl font-semibold tracking-normal">{item.value}</p>
                      </div>
                      <div
                        className={cn(
                          'flex size-10 items-center justify-center rounded-md',
                          item.tone,
                        )}
                      >
                        <item.icon className="size-5" />
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-medium text-muted-foreground">{item.delta}</p>
                  </article>
                ))}
              </section>

              <section className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <article className="rounded-md border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold tracking-normal">Flujo semanal</h2>
                      <p className="text-sm text-muted-foreground">
                        Apertura y resolucion de tickets
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <BarChart3 />
                      Ver detalle
                    </Button>
                  </div>
                  <div className="mt-5 h-72">
                    <ResponsiveContainer height="100%" width="100%">
                      <BarChart data={ticketTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} />
                        <YAxis allowDecimals={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                        <Bar dataKey="abiertos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="resueltos" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="rounded-md border bg-card p-4 shadow-sm">
                  <h2 className="text-base font-semibold tracking-normal">Estado de activos</h2>
                  <p className="text-sm text-muted-foreground">
                    Inventario por condicion operativa
                  </p>
                  <div className="mt-5 h-72">
                    <ResponsiveContainer height="100%" width="100%">
                      <PieChart>
                        <Pie
                          data={assetStatus}
                          dataKey="value"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={3}
                        >
                          {assetStatus.map((entry) => (
                            <Cell fill={entry.color} key={entry.name} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {assetStatus.map((item) => (
                      <div className="flex items-center gap-2" key={item.name}>
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <article className="rounded-md border bg-card shadow-sm">
                  <div className="border-b p-4">
                    <h2 className="text-base font-semibold tracking-normal">Cola de servicio</h2>
                    <p className="text-sm text-muted-foreground">
                      Tickets que requieren seguimiento
                    </p>
                  </div>
                  <div className="divide-y">
                    {serviceQueue.map((ticket) => (
                      <div className="grid gap-2 p-4" key={ticket.folio}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{ticket.folio}</p>
                            <p className="mt-1 text-sm text-foreground">{ticket.title}</p>
                          </div>
                          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{ticket.area}</span>
                          <span>{ticket.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-md border bg-card shadow-sm">
                  <div className="border-b p-4">
                    <h2 className="text-base font-semibold tracking-normal">Inventario reciente</h2>
                    <p className="text-sm text-muted-foreground">
                      Activos con cambios o revision pendiente
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Etiqueta</th>
                          <th className="px-4 py-3 font-semibold">Equipo</th>
                          <th className="px-4 py-3 font-semibold">Responsable</th>
                          <th className="px-4 py-3 font-semibold">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inventory.map((asset) => (
                          <tr key={asset.tag}>
                            <td className="px-4 py-3 font-medium">{asset.tag}</td>
                            <td className="px-4 py-3">{asset.device}</td>
                            <td className="px-4 py-3 text-muted-foreground">{asset.owner}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-md border px-2 py-1 text-xs font-medium">
                                {asset.state}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </>
          ) : canViewUsers ? (
            <UsersView currentRole={currentRole} request={authenticatedRequest} />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white p-1 shadow-sm">
        <Image
          alt="Icono GESTI"
          className="size-full object-contain"
          height={44}
          src={brandIconPath}
          width={44}
        />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tracking-normal">GESTI</p>
        <p className="text-xs text-white/65">Sistema de gestion de TI</p>
      </div>
    </div>
  );
}

function AuthShell({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#061b38]">
      <div className="grid min-h-screen lg:grid-cols-[1fr_0.95fr]">
        <section className="hidden min-h-screen flex-col justify-between border-r border-white/10 px-10 py-8 text-white lg:flex">
          <div className="w-fit rounded-md bg-white p-4 shadow-xl shadow-black/10">
            <Image
              alt="GESTI"
              className="h-auto w-72 object-contain"
              height={96}
              priority
              src={brandLogoPath}
              width={288}
            />
          </div>

          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#00afaa]">
              Area de Sistemas
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal">
              Sistema de gestion del departamento de TI
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/70">
              Acceso operativo para administrar usuarios, roles, sesiones y modulos internos.
            </p>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.08] p-3">
              <ShieldCheck className="size-4 text-[#00afaa]" />
              <span className="text-white/75">JWT, refresh tokens y RBAC activos</span>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.08] p-3">
              <Server className="size-4 text-[#00afaa]" />
              <span className="text-white/75">API NestJS conectada a PostgreSQL</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-8 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-5 flex justify-center lg:hidden">
              <Image
                alt="GESTI"
                className="h-auto w-56 object-contain"
                height={80}
                priority
                src={brandLogoPath}
                width={224}
              />
            </div>

            <section className="w-full rounded-md border bg-card p-6 shadow-xl shadow-slate-900/5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-md bg-[#061b38] p-1">
                  <Image
                    alt="Icono GESTI"
                    className="size-full object-contain"
                    height={44}
                    src={brandIconPath}
                    width={44}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-normal">{title}</h1>
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>
              </div>

              {children}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginView({
  onLogin,
  notice,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  notice: string;
}) {
  const [email, setEmail] = useState('admin@gesti.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No fue posible iniciar sesion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell subtitle="Acceso al departamento de TI" title="Iniciar sesion">
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Correo
            <span className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 transition-colors focus-within:border-[#00afaa] focus-within:ring-2 focus-within:ring-[#00afaa]/20">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Contrasena
            <span className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 transition-colors focus-within:border-[#00afaa] focus-within:ring-2 focus-within:ring-[#00afaa]/20">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </span>
          </label>

          {error ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          ) : null}

          {notice ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {notice}
            </p>
          ) : null}

          <Button className="bg-[#061b38] hover:bg-[#0a1f44]" disabled={submitting} type="submit">
            <UserCheck />
            {submitting ? 'Validando...' : 'Entrar'}
          </Button>
      </form>

      <div className="mt-5 rounded-md border bg-secondary p-3 text-sm">
        <p className="font-medium">Usuario local de prueba</p>
        <p className="mt-1 break-all text-muted-foreground">admin@gesti.local</p>
      </div>
    </AuthShell>
  );
}

function ChangePasswordView({
  email,
  onChangePassword,
  onLogout,
}: {
  email: string;
  onChangePassword: (newPassword: string, confirmation: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const conditions = [
    { label: 'Mas de 8 caracteres', valid: newPassword.length >= 9 },
    { label: 'Una letra mayuscula', valid: /[A-Z]/.test(newPassword) },
    { label: 'Al menos 2 numeros', valid: (newPassword.match(/\d/g)?.length ?? 0) >= 2 },
    { label: 'Un simbolo especial', valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = passwordSchema.safeParse(newPassword);

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'La contrasena no cumple las condiciones.');
      return;
    }

    if (newPassword !== confirmation) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onChangePassword(newPassword, confirmation);
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : 'No fue posible cambiar la contrasena.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell subtitle={email} title="Crea tu contrasena">
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Nueva contrasena
            <input
              autoComplete="new-password"
              className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-[#00afaa] focus-visible:ring-2 focus-visible:ring-[#00afaa]/20"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </label>

          <div className="grid grid-cols-1 gap-2 rounded-md border bg-secondary p-3 sm:grid-cols-2">
            {conditions.map((condition) => (
              <div
                className={cn(
                  'flex items-center gap-2 text-xs',
                  condition.valid ? 'text-[#007a78]' : 'text-muted-foreground',
                )}
                key={condition.label}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                {condition.label}
              </div>
            ))}
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Confirmar contrasena
            <input
              autoComplete="new-password"
              className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-[#00afaa] focus-visible:ring-2 focus-visible:ring-[#00afaa]/20"
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              value={confirmation}
            />
          </label>

          {error ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          ) : null}

          <Button className="bg-[#061b38] hover:bg-[#0a1f44]" disabled={submitting} type="submit">
            <ShieldCheck />
            {submitting ? 'Guardando...' : 'Guardar contrasena'}
          </Button>
          <Button onClick={onLogout} type="button" variant="outline">
            <LogOut />
            Cerrar sesion
          </Button>
      </form>
    </AuthShell>
  );
}

function UsersView({
  currentRole,
  request,
}: {
  currentRole: RoleName;
  request: AuthenticatedRequest;
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(emptyUserForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => request<ApiUser[]>('/users'),
  });
  const users: UserRow[] = (usersQuery.data ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.roles[0] ?? 'USUARIO',
    status: user.isActive ? 'Activo' : 'Inactivo',
    essential: user.essential,
    mustChangePassword: user.mustChangePassword,
  }));
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredUsers = users.filter((user) =>
    [user.name, user.email, user.role].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );
  const canManageUsers = usersAllowedRoles.has(currentRole);
  const isEditing = editingUserId !== null;
  const saveUserMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: Record<string, unknown> }) =>
      request<ApiUser>(id ? `/users/${id}` : '/users', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  function updateFormField<Key extends keyof UserFormState>(key: Key, value: UserFormState[Key]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingUserId(null);
    setFormState(emptyUserForm);
    setFormError('');
    setFormSuccess('');
  }

  function handleEdit(user: UserRow) {
    if (user.essential) {
      return;
    }

    setEditingUserId(user.id);
    setFormState({
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });
    setFormError('');
    setFormSuccess('');
  }

  async function handleDelete(user: UserRow) {
    if (user.essential) {
      return;
    }

    const confirmed = window.confirm(`Eliminar usuario ${user.email}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(user.id);
      if (editingUserId === user.id) {
        resetForm();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible eliminar el usuario.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = formState.name.trim();
    const email = formState.email.trim().toLocaleLowerCase('es');

    if (!name || !email) {
      setFormError('Nombre y correo son obligatorios.');
      return;
    }

    const duplicatedEmail = users.some(
      (user) => user.email.toLocaleLowerCase('es') === email && user.id !== editingUserId,
    );

    if (duplicatedEmail) {
      setFormError('Ya existe un usuario con ese correo.');
      return;
    }

    try {
      const creatingUser = !isEditing;
      await saveUserMutation.mutateAsync({
        id: editingUserId,
        body: {
          email,
          name,
          role: formState.role,
          isActive: formState.status === 'Activo',
        },
      });
      resetForm();
      if (creatingUser) {
        setFormSuccess('Usuario creado. La contrasena temporal fue enviada por correo.');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar el usuario.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administracion de cuentas, estado y nivel de acceso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 w-fit items-center gap-2 rounded-md border bg-card px-3 text-sm">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-muted-foreground">Rol actual</span>
            <span className="font-semibold">{currentRole}</span>
          </div>
          <Button onClick={resetForm} variant="outline">
            <UserPlus />
            Nuevo usuario
          </Button>
        </div>
      </header>

      {usersQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando usuarios...
        </p>
      ) : null}

      {usersQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {usersQuery.error.message}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserMetric icon={Users} label="Usuarios totales" value={users.length} />
        <UserMetric
          icon={UserCheck}
          label="Usuarios activos"
          value={users.filter((user) => user.status === 'Activo').length}
        />
        <UserMetric
          icon={ShieldCheck}
          label="Administradores"
          value={users.filter((user) => user.role === 'ADMIN').length}
        />
        <UserMetric
          icon={UserCog}
          label="Gestionables"
          value={users.filter((user) => !user.essential).length}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <form className="rounded-md border bg-card p-4 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-normal">
                {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <p className="text-sm text-muted-foreground">
                ADMIN y SUPERVISOR pueden gestionar cuentas.
              </p>
            </div>
            {isEditing ? (
              <Button
                aria-label="Cancelar edicion"
                onClick={resetForm}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nombre
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={!canManageUsers}
                onChange={(event) => updateFormField('name', event.target.value)}
                value={formState.name}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Correo
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={!canManageUsers}
                onChange={(event) => updateFormField('email', event.target.value)}
                type="email"
                value={formState.email}
              />
            </label>

            {!isEditing ? (
              <p className="rounded-md border bg-secondary p-3 text-sm text-muted-foreground">
                La contrasena temporal se generara y enviara al correo del usuario.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-2 text-sm font-medium">
                Rol
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={!canManageUsers}
                  onChange={(event) => updateFormField('role', event.target.value as RoleName)}
                  value={formState.role}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="TI">TI</option>
                  <option value="USUARIO">USUARIO</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Estado
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={!canManageUsers}
                  onChange={(event) => updateFormField('status', event.target.value as UserStatus)}
                  value={formState.status}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
            </div>

            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            {formSuccess ? (
              <p className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
                {formSuccess}
              </p>
            ) : null}

            <Button disabled={!canManageUsers || saveUserMutation.isPending} type="submit">
              {isEditing ? <Edit3 /> : <UserPlus />}
              {saveUserMutation.isPending
                ? 'Guardando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear usuario'}
            </Button>
          </div>
        </form>

        <section className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-normal">Directorio de usuarios</h2>
              <p className="text-sm text-muted-foreground">{filteredUsers.length} registro(s)</p>
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar usuarios</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar nombre, correo o rol"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Correo</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr
                    className={editingUserId === user.id ? 'bg-secondary/70' : undefined}
                    key={user.id}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name}</div>
                      {user.essential ? (
                        <span className="mt-1 inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          Admin esencial
                        </span>
                      ) : null}
                      {user.mustChangePassword ? (
                        <span className="mt-1 ml-2 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                          Primer acceso pendiente
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border bg-background px-2 py-1 text-xs font-semibold">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-2',
                          user.status === 'Activo' ? 'text-teal-700' : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            user.status === 'Activo' ? 'bg-teal-600' : 'bg-muted-foreground',
                          )}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Editar ${user.name}`}
                          disabled={!canManageUsers || user.essential}
                          onClick={() => handleEdit(user)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar ${user.name}`}
                          disabled={
                            !canManageUsers || user.essential || deleteUserMutation.isPending
                          }
                          onClick={() => void handleDelete(user)}
                          size="icon"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </>
  );
}

function UserMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="size-5" />
        </div>
      </div>
    </article>
  );
}

function StatusPill({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  return (
    <div
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium',
        tone === 'success' && 'border-teal-200 bg-teal-50 text-teal-800',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'neutral' && 'border-border bg-card text-muted-foreground',
      )}
    >
      <Icon className="size-4" />
      {label}
    </div>
  );
}
