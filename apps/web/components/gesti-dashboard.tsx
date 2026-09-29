'use client';

import Image from 'next/image';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  Filter,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Menu,
  Network,
  Plus,
  Printer,
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
import { RecordCards } from '@/components/ui/record-cards';
import { ModuleWorkspaceTabs, useModuleWorkspace } from '@/components/ui/module-workspace';
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

type ViewName =
  'dashboard' | 'users' | 'printers' | 'toners' | 'areas' | 'tower-ips' | 'it-services';
type UserStatus = 'Activo' | 'Inactivo';
type PrinterStatus = 'ACTIVA' | 'INACTIVA' | 'REPARACION' | 'BAJA';
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

type ApiPrinter = {
  id: string;
  area: string;
  model: string;
  serialNumber: string;
  status: PrinterStatus;
  responsible: string;
  installationDate: string;
  createdBy: { name: string };
  updatedBy: { name: string };
  deletedBy: { name: string } | null;
};

type PrinterFormState = {
  area: string;
  model: string;
  serialNumber: string;
  status: PrinterStatus;
  responsible: string;
  installationDate: string;
};

type ApiToner = {
  id: string;
  model: string;
  color: string;
  printerId: string;
  printer: { id: string; model: string; serialNumber: string; area: string };
  createdBy: { name: string };
  updatedBy: { name: string };
};

type TonerFormState = {
  model: string;
  color: string;
  printerId: string;
};

type ApiArea = {
  id: string;
  name: string;
  description: string | null;
  createdBy: { name: string };
  updatedBy: { name: string };
};

type AreaFormState = {
  name: string;
  description: string;
};

type ApiTowerIp = {
  id: string;
  ip: string;
  office: string;
  location: string;
  responsible: string;
  antenna: boolean;
  observations: string | null;
  configuredBy: { name: string };
  createdBy: { name: string };
  updatedBy: { name: string };
};

type ApiEmailRequest = {
  id: string;
  requestDate: string;
  fullName: string;
  collaboratorNo: string;
  area: string;
  position: string;
  justification: string;
  suggestedEmail: string;
  service: string;
  requestingBoss: string;
  areaDirector: string;
  tiResponsible: string;
  lastGeneratedAt: string | null;
  createdBy: { name: string };
  updatedBy: { name: string };
};

type EmailRequestFormState = Omit<
  ApiEmailRequest,
  'id' | 'requestDate' | 'lastGeneratedAt' | 'createdBy' | 'updatedBy'
>;

type TowerIpFormState = {
  ip: string;
  office: string;
  location: string;
  responsible: string;
  antenna: boolean;
  observations: string;
};

type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

const usersAllowedRoles = new Set<RoleName>(['ADMIN', 'SUPERVISOR']);

const emptyUserForm: UserFormState = {
  email: '',
  name: '',
  role: 'USUARIO',
  status: 'Activo',
};

const emptyPrinterForm: PrinterFormState = {
  area: '',
  model: '',
  serialNumber: '',
  status: 'ACTIVA',
  responsible: '',
  installationDate: new Date().toISOString().slice(0, 10),
};

const emptyTonerForm: TonerFormState = {
  model: '',
  color: 'Negro',
  printerId: '',
};

const emptyAreaForm: AreaFormState = {
  name: '',
  description: '',
};

const emptyTowerIpForm: TowerIpFormState = {
  ip: '',
  office: '',
  location: '',
  responsible: '',
  antenna: false,
  observations: '',
};

const emptyEmailRequestForm: EmailRequestFormState = {
  fullName: '',
  collaboratorNo: '',
  area: '',
  position: '',
  justification: '',
  suggestedEmail: '',
  service: '',
  requestingBoss: '',
  areaDirector: '',
  tiResponsible: '',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const canViewPrinters = currentUser
    ? currentUser.roles.some((role) => ['ADMIN', 'SUPERVISOR', 'TI'].includes(role))
    : false;
  const canViewAreas = currentUser
    ? currentUser.roles.some((role) => ['ADMIN', 'SUPERVISOR', 'TI'].includes(role))
    : false;
  const navigationSections: Array<{
    label: string;
    items: Array<{ id: ViewName; label: string; icon: LucideIcon }>;
  }> = [
    { label: 'Principal', items: [{ id: 'dashboard', label: 'Tablero', icon: BarChart3 }] },
    {
      label: 'Inventario',
      items: canViewPrinters
        ? [
            { id: 'printers', label: 'Impresoras', icon: Printer },
            { id: 'toners', label: 'Toners', icon: Boxes },
          ]
        : [],
    },
    {
      label: 'Redes',
      items: canViewAreas ? [{ id: 'tower-ips', label: 'IPs Torre Médica', icon: Network }] : [],
    },
    {
      label: 'Formatos',
      items: canViewAreas ? [{ id: 'it-services', label: 'Servicios TI', icon: Server }] : [],
    },
    {
      label: 'Administración',
      items: [
        ...(canViewUsers ? [{ id: 'users' as const, label: 'Usuarios', icon: Users }] : []),
        ...(canViewAreas ? [{ id: 'areas' as const, label: 'Áreas', icon: Building2 }] : []),
      ],
    },
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
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-0 z-30 flex flex-col border-b border-white/10 bg-[#061b38] px-4 py-3 text-white lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-4">
          <div className="flex items-center justify-between lg:block">
            <BrandMark />
            <Button
              aria-expanded={mobileMenuOpen}
              aria-controls="gesti-navigation"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              size="icon"
              variant="outline"
            >
              <Menu />
            </Button>
          </div>

          <div
            id="gesti-navigation"
            className={cn(
              'max-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-y-auto lg:max-h-none lg:overflow-visible',
              mobileMenuOpen ? 'flex' : 'hidden',
              'lg:flex',
            )}
          >
            <nav className="mt-5 grid gap-5 lg:mt-6">
              {navigationSections
                .filter((section) => section.items.length > 0)
                .map((section) => (
                  <div key={section.label}>
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      {section.label}
                    </p>
                    <div className="grid gap-1">
                      {section.items.map((item) => (
                        <button
                          aria-current={activeView === item.id ? 'page' : undefined}
                          className={cn(
                            'flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                            activeView === item.id && 'bg-[#00afaa] text-[#061b38]',
                          )}
                          onClick={() => {
                            setActiveView(item.id);
                            setMobileMenuOpen(false);
                          }}
                          key={item.label}
                          type="button"
                        >
                          <item.icon className="size-4" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
          </div>
        </aside>

        <section className="min-w-0 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
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

                <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
                  <div className="flex h-10 w-full items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground sm:w-auto sm:min-w-64">
                    <Search className="size-4" />
                    <span>Buscar folio, equipo o usuario</span>
                  </div>
                  <Button className="flex-1 sm:flex-none" variant="outline">
                    <Filter />
                    Filtrar
                  </Button>
                  <Button className="flex-1 sm:flex-none" variant="outline">
                    <Download />
                    Exportar
                  </Button>
                  <Button className="w-full sm:w-auto">
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
                  <RecordCards
                    items={inventory}
                    getKey={(asset) => asset.tag}
                    title={(asset) => asset.device}
                    subtitle={(asset) => asset.tag}
                    fields={[
                      { label: 'Responsable', render: (asset) => asset.owner },
                      { label: 'Estado', render: (asset) => asset.state },
                    ]}
                    emptyMessage="No hay activos recientes."
                  />
                  <div className="hidden overflow-x-auto xl:block">
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
          ) : activeView === 'users' && canViewUsers ? (
            <UsersView currentRole={currentRole} request={authenticatedRequest} />
          ) : activeView === 'printers' && canViewPrinters ? (
            <PrintersView request={authenticatedRequest} />
          ) : activeView === 'toners' && canViewPrinters ? (
            <TonersView request={authenticatedRequest} />
          ) : activeView === 'areas' && canViewAreas ? (
            <AreasView request={authenticatedRequest} />
          ) : activeView === 'it-services' && canViewAreas ? (
            <EmailRequestsView request={authenticatedRequest} />
          ) : activeView === 'tower-ips' && canViewAreas ? (
            <TowerIpsView request={authenticatedRequest} />
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
          <span className="flex h-11 items-center gap-2 rounded-md border bg-background px-3 transition-colors focus-within:border-[#00afaa] focus-within:ring-2 focus-within:ring-[#00afaa]/20">
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
          <span className="flex h-11 items-center gap-2 rounded-md border bg-background px-3 transition-colors focus-within:border-[#00afaa] focus-within:ring-2 focus-within:ring-[#00afaa]/20">
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
            className="h-11 rounded-md border bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-[#00afaa] focus-visible:ring-2 focus-visible:ring-[#00afaa]/20"
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
            className="h-11 rounded-md border bg-background px-3 text-sm font-normal outline-none transition-colors focus-visible:border-[#00afaa] focus-visible:ring-2 focus-visible:ring-[#00afaa]/20"
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
  const workspace = useModuleWorkspace();
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
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
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
    workspace.showForm();
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
          <Button onClick={startNew} variant="outline">
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

      {formError && workspace.pane === 'list' ? (
        <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p
          role="status"
          className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
        >
          {formSuccess}
        </p>
      ) : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs
          pane={workspace.pane}
          onShowList={workspace.showList}
          onShowForm={workspace.showForm}
          formLabel={isEditing ? 'Editar' : 'Nuevo'}
        />
      </div>
      <section
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-md border bg-card p-4 shadow-sm"
          onSubmit={handleSubmit}
        >
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

        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
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

          <RecordCards
            items={filteredUsers}
            getKey={(user) => user.id}
            title={(user) => user.name}
            subtitle={(user) => user.email}
            fields={[
              { label: 'Rol', render: (user) => user.role },
              { label: 'Estado', render: (user) => user.status },
              {
                label: 'Acceso',
                render: (user) =>
                  user.essential
                    ? 'Administrador esencial'
                    : user.mustChangePassword
                      ? 'Primer acceso pendiente'
                      : 'Habilitado',
              },
            ]}
            actions={(user) => (
              <>
                <Button
                  disabled={!canManageUsers || user.essential}
                  onClick={() => handleEdit(user)}
                  type="button"
                  variant="outline"
                >
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={!canManageUsers || user.essential || deleteUserMutation.isPending}
                  onClick={() => void handleDelete(user)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron usuarios."
          />
          <div className="hidden overflow-x-auto xl:block">
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

function TowerIpsView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TowerIpFormState>(emptyTowerIpForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const ipsQuery = useQuery({
    queryKey: ['tower-ips'],
    queryFn: () => request<ApiTowerIp[]>('/tower-ips'),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: TowerIpFormState }) =>
      request<ApiTowerIp>(id ? `/tower-ips/${id}` : '/tower-ips', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...body,
          ip: body.ip.trim(),
          office: body.office.trim(),
          location: body.location.trim(),
          responsible: body.responsible.trim(),
          observations: body.observations.trim() || undefined,
        }),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['tower-ips'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/tower-ips/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['tower-ips'] }),
  });
  const ips = ipsQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredIps = ips.filter((item) =>
    [item.ip, item.office, item.location, item.responsible].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyTowerIpForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editIp(item: ApiTowerIp) {
    setEditingId(item.id);
    setForm({
      ip: item.ip,
      office: item.office,
      location: item.location,
      responsible: item.responsible,
      antenna: item.antenna,
      observations: item.observations ?? '',
    });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removeIp(item: ApiTowerIp) {
    if (!window.confirm(`Dar de baja la IP ${item.ip}?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible dar de baja la IP.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !form.ip.trim() ||
      !form.office.trim() ||
      !form.location.trim() ||
      !form.responsible.trim()
    ) {
      setFormError('IP, consultorio, ubicación y responsable son obligatorios.');
      return;
    }
    try {
      const wasEditing = Boolean(editingId);
      await saveMutation.mutateAsync({ id: editingId, body: form });
      resetForm();
      setFormSuccess(wasEditing ? 'IP actualizada.' : 'IP registrada.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar la IP.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            IPs Torre Médica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro de direccionamiento, consultorios, ubicación y antenas.
          </p>
        </div>
        <Button onClick={startNew} variant="outline">
          <Plus />
          Nueva IP
        </Button>
      </header>
      {ipsQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando IPs...
        </p>
      ) : null}
      {ipsQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {ipsQuery.error.message}
        </p>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserMetric icon={Network} label="IPs registradas" value={ips.length} />
        <UserMetric
          icon={CheckCircle2}
          label="Con antena"
          value={ips.filter((item) => item.antenna).length}
        />
        <UserMetric
          icon={Building2}
          label="Consultorios"
          value={new Set(ips.map((item) => item.office)).size}
        />
        <UserMetric
          icon={Users}
          label="Responsables"
          value={new Set(ips.map((item) => item.responsible)).size}
        />
      </section>
      {formError && workspace.pane === 'list' ? (
        <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p
          role="status"
          className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
        >
          {formSuccess}
        </p>
      ) : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs
          pane={workspace.pane}
          onShowList={workspace.showList}
          onShowForm={workspace.showForm}
          formLabel={editingId ? 'Editar' : 'Nuevo'}
        />
      </div>
      <section
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-md border bg-card p-4 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{editingId ? 'Editar IP' : 'Nueva IP'}</h2>
              <p className="text-sm text-muted-foreground">
                El usuario actual se guarda automáticamente como configuró.
              </p>
            </div>
            {editingId ? (
              <Button
                aria-label="Cancelar edición"
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
              IP
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setForm((current) => ({ ...current, ip: event.target.value }))}
                placeholder="192.168.10.25"
                value={form.ip}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Consultorio
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, office: event.target.value }))
                }
                value={form.office}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Ubicación
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                value={form.location}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Responsable
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsible: event.target.value }))
                }
                value={form.responsible}
              />
            </label>
            <label className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm font-medium">
              <input
                checked={form.antenna}
                className="size-4 accent-[#00afaa]"
                onChange={(event) =>
                  setForm((current) => ({ ...current, antenna: event.target.checked }))
                }
                type="checkbox"
              />
              Cuenta con antena
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Observaciones
              <span className="text-xs font-normal text-muted-foreground">
                Se almacenan en la base de datos y no se muestran en la tabla.
              </span>
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, observations: event.target.value }))
                }
                value={form.observations}
              />
            </label>
            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? (
                'Guardando...'
              ) : editingId ? (
                <>
                  <Edit3 />
                  Guardar cambios
                </>
              ) : (
                <>
                  <Plus />
                  Registrar IP
                </>
              )}
            </Button>
          </div>
        </form>
        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de IPs</h2>
              <p className="text-sm text-muted-foreground">
                Observaciones y auditoría se conservan en la base de datos.
              </p>
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar IPs</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar IP, consultorio o responsable"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredIps}
            getKey={(item) => item.id}
            title={(item) => item.ip}
            subtitle={(item) => item.office}
            fields={[
              { label: 'Ubicación', render: (item) => item.location },
              { label: 'Responsable', render: (item) => item.responsible },
              { label: 'Antena', render: (item) => (item.antenna ? 'Sí' : 'No') },
            ]}
            actions={(item) => (
              <>
                <Button onClick={() => editIp(item)} type="button" variant="outline">
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => void removeIp(item)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron IPs."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Consultorio</th>
                  <th className="px-4 py-3 font-semibold">Ubicación</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 font-semibold">Antena</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredIps.map((item) => (
                  <tr
                    className={editingId === item.id ? 'bg-secondary/70' : undefined}
                    key={item.id}
                  >
                    <td className="px-4 py-3 font-mono font-medium">{item.ip}</td>
                    <td className="px-4 py-3">{item.office}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.responsible}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-2 py-1 text-xs font-semibold',
                          item.antenna
                            ? 'border-teal-200 bg-teal-50 text-teal-800'
                            : 'bg-background text-muted-foreground',
                        )}
                      >
                        {item.antenna ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Editar ${item.ip}`}
                          onClick={() => editIp(item)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar ${item.ip}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => void removeIp(item)}
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
                {filteredIps.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={6}>
                      No se encontraron IPs.
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

function EmailRequestsView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmailRequestFormState>(emptyEmailRequestForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const requestsQuery = useQuery({
    queryKey: ['email-requests'],
    queryFn: () => request<ApiEmailRequest[]>('/email-requests'),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: EmailRequestFormState }) =>
      request<ApiEmailRequest>(id ? `/email-requests/${id}` : '/email-requests', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['email-requests'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/email-requests/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['email-requests'] }),
  });
  const generateMutation = useMutation({
    mutationFn: (id: string) =>
      request<{ fileName: string; contentType: string; documentBase64: string }>(
        `/email-requests/${id}/generate`,
        { method: 'POST' },
      ),
    onSuccess: async (generated) => {
      const bytes = Uint8Array.from(window.atob(generated.documentBase64), (character) =>
        character.charCodeAt(0),
      );
      const blob = new Blob([bytes], { type: generated.contentType });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = generated.fileName;
      link.click();
      URL.revokeObjectURL(url);
      await queryClient.invalidateQueries({ queryKey: ['email-requests'] });
    },
  });
  const templateMutation = useMutation({
    mutationFn: (file: File) => {
      const data = new FormData();
      data.append('template', file);
      return request<{ message: string }>('/email-requests/template', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: (result) => setFormSuccess(result.message),
  });
  const templateInputRef = useRef<HTMLInputElement>(null);
  const requests = requestsQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredRequests = requests.filter((item) =>
    [item.fullName, item.collaboratorNo, item.area, item.suggestedEmail].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyEmailRequestForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editRequest(item: ApiEmailRequest) {
    setEditingId(item.id);
    setForm({
      fullName: item.fullName,
      collaboratorNo: item.collaboratorNo,
      area: item.area,
      position: item.position,
      justification: item.justification,
      suggestedEmail: item.suggestedEmail,
      service: item.service,
      requestingBoss: item.requestingBoss,
      areaDirector: item.areaDirector,
      tiResponsible: item.tiResponsible,
    });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removeRequest(item: ApiEmailRequest) {
    if (!window.confirm(`Dar de baja la solicitud de ${item.fullName}?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No fue posible dar de baja la solicitud.',
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const required = [
      form.fullName,
      form.collaboratorNo,
      form.area,
      form.position,
      form.justification,
      form.suggestedEmail,
      form.service,
      form.requestingBoss,
      form.areaDirector,
      form.tiResponsible,
    ];
    if (required.some((value) => !value.trim())) {
      setFormError('Completa todos los campos de la solicitud.');
      return;
    }
    try {
      const wasEditing = Boolean(editingId);
      await saveMutation.mutateAsync({ id: editingId, body: form });
      resetForm();
      setFormSuccess(wasEditing ? 'Solicitud actualizada.' : 'Solicitud registrada.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar la solicitud.');
    }
  }

  function updateField<Key extends keyof EmailRequestFormState>(
    key: Key,
    value: EmailRequestFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function downloadCurrentTemplate() {
    try {
      const template = await request<{
        fileName: string;
        contentType: string;
        documentBase64: string;
      }>('/email-requests/template');
      const bytes = Uint8Array.from(window.atob(template.documentBase64), (character) =>
        character.charCodeAt(0),
      );
      const url = URL.createObjectURL(new Blob([bytes], { type: template.contentType }));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = template.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No fue posible descargar la plantilla.',
      );
    }
  }

  function selectTemplate(file: File | undefined) {
    if (!file) return;
    setFormError('');
    templateMutation.mutate(file);
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Servicios TI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitudes de generación de correo institucional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void downloadCurrentTemplate()} variant="outline">
            <Download />
            Descargar plantilla actual
          </Button>
          <input
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => {
              selectTemplate(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
            ref={templateInputRef}
            type="file"
          />
          <Button
            disabled={templateMutation.isPending}
            onClick={() => templateInputRef.current?.click()}
            variant="outline"
          >
            <FileText />
            {templateMutation.isPending ? 'Reemplazando...' : 'Reemplazar plantilla'}
          </Button>
          <Button onClick={startNew} variant="outline">
            <Plus />
            Nueva solicitud
          </Button>
        </div>
      </header>
      {requestsQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando solicitudes...
        </p>
      ) : null}
      {requestsQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {requestsQuery.error.message}
        </p>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UserMetric icon={FileText} label="Solicitudes registradas" value={requests.length} />
        <UserMetric
          icon={CheckCircle2}
          label="Formatos generados"
          value={requests.filter((item) => item.lastGeneratedAt).length}
        />
        <UserMetric
          icon={Users}
          label="Colaboradores"
          value={new Set(requests.map((item) => item.collaboratorNo)).size}
        />
      </section>
      {formError && workspace.pane === 'list' ? (
        <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p
          role="status"
          className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
        >
          {formSuccess}
        </p>
      ) : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs
          pane={workspace.pane}
          onShowList={workspace.showList}
          onShowForm={workspace.showForm}
          formLabel={editingId ? 'Editar' : 'Nuevo'}
        />
      </div>
      <section
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(320px,430px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-md border bg-card p-4 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                {editingId ? 'Editar solicitud' : 'Nueva solicitud'}
              </h2>
              <p className="text-sm text-muted-foreground">
                La fecha se registra automáticamente al guardar.
              </p>
            </div>
            {editingId ? (
              <Button
                aria-label="Cancelar edición"
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Nombre completo
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('fullName', event.target.value)}
                  value={form.fullName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                No. colaborador
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('collaboratorNo', event.target.value)}
                  value={form.collaboratorNo}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Área
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('area', event.target.value)}
                  value={form.area}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Cargo
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('position', event.target.value)}
                  value={form.position}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Justificación
              <textarea
                className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => updateField('justification', event.target.value)}
                value={form.justification}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Correo sugerido
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('suggestedEmail', event.target.value)}
                  value={form.suggestedEmail}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Servicio
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('service', event.target.value)}
                  value={form.service}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Jefe solicitante
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('requestingBoss', event.target.value)}
                  value={form.requestingBoss}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Director del área
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('areaDirector', event.target.value)}
                  value={form.areaDirector}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Responsable TI
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => updateField('tiResponsible', event.target.value)}
                value={form.tiResponsible}
              />
            </label>
            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? (
                'Guardando...'
              ) : editingId ? (
                <>
                  <Edit3 />
                  Guardar cambios
                </>
              ) : (
                <>
                  <Plus />
                  Registrar solicitud
                </>
              )}
            </Button>
          </div>
        </form>
        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Solicitudes de correo</h2>
              <p className="text-sm text-muted-foreground">{filteredRequests.length} registro(s)</p>
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar solicitudes</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar nombre, colaborador o área"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredRequests}
            getKey={(item) => item.id}
            title={(item) => item.fullName}
            subtitle={(item) => item.suggestedEmail}
            fields={[
              { label: 'Colaborador', render: (item) => item.collaboratorNo },
              { label: 'Área / cargo', render: (item) => `${item.area} · ${item.position}` },
              { label: 'Servicio', render: (item) => item.service },
              {
                label: 'Fecha',
                render: (item) => new Date(item.requestDate).toLocaleDateString('es-MX'),
              },
            ]}
            actions={(item) => (
              <>
                <Button
                  disabled={generateMutation.isPending}
                  onClick={() => void generateMutation.mutateAsync(item.id)}
                  type="button"
                  variant="outline"
                >
                  <Download /> Word
                </Button>
                <Button onClick={() => editRequest(item)} type="button" variant="outline">
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => void removeRequest(item)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron solicitudes."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Solicitante</th>
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold">Área / Cargo</th>
                  <th className="px-4 py-3 font-semibold">Servicio</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map((item) => (
                  <tr
                    className={editingId === item.id ? 'bg-secondary/70' : undefined}
                    key={item.id}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div>{item.fullName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.suggestedEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.collaboratorNo}</td>
                    <td className="px-4 py-3">
                      <div>{item.area}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.position}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.service}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.requestDate).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Generar formato de ${item.fullName}`}
                          disabled={generateMutation.isPending}
                          onClick={() => void generateMutation.mutateAsync(item.id)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Download />
                        </Button>
                        <Button
                          aria-label={`Editar solicitud de ${item.fullName}`}
                          onClick={() => editRequest(item)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar solicitud de ${item.fullName}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => void removeRequest(item)}
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
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={6}>
                      No se encontraron solicitudes.
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

function AreasView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AreaFormState>(emptyAreaForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const areasQuery = useQuery({ queryKey: ['areas'], queryFn: () => request<ApiArea[]>('/areas') });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: AreaFormState }) =>
      request<ApiArea>(id ? `/areas/${id}` : '/areas', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description.trim() || undefined,
        }),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/areas/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['areas'] }),
  });
  const areas = areasQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredAreas = areas.filter((area) =>
    [area.name, area.description ?? ''].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyAreaForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editArea(area: ApiArea) {
    setEditingId(area.id);
    setForm({ name: area.name, description: area.description ?? '' });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removeArea(area: ApiArea) {
    if (!window.confirm(`Dar de baja el área ${area.name}?`)) return;
    try {
      await deleteMutation.mutateAsync(area.id);
      if (editingId === area.id) resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible dar de baja el área.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError('El nombre del área es obligatorio.');
      return;
    }
    try {
      const wasEditing = Boolean(editingId);
      await saveMutation.mutateAsync({ id: editingId, body: form });
      resetForm();
      setFormSuccess(wasEditing ? 'Área actualizada.' : 'Área registrada.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar el área.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Áreas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de áreas de la organización y trazabilidad de cambios.
          </p>
        </div>
        <Button onClick={startNew} variant="outline">
          <Plus />
          Nueva área
        </Button>
      </header>

      {areasQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando áreas...
        </p>
      ) : null}
      {areasQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {areasQuery.error.message}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UserMetric icon={Building2} label="Áreas registradas" value={areas.length} />
        <UserMetric
          icon={CheckCircle2}
          label="Con descripción"
          value={areas.filter((area) => Boolean(area.description)).length}
        />
        <UserMetric
          icon={Users}
          label="Áreas sin descripción"
          value={areas.filter((area) => !area.description).length}
        />
      </section>

      {formError && workspace.pane === 'list' ? (
        <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p
          role="status"
          className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
        >
          {formSuccess}
        </p>
      ) : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs
          pane={workspace.pane}
          onShowList={workspace.showList}
          onShowForm={workspace.showForm}
          formLabel={editingId ? 'Editar' : 'Nuevo'}
        />
      </div>
      <section
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-md border bg-card p-4 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                {editingId ? 'Editar área' : 'Nueva área'}
              </h2>
              <p className="text-sm text-muted-foreground">La descripción es opcional.</p>
            </div>
            {editingId ? (
              <Button
                aria-label="Cancelar edición"
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
              Nombre de área
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                value={form.name}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Descripción<span className="text-xs font-normal text-muted-foreground">Opcional</span>
              <textarea
                className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                value={form.description}
              />
            </label>
            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? (
                'Guardando...'
              ) : editingId ? (
                <>
                  <Edit3 />
                  Guardar cambios
                </>
              ) : (
                <>
                  <Plus />
                  Registrar área
                </>
              )}
            </Button>
          </div>
        </form>

        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de áreas</h2>
              <p className="text-sm text-muted-foreground">{filteredAreas.length} registro(s)</p>
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar áreas</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar área o descripción"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredAreas}
            getKey={(area) => area.id}
            title={(area) => area.name}
            fields={[
              { label: 'Descripción', render: (area) => area.description || 'Sin descripción' },
              { label: 'Creado por', render: (area) => area.createdBy.name },
              { label: 'Editado por', render: (area) => area.updatedBy.name },
            ]}
            actions={(area) => (
              <>
                <Button onClick={() => editArea(area)} type="button" variant="outline">
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => void removeArea(area)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron áreas."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nombre de área</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Creado por</th>
                  <th className="px-4 py-3 font-semibold">Editado por</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAreas.map((area) => (
                  <tr
                    className={editingId === area.id ? 'bg-secondary/70' : undefined}
                    key={area.id}
                  >
                    <td className="px-4 py-3 font-medium">{area.name}</td>
                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      {area.description || 'Sin descripción'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{area.createdBy.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{area.updatedBy.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Editar ${area.name}`}
                          onClick={() => editArea(area)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar ${area.name}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => void removeArea(area)}
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
                {filteredAreas.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                      No se encontraron áreas.
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

function TonersView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TonerFormState>(emptyTonerForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const tonersQuery = useQuery({
    queryKey: ['toners'],
    queryFn: () => request<ApiToner[]>('/toners'),
  });
  const printersQuery = useQuery({
    queryKey: ['printers'],
    queryFn: () => request<ApiPrinter[]>('/printers'),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: TonerFormState }) =>
      request<ApiToner>(id ? `/toners/${id}` : '/toners', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['toners'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/toners/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['toners'] }),
  });
  const toners = tonersQuery.data ?? [];
  const printers = printersQuery.data ?? [];
  const filteredToners = toners.filter((toner) =>
    [
      toner.model,
      toner.color,
      toner.printer.model,
      toner.printer.serialNumber,
      toner.printer.area,
    ].some((value) =>
      value.toLocaleLowerCase('es').includes(searchTerm.trim().toLocaleLowerCase('es')),
    ),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyTonerForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editToner(toner: ApiToner) {
    setEditingId(toner.id);
    setForm({ model: toner.model, color: toner.color, printerId: toner.printerId });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removeToner(toner: ApiToner) {
    if (!window.confirm(`Dar de baja el toner ${toner.model}?`)) return;
    try {
      await deleteMutation.mutateAsync(toner.id);
      if (editingId === toner.id) resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible dar de baja el toner.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.model.trim() || !form.color.trim() || !form.printerId) {
      setFormError('Modelo, color e impresora son obligatorios.');
      return;
    }
    try {
      const wasEditing = Boolean(editingId);
      await saveMutation.mutateAsync({
        id: editingId,
        body: { ...form, model: form.model.trim(), color: form.color.trim() },
      });
      resetForm();
      setFormSuccess(wasEditing ? 'Toner actualizado.' : 'Toner registrado.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar el toner.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Toners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de toners compatibles con las impresoras registradas.
          </p>
        </div>
        <Button onClick={startNew} variant="outline">
          <Plus />
          Nuevo toner
        </Button>
      </header>
      {tonersQuery.isLoading || printersQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando toners...
        </p>
      ) : null}
      {tonersQuery.error || printersQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {tonersQuery.error?.message ?? printersQuery.error?.message}
        </p>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UserMetric icon={Boxes} label="Toners registrados" value={toners.length} />
        <UserMetric
          icon={Printer}
          label="Impresoras con toner"
          value={new Set(toners.map((toner) => toner.printerId)).size}
        />
        <UserMetric
          icon={CheckCircle2}
          label="Colores registrados"
          value={new Set(toners.map((toner) => toner.color.toLocaleLowerCase('es'))).size}
        />
      </section>
      {formError && workspace.pane === 'list' ? (
        <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p
          role="status"
          className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
        >
          {formSuccess}
        </p>
      ) : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs
          pane={workspace.pane}
          onShowList={workspace.showList}
          onShowForm={workspace.showForm}
          formLabel={editingId ? 'Editar' : 'Nuevo'}
        />
      </div>
      <section
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-md border bg-card p-4 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                {editingId ? 'Editar toner' : 'Nuevo toner'}
              </h2>
              <p className="text-sm text-muted-foreground">Selecciona la impresora compatible.</p>
            </div>
            {editingId ? (
              <Button
                aria-label="Cancelar edición"
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
              Modelo
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, model: event.target.value }))
                }
                value={form.model}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Color
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, color: event.target.value }))
                }
                value={form.color}
              >
                <option value="Negro">Negro</option>
                <option value="Cian">Cian</option>
                <option value="Magenta">Magenta</option>
                <option value="Amarillo">Amarillo</option>
                <option value="Otro">Otro</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Impresora
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, printerId: event.target.value }))
                }
                value={form.printerId}
              >
                <option value="">Selecciona una impresora</option>
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.model} · {printer.serialNumber} · {printer.area}
                  </option>
                ))}
              </select>
            </label>
            {printers.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Registra primero una impresora para asociar el toner.
              </p>
            ) : null}
            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button disabled={saveMutation.isPending || printers.length === 0} type="submit">
              {saveMutation.isPending ? (
                'Guardando...'
              ) : editingId ? (
                <>
                  <Edit3 />
                  Guardar cambios
                </>
              ) : (
                <>
                  <Plus />
                  Registrar toner
                </>
              )}
            </Button>
          </div>
        </form>
        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de toners</h2>
              <p className="text-sm text-muted-foreground">{filteredToners.length} registro(s)</p>
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar toners</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar modelo, color o impresora"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredToners}
            getKey={(toner) => toner.id}
            title={(toner) => toner.model}
            subtitle={(toner) => toner.color}
            fields={[
              {
                label: 'Impresora',
                render: (toner) => `${toner.printer.model} · ${toner.printer.serialNumber}`,
              },
              { label: 'Área', render: (toner) => toner.printer.area },
              { label: 'Creado por', render: (toner) => toner.createdBy.name },
              { label: 'Editado por', render: (toner) => toner.updatedBy.name },
            ]}
            actions={(toner) => (
              <>
                <Button onClick={() => editToner(toner)} type="button" variant="outline">
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => void removeToner(toner)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron toners."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Modelo</th>
                  <th className="px-4 py-3 font-semibold">Color</th>
                  <th className="px-4 py-3 font-semibold">Impresora</th>
                  <th className="px-4 py-3 font-semibold">Auditoría</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredToners.map((toner) => (
                  <tr
                    className={editingId === toner.id ? 'bg-secondary/70' : undefined}
                    key={toner.id}
                  >
                    <td className="px-4 py-3 font-medium">{toner.model}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border bg-background px-2 py-1 text-xs font-semibold">
                        {toner.color}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{toner.printer.model}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {toner.printer.serialNumber} · {toner.printer.area}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>Creó: {toner.createdBy.name}</div>
                      <div>Editó: {toner.updatedBy.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Editar ${toner.model}`}
                          onClick={() => editToner(toner)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar ${toner.model}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => void removeToner(toner)}
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
                {filteredToners.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>
                      No se encontraron toners.
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

function PrintersView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PrinterFormState>(emptyPrinterForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const printersQuery = useQuery({
    queryKey: ['printers'],
    queryFn: () => request<ApiPrinter[]>('/printers'),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: PrinterFormState }) =>
      request<ApiPrinter>(id ? `/printers/${id}` : '/printers', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['printers'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/printers/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['printers'] }),
  });
  const printers = printersQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredPrinters = printers.filter((printer) =>
    [printer.area, printer.model, printer.serialNumber, printer.responsible, printer.status].some(
      (value) => value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyPrinterForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editPrinter(printer: ApiPrinter) {
    setEditingId(printer.id);
    setForm({
      area: printer.area,
      model: printer.model,
      serialNumber: printer.serialNumber,
      status: printer.status,
      responsible: printer.responsible,
      installationDate: printer.installationDate.slice(0, 10),
    });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removePrinter(printer: ApiPrinter) {
    if (!window.confirm(`Dar de baja la impresora ${printer.serialNumber}?`)) return;
    try {
      await deleteMutation.mutateAsync(printer.id);
      if (editingId === printer.id) resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No fue posible dar de baja la impresora.',
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      ...form,
      area: form.area.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      responsible: form.responsible.trim(),
    };
    if (
      !body.area ||
      !body.model ||
      !body.serialNumber ||
      !body.responsible ||
      !body.installationDate
    ) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    try {
      await saveMutation.mutateAsync({ id: editingId, body });
      resetForm();
      setFormSuccess(editingId ? 'Impresora actualizada.' : 'Impresora registrada.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar la impresora.');
    }
  }

  function updateField<Key extends keyof PrinterFormState>(key: Key, value: PrinterFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Impresoras</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control de impresoras, responsables, instalación y trazabilidad de cambios.
          </p>
        </div>
        <Button onClick={startNew} variant="outline">
          <Plus />
          Nueva impresora
        </Button>
      </header>

      {printersQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando impresoras...
        </p>
      ) : null}
      {printersQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {printersQuery.error.message}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserMetric icon={Printer} label="Registradas" value={printers.length} />
        <UserMetric
          icon={CheckCircle2}
          label="Activas"
          value={printers.filter((item) => item.status === 'ACTIVA').length}
        />
        <UserMetric
          icon={AlertTriangle}
          label="En reparación"
          value={printers.filter((item) => item.status === 'REPARACION').length}
        />
        <UserMetric
          icon={Users}
          label="Áreas cubiertas"
          value={new Set(printers.map((item) => item.area)).size}
        />
      </section>

      {formError && workspace.pane === 'list' ? (
        <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {formSuccess ? (
        <p
          role="status"
          className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800"
        >
          {formSuccess}
        </p>
      ) : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs
          pane={workspace.pane}
          onShowList={workspace.showList}
          onShowForm={workspace.showForm}
          formLabel={editingId ? 'Editar' : 'Nuevo'}
        />
      </div>
      <section
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-md border bg-card p-4 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                {editingId ? 'Editar impresora' : 'Nueva impresora'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Los cambios quedan registrados con el usuario responsable.
              </p>
            </div>
            {editingId ? (
              <Button
                aria-label="Cancelar edición"
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
              Área
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => updateField('area', event.target.value)}
                value={form.area}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Modelo
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => updateField('model', event.target.value)}
                value={form.model}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Número de serie
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => updateField('serialNumber', event.target.value)}
                value={form.serialNumber}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Responsable
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => updateField('responsible', event.target.value)}
                value={form.responsible}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-2 text-sm font-medium">
                Estado
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('status', event.target.value as PrinterStatus)}
                  value={form.status}
                >
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva</option>
                  <option value="REPARACION">En reparación</option>
                  <option value="BAJA">Baja</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Fecha de instalación
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => updateField('installationDate', event.target.value)}
                  type="date"
                  value={form.installationDate}
                />
              </label>
            </div>
            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? (
                'Guardando...'
              ) : editingId ? (
                <>
                  <Edit3 />
                  Guardar cambios
                </>
              ) : (
                <>
                  <Plus />
                  Registrar impresora
                </>
              )}
            </Button>
          </div>
        </form>

        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de impresoras</h2>
              <p className="text-sm text-muted-foreground">{filteredPrinters.length} registro(s)</p>
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar impresoras</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar área, modelo o serie"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredPrinters}
            getKey={(printer) => printer.id}
            title={(printer) => printer.model}
            subtitle={(printer) => printer.serialNumber}
            fields={[
              { label: 'Área', render: (printer) => printer.area },
              { label: 'Responsable', render: (printer) => printer.responsible },
              {
                label: 'Estado',
                render: (printer) =>
                  printer.status === 'REPARACION' ? 'En reparación' : printer.status.toLowerCase(),
              },
              {
                label: 'Instalación',
                render: (printer) => new Date(printer.installationDate).toLocaleDateString('es-MX'),
              },
              { label: 'Creado por', render: (printer) => printer.createdBy.name },
              { label: 'Editado por', render: (printer) => printer.updatedBy.name },
            ]}
            actions={(printer) => (
              <>
                <Button onClick={() => editPrinter(printer)} type="button" variant="outline">
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => void removePrinter(printer)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron impresoras."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Área</th>
                  <th className="px-4 py-3 font-semibold">Modelo / Serie</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Instalación</th>
                  <th className="px-4 py-3 font-semibold">Auditoría</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPrinters.map((printer) => (
                  <tr
                    className={editingId === printer.id ? 'bg-secondary/70' : undefined}
                    key={printer.id}
                  >
                    <td className="px-4 py-3 font-medium">{printer.area}</td>
                    <td className="px-4 py-3">
                      <div>{printer.model}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {printer.serialNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{printer.responsible}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-md border px-2 py-1 text-xs font-semibold',
                          printer.status === 'ACTIVA'
                            ? 'border-teal-200 bg-teal-50 text-teal-800'
                            : printer.status === 'REPARACION'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'bg-background text-muted-foreground',
                        )}
                      >
                        {printer.status === 'REPARACION'
                          ? 'En reparación'
                          : printer.status[0] + printer.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(printer.installationDate).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>Creó: {printer.createdBy.name}</div>
                      <div>Editó: {printer.updatedBy.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Editar ${printer.model}`}
                          onClick={() => editPrinter(printer)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar ${printer.model}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => void removePrinter(printer)}
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
                {filteredPrinters.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={7}>
                      No se encontraron impresoras.
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
