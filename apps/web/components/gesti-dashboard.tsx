'use client';

import Image from 'next/image';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
  Laptop,
  LogOut,
  Mail,
  Minus,
  Network,
  Phone,
  Plus,
  Printer,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
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
  | 'modules'
  | 'dashboard'
  | 'users'
  | 'printers'
  | 'toners'
  | 'computer-equipment'
  | 'extensions'
  | 'haq-ips'
  | 'areas'
  | 'tower-ips'
  | 'it-services';
type ModuleCardDefinition = {
  id: ViewName;
  label: string;
  description: string;
  summary: string;
  icon: LucideIcon;
  tone: 'teal' | 'blue' | 'violet' | 'orange';
  permission?: 'users' | 'inventory' | 'areas';
};

const moduleCards: ModuleCardDefinition[] = [
  {
    id: 'dashboard',
    label: 'Tablero',
    description: 'Consulta el estado general de los recursos y servicios de TI.',
    summary: 'Resumen operativo',
    icon: BarChart3,
    tone: 'teal',
  },
  {
    id: 'printers',
    label: 'Impresoras',
    description: 'Administra impresoras, ubicaciones, modelos y responsables.',
    summary: 'Inventario de impresión',
    icon: Printer,
    tone: 'blue',
    permission: 'inventory',
  },
  {
    id: 'toners',
    label: 'Toners',
    description: 'Controla consumibles, colores y su relación con impresoras.',
    summary: 'Control de consumibles',
    icon: Boxes,
    tone: 'violet',
    permission: 'inventory',
  },
  {
    id: 'computer-equipment',
    label: 'Equipos de cómputo',
    description: 'Consulta equipos, asignaciones, ubicaciones y responsables.',
    summary: 'Inventario de equipos',
    icon: Laptop,
    tone: 'teal',
    permission: 'inventory',
  },
  {
    id: 'extensions',
    label: 'Extensiones',
    description: 'Administra extensiones telefónicas y las áreas asignadas.',
    summary: 'Directorio telefónico',
    icon: Phone,
    tone: 'orange',
    permission: 'inventory',
  },
  {
    id: 'tower-ips',
    label: 'IPs Torre Médica',
    description: 'Gestiona direcciones IP, consultorios y ubicaciones de Torre Médica.',
    summary: 'Red de Torre Médica',
    icon: Network,
    tone: 'blue',
    permission: 'areas',
  },
  {
    id: 'haq-ips',
    label: 'IPs de HAQ',
    description: 'Administra direcciones IP y responsables del Hospital de Alta Especialidad.',
    summary: 'Red de HAQ',
    icon: Network,
    tone: 'violet',
    permission: 'areas',
  },
  {
    id: 'it-services',
    label: 'Servicios TI',
    description: 'Gestiona solicitudes de correo institucional y sus formatos.',
    summary: 'Solicitudes de TI',
    icon: Server,
    tone: 'teal',
    permission: 'areas',
  },
  {
    id: 'users',
    label: 'Usuarios',
    description: 'Administra cuentas, perfiles, roles y acceso al sistema.',
    summary: 'Acceso al sistema',
    icon: Users,
    tone: 'blue',
    permission: 'users',
  },
  {
    id: 'areas',
    label: 'Áreas',
    description: 'Mantén el catálogo de áreas del hospital y sus descripciones.',
    summary: 'Catálogo hospitalario',
    icon: Building2,
    tone: 'orange',
    permission: 'areas',
  },
];

const moduleToneStyles = {
  teal: {
    icon: 'bg-teal-100 text-teal-700',
    summary: 'bg-teal-50 text-teal-800',
  },
  blue: {
    icon: 'bg-sky-100 text-sky-700',
    summary: 'bg-sky-50 text-sky-800',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-700',
    summary: 'bg-violet-50 text-violet-800',
  },
  orange: {
    icon: 'bg-orange-100 text-orange-700',
    summary: 'bg-orange-50 text-orange-800',
  },
} as const;
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
  ip: string | null;
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
  ip: string;
  status: PrinterStatus;
  responsible: string;
  installationDate: string;
};

type ApiToner = {
  id: string;
  model: string;
  color: string;
  printerName: string;
  quantity: number;
  createdBy: { name: string };
  updatedBy: { name: string };
};

type ApiTonerMovement = {
  id: string;
  quantity: number;
  tonerModel: string;
  printerName: string;
  userName: string;
  createdAt: string;
};

type TonerFormState = {
  model: string;
  color: string;
  printerName: string;
  quantity: string;
};

type TonerSaveBody = Omit<TonerFormState, 'quantity'> & { quantity: number };

type ApiComputerEquipment = {
  id: string;
  serialNumber: string;
  ip: string;
  model: string;
  ciId: string;
  assetType: string;
  description: string;
  equipmentDate: string;
  location: string;
  responsible: string;
  createdBy: { name: string };
  updatedBy: { name: string };
};

type ComputerEquipmentFormState = Omit<ApiComputerEquipment, 'id' | 'createdBy' | 'updatedBy'>;

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
  location: string | null;
  responsible: string | null;
  antenna: boolean;
  observations: string | null;
  configuredAt: string | null;
  configuredBy: { name: string; email: string } | null;
  createdBy: { name: string };
  updatedBy: { name: string };
  assignments: ApiTowerIpAssignment[];
};

type ApiTowerIpAssignment = {
  id: string;
  assignmentType: 'ASIGNACION' | 'REASIGNACION';
  responsible: string;
  location: string;
  antenna: boolean;
  observations: string | null;
  createdAt: string;
  assignedBy: { name: string; email: string };
};

type ApiHaqIp = {
  id: string;
  ip: string;
  area: string;
  responsible: string;
  username: string;
  observations: string | null;
  createdBy: { name: string };
  updatedBy: { name: string };
};

type ApiExtension = {
  id: string;
  extension: string;
  description: string;
  area: string;
  createdBy: { name: string };
  updatedBy: { name: string };
};

type ExtensionFormState = {
  extension: string;
  description: string;
  area: string;
};

type HaqIpFormState = {
  ip: string;
  area: string;
  responsible: string;
  username: string;
  observations: string;
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

type TowerIpRegistrationFormState = {
  mode: 'individual' | 'range';
  ips: string[];
  rangeStart: string;
  rangeEnd: string;
  office: string;
};

type TowerIpAssignmentFormState = {
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
  ip: '',
  status: 'ACTIVA',
  responsible: '',
  installationDate: new Date().toISOString().slice(0, 10),
};

const emptyTonerForm: TonerFormState = {
  model: '',
  color: 'Negro',
  printerName: '',
  quantity: '1',
};

function tonerModelSuffix(model: string) {
  return model.replace(/^(?:TK-)+/i, '');
}

function tonerColorClass(color: string) {
  switch (color.toLocaleLowerCase('es')) {
    case 'negro':
      return 'bg-slate-100 text-slate-800 ring-slate-300';
    case 'cian':
      return 'bg-cyan-50 text-cyan-800 ring-cyan-200';
    case 'magenta':
      return 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200';
    case 'amarillo':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    default:
      return 'bg-violet-50 text-violet-800 ring-violet-200';
  }
}

function tonerCardStyle(color: string) {
  switch (color.toLocaleLowerCase('es')) {
    case 'cian':
    case 'cyan':
      return {
        card: 'border-cyan-200 bg-cyan-50/50 hover:border-cyan-400 hover:shadow-cyan-900/10',
        header: 'border-cyan-100 bg-gradient-to-br from-cyan-100/80 via-white to-cyan-50/70',
      };
    case 'magenta':
      return {
        card: 'border-fuchsia-200 bg-fuchsia-50/50 hover:border-fuchsia-400 hover:shadow-fuchsia-900/10',
        header: 'border-fuchsia-100 bg-gradient-to-br from-fuchsia-100/80 via-white to-fuchsia-50/70',
      };
    case 'amarillo':
    case 'yellow':
      return {
        card: 'border-amber-200 bg-amber-50/60 hover:border-amber-400 hover:shadow-amber-900/10',
        header: 'border-amber-100 bg-gradient-to-br from-amber-100/80 via-white to-amber-50/70',
      };
    case 'negro':
      return {
        card: 'border-sky-100 shadow-md shadow-slate-900/5 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/10',
        header: 'border-sky-100 bg-gradient-to-br from-sky-50/90 via-white to-teal-50/80',
      };
    default:
      return {
        card: 'border-violet-200 bg-violet-50/50 hover:border-violet-400 hover:shadow-violet-900/10',
        header: 'border-violet-100 bg-gradient-to-br from-violet-100/80 via-white to-violet-50/70',
      };
  }
}

const emptyComputerEquipmentForm: ComputerEquipmentFormState = {
  serialNumber: '',
  ip: '',
  model: '',
  ciId: '',
  assetType: '',
  description: '',
  equipmentDate: new Date().toISOString().slice(0, 10),
  location: '',
  responsible: '',
};

const emptyAreaForm: AreaFormState = {
  name: '',
  description: '',
};

const emptyTowerIpRegistrationForm: TowerIpRegistrationFormState = {
  mode: 'individual',
  ips: [''],
  rangeStart: '',
  rangeEnd: '',
  office: '',
};

const emptyTowerIpAssignmentForm: TowerIpAssignmentFormState = {
  location: '',
  responsible: '',
  antenna: false,
  observations: '',
};

const emptyHaqIpForm: HaqIpFormState = {
  ip: '',
  area: '',
  responsible: '',
  username: '',
  observations: '',
};

const emptyExtensionForm: ExtensionFormState = {
  extension: '',
  description: '',
  area: '',
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
  const [activeView, setActiveView] = useState<ViewName>('modules');
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
  const availableModules = moduleCards.filter((module) => {
    if (module.permission === 'users') return canViewUsers;
    if (module.permission === 'inventory') return canViewPrinters;
    if (module.permission === 'areas') return canViewAreas;
    return true;
  });
  const clearLocalSession = useCallback(
    (notice = '') => {
      window.sessionStorage.removeItem(tabStorageKey);
      window.sessionStorage.removeItem('gesti-session');
      setSession(null);
      setActiveView('modules');
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
    setActiveView('modules');
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

  if (activeView === 'modules') {
    return (
      <ModulesHome
        currentUser={currentUser}
        modules={availableModules}
        onLogout={() => void handleLogout()}
        onSelectModule={setActiveView}
      />
    );
  }

  return (
    <main data-dashboard className="min-h-screen bg-[#f5f7fa]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Button
              aria-label="Regresar al menú"
              className="group h-10 shrink-0 rounded-xl border-slate-200 bg-white px-2.5 text-[#0b2347] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 hover:text-[#0b2347] hover:shadow-md active:translate-y-0 sm:px-3.5"
              onClick={() => setActiveView('modules')}
              variant="outline"
            >
              <ArrowLeft className="transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Regresar</span>
            </Button>
            <Image
              alt="GESTI"
              className="h-8 w-[104px] shrink-0 object-contain sm:h-10 sm:w-[140px]"
              height={64}
              priority
              src={brandLogoPath}
              width={192}
            />
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0b2347] text-sm font-semibold text-white">
              {currentUser.name.trim().slice(0, 1).toLocaleUpperCase('es') || 'U'}
            </span>
            <div className="min-w-0 text-right">
              <p className="max-w-16 truncate text-xs font-semibold text-slate-800 sm:max-w-44 sm:text-sm">
                {currentUser.name}
              </p>
              <p className="hidden max-w-44 truncate text-xs text-slate-500 sm:block">
                {currentUser.roles.join(', ')}
              </p>
            </div>
            <Button
              aria-label="Cerrar sesión"
              className="group h-10 shrink-0 rounded-xl border-rose-200 bg-rose-50/70 px-2.5 text-rose-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 hover:shadow-md active:translate-y-0 sm:px-3.5"
              onClick={() => void handleLogout()}
              variant="outline"
            >
              <LogOut className="transition-transform duration-200 group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <section className="min-w-0 px-4 py-4 sm:px-6 sm:py-5 md:px-8 xl:px-10">
        <div className="mx-auto max-w-[1560px]">
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
          ) : activeView === 'computer-equipment' && canViewPrinters ? (
            <ComputerEquipmentView request={authenticatedRequest} />
          ) : activeView === 'extensions' && canViewPrinters ? (
            <ExtensionsView request={authenticatedRequest} />
          ) : activeView === 'areas' && canViewAreas ? (
            <AreasView request={authenticatedRequest} />
          ) : activeView === 'it-services' && canViewAreas ? (
            <EmailRequestsView request={authenticatedRequest} />
          ) : activeView === 'tower-ips' && canViewAreas ? (
            <TowerIpsView request={authenticatedRequest} />
          ) : activeView === 'haq-ips' && canViewAreas ? (
            <HaqIpsView request={authenticatedRequest} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ModulesHome({
  currentUser,
  modules,
  onLogout,
  onSelectModule,
}: {
  currentUser: AuthResponse['user'];
  modules: ModuleCardDefinition[];
  onLogout: () => void;
  onSelectModule: (view: ViewName) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredModules = modules.filter((module) =>
    [module.label, module.description, module.summary].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );
  const initials = currentUser.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('es');

  return (
    <main data-module-home className="min-h-screen bg-[#f3f8fc] text-[#0b1e3a]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-[1560px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
              <Image
                alt="GESTI"
                className="size-10 object-contain"
                height={44}
                priority
                src={brandIconPath}
                width={44}
              />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight tracking-tight">GESTI</p>
              <p className="truncate text-xs text-slate-500 sm:text-sm">Sistema de gestión de TI</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-44 truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.roles.join(', ')}</p>
            </div>
            <span
              aria-label={`Sesión de ${currentUser.name}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0b2347] text-sm font-semibold text-white shadow-sm"
            >
              {initials || 'GT'}
            </span>
            <Button
              aria-label="Cerrar sesión"
              className="text-slate-600"
              onClick={onLogout}
              size="icon"
              variant="ghost"
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] px-4 pb-10 pt-3 sm:px-6 sm:pt-5 xl:px-10">
        <section aria-label="Módulos" className="mt-1">
          <div className="mb-4 flex justify-end">
            <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/15 sm:max-w-sm">
              <Search className="size-4 shrink-0 text-slate-400" />
              <span className="sr-only">Buscar módulos</span>
              <input
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar módulo..."
                type="search"
                value={searchTerm}
              />
            </label>
          </div>

          {filteredModules.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {filteredModules.map((module) => {
                const tone = moduleToneStyles[module.tone];
                return (
                  <button
                    className="group flex min-h-[206px] min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-3 text-left shadow-[0_8px_24px_rgba(15,35,65,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[0_14px_34px_rgba(15,35,65,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 sm:min-h-[220px] sm:p-5"
                    key={module.id}
                    onClick={() => onSelectModule(module.id)}
                    type="button"
                  >
                    <span className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
                      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-14', tone.icon)}>
                        <module.icon className="size-5 sm:size-7" strokeWidth={2.1} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-bold leading-tight text-[#0b1e3a] sm:text-base lg:text-lg">
                        {module.label}
                      </span>
                      <ArrowRight className="hidden size-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0b1e3a] sm:block" />
                    </span>
                    <span className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600 sm:mt-4 sm:min-h-12 sm:text-sm sm:leading-6">
                      {module.description}
                    </span>
                    <span className={cn('mt-auto flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[10px] font-semibold leading-tight sm:mt-4 sm:min-h-11 sm:px-3 sm:text-xs', tone.summary)}>
                      <module.icon className="size-4 shrink-0" />
                      <span className="line-clamp-2">{module.summary}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 px-4 py-12 text-center text-sm text-slate-500">
              No hay módulos que coincidan con “{searchTerm}”.
            </div>
          )}
        </section>

      </div>
    </main>
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
  const [officeFilter, setOfficeFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [registerForm, setRegisterForm] = useState<TowerIpRegistrationFormState>(emptyTowerIpRegistrationForm);
  const [assignmentForm, setAssignmentForm] = useState<TowerIpAssignmentFormState>(emptyTowerIpAssignmentForm);
  const [activeIp, setActiveIp] = useState<ApiTowerIp | null>(null);
  const [assignmentAction, setAssignmentAction] = useState<'assign' | 'reassign' | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const ipInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const ipsQuery = useQuery({
    queryKey: ['tower-ips'],
    queryFn: () => request<ApiTowerIp[]>('/tower-ips'),
  });
  const createMutation = useMutation({
    mutationFn: (body: { office: string; ips: string[] }) =>
      request<ApiTowerIp[]>('/tower-ips/bulk', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['tower-ips'] });
      setRegisterForm(emptyTowerIpRegistrationForm);
      setFormError('');
      setFormSuccess(`${created.length} IP registradas para ${created[0]?.office ?? 'el consultorio'}.`);
      workspace.showList();
    },
  });
  const assignmentMutation = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'assign' | 'reassign'; body: TowerIpAssignmentFormState }) =>
      request<ApiTowerIp>(`/tower-ips/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['tower-ips'] });
      setAssignmentAction(null);
      setActiveIp(null);
      setAssignmentError('');
      setFormSuccess(variables.action === 'assign' ? 'IP asignada correctamente.' : 'IP reasignada correctamente.');
    },
  });
  const ips = ipsQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const officeOptions = [...new Set(ips.map((item) => item.office))].sort((first, second) => first.localeCompare(second, 'es', { numeric: true }));
  const filteredIps = ips.filter((item) => {
    const matchesSearch = [item.ip, item.office, item.location ?? '', item.responsible ?? ''].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    );
    const matchesOffice = officeFilter === 'all' || item.office === officeFilter;
    const isAssigned = Boolean(item.configuredAt);
    const matchesAssignment = assignmentFilter === 'all' || (assignmentFilter === 'assigned' ? isAssigned : !isAssigned);
    return matchesSearch && matchesOffice && matchesAssignment;
  });
  function isValidIpv4(value: string) {
    const octets = value.split('.');
    return octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
  }

  function ipv4ToNumber(value: string) {
    return value.split('.').reduce((total, octet) => total * 256 + Number(octet), 0);
  }

  function numberToIpv4(value: number) {
    const octets = [0, 0, 0, 0];
    let remainder = value;
    for (let index = 3; index >= 0; index -= 1) {
      octets[index] = remainder % 256;
      remainder = Math.floor(remainder / 256);
    }
    return octets.join('.');
  }

  function expandIpv4Range(start: string, end: string) {
    if (!isValidIpv4(start) || !isValidIpv4(end)) return [];
    const first = ipv4ToNumber(start);
    const last = ipv4ToNumber(end);
    if (last < first || last - first + 1 > 1024) return [];
    return Array.from({ length: last - first + 1 }, (_, index) => numberToIpv4(first + index));
  }

  const parsedIps = registerForm.mode === 'range'
    ? expandIpv4Range(registerForm.rangeStart.trim(), registerForm.rangeEnd.trim())
    : registerForm.ips.map((ip) => ip.trim()).filter(Boolean);
  const rangeStart = registerForm.rangeStart.trim();
  const rangeEnd = registerForm.rangeEnd.trim();
  const rangeStartValid = isValidIpv4(rangeStart);
  const rangeEndValid = isValidIpv4(rangeEnd);
  const rangeReversed = rangeStartValid && rangeEndValid && ipv4ToNumber(rangeEnd) < ipv4ToNumber(rangeStart);
  const rangeTooLarge = rangeStartValid && rangeEndValid && ipv4ToNumber(rangeEnd) - ipv4ToNumber(rangeStart) + 1 > 1024;
  const rangeReady = registerForm.mode === 'range' && rangeStartValid && rangeEndValid && !rangeReversed && !rangeTooLarge;

  function normalizeIpv4Input(value: string) {
    return value
      .replace(/[^\d.]/g, '')
      .split('.')
      .slice(0, 4)
      .map((octet) => octet.slice(0, 3))
      .join('.')
      .slice(0, 15);
  }

  function startNew() {
    setRegisterForm(emptyTowerIpRegistrationForm);
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  function updateRegistrationIp(index: number, value: string) {
    setRegisterForm((current) => ({
      ...current,
      ips: current.ips.map((ip, row) => row === index ? value : ip),
    }));
  }

  function addRegistrationIp() {
    setRegisterForm((current) => ({ ...current, ips: [...current.ips, ''] }));
  }

  function handleRegistrationIpKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const currentIp = registerForm.ips[index]?.trim() ?? '';
    if (!isValidIpv4(currentIp)) {
      setFormError('Completa la IP con cuatro grupos numericos entre 0 y 255 antes de continuar.');
      return;
    }
    setFormError('');
    const nextIndex = registerForm.ips.length;
    addRegistrationIp();
    requestAnimationFrame(() => ipInputRefs.current[nextIndex]?.focus());
  }

  function removeRegistrationIp(index: number) {
    setRegisterForm((current) => ({
      ...current,
      ips: current.ips.length === 1 ? [''] : current.ips.filter((_, row) => row !== index),
    }));
  }

  function openAssignment(item: ApiTowerIp, action: 'assign' | 'reassign') {
    setActiveIp(item);
    setAssignmentAction(action);
    setAssignmentError('');
    setAssignmentForm(action === 'reassign' ? {
      location: item.location ?? '',
      responsible: item.responsible ?? '',
      antenna: item.antenna,
      observations: item.observations ?? '',
    } : emptyTowerIpAssignmentForm);
  }

  function closeAssignment() {
    setAssignmentAction(null);
    setActiveIp(null);
    setAssignmentError('');
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const office = registerForm.office.trim();
    if (!office) {
      setFormError('Escribe el numero de consultorio.');
      return;
    }
    if (registerForm.mode === 'range') {
      if (!isValidIpv4(registerForm.rangeStart.trim()) || !isValidIpv4(registerForm.rangeEnd.trim())) {
        setFormError('Escribe una IP inicial y una IP final con formato IPv4.');
        return;
      }
      const first = ipv4ToNumber(registerForm.rangeStart.trim());
      const last = ipv4ToNumber(registerForm.rangeEnd.trim());
      if (last < first) {
        setFormError('La IP final debe ser igual o mayor que la IP inicial.');
        return;
      }
      if (last - first + 1 > 1024) {
        setFormError('El rango puede contener hasta 1,024 direcciones IP.');
        return;
      }
    } else if (parsedIps.length === 0) {
      setFormError('Escribe al menos una direccion IP.');
      return;
    }
    const invalidIp = parsedIps.find((ip) => !isValidIpv4(ip));
    if (invalidIp) {
      setFormError(`La IP ${invalidIp} debe tener cuatro grupos numericos entre 0 y 255.`);
      return;
    }
    if (new Set(parsedIps).size !== parsedIps.length) {
      setFormError('La lista contiene direcciones IP repetidas.');
      return;
    }
    setFormError('');
    try {
      await createMutation.mutateAsync({ office, ips: parsedIps });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible registrar las IP.');
    }
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeIp || !assignmentAction) return;
    const body = {
      ...assignmentForm,
      responsible: assignmentForm.responsible.trim(),
      location: assignmentForm.location.trim(),
      observations: assignmentForm.observations.trim(),
    };
    if (!body.responsible || !body.location) {
      setAssignmentError('Responsable y ubicacion son obligatorios.');
      return;
    }
    try {
      await assignmentMutation.mutateAsync({ id: activeIp.id, action: assignmentAction, body });
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'No fue posible guardar la asignacion.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">IPs Torre Medica</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registra varias direcciones para un consultorio y asignalas despues a un responsable.</p>
        </div>
      </header>
      {ipsQuery.isLoading ? <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">Cargando IPs...</p> : null}
      {ipsQuery.error ? <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{ipsQuery.error.message}</p> : null}
      {formError && workspace.pane === 'list' ? <p role="alert" className="mt-5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</p> : null}
      {formSuccess ? <p role="status" className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{formSuccess}</p> : null}
      <div id={workspace.anchorId} className="scroll-mt-20">
        <ModuleWorkspaceTabs pane={workspace.pane} onShowList={workspace.showList} onShowForm={startNew} formLabel="Nuevo" />
      </div>
      <section className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]" data-mobile-pane={workspace.pane}>
        <form data-pane="form" className="min-w-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5" onSubmit={submitRegistration}>
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Registrar direcciones IP</h2>
            <p className="mt-1 text-sm text-slate-600">Puedes agregar varias IP para el mismo consultorio.</p>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <Button className="min-w-0 rounded-lg" onClick={() => { setRegisterForm((current) => ({ ...current, mode: 'individual' })); setFormError(''); }} type="button" variant={registerForm.mode === 'individual' ? 'default' : 'ghost'}>IPs individuales</Button>
              <Button className="min-w-0 rounded-lg" onClick={() => { setRegisterForm((current) => ({ ...current, mode: 'range' })); setFormError(''); }} type="button" variant={registerForm.mode === 'range' ? 'default' : 'ghost'}>Rango de IPs</Button>
            </div>
            {registerForm.mode === 'individual' ? <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">Direcciones IP</span>
                {parsedIps.length ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">{parsedIps.length} {parsedIps.length === 1 ? 'IP lista' : 'IPs listas'}</span> : null}
              </div>
              <div className="grid gap-2">
                {registerForm.ips.map((ip, index) => (
                  <div className="flex min-w-0 items-center gap-2" key={index}>
                    <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-slate-600">
                      IP {index + 1}
                      <input
                        className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm font-normal text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        maxLength={15}
                        inputMode="decimal"
                        onChange={(event) => updateRegistrationIp(index, normalizeIpv4Input(event.target.value))}
                        onKeyDown={(event) => handleRegistrationIpKeyDown(event, index)}
                        placeholder="192.168.10.25"
                        ref={(element) => { ipInputRefs.current[index] = element; }}
                        required={index === 0}
                        type="text"
                        value={ip}
                      />
                    </label>
                    <Button
                      aria-label={`Quitar IP ${index + 1}`}
                      className="mt-5 size-10 shrink-0 rounded-xl border border-rose-200 bg-rose-50 p-0 text-rose-700 hover:bg-rose-100"
                      disabled={registerForm.ips.length === 1}
                      onClick={() => removeRegistrationIp(index)}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Minus />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                className="min-h-10 w-full justify-center rounded-xl border-dashed border-teal-300 bg-teal-50/70 font-semibold text-teal-800 hover:border-teal-400 hover:bg-teal-100 sm:w-fit"
                onClick={addRegistrationIp}
                type="button"
                variant="outline"
              >
                <Plus /> Agregar otra IP
              </Button>
            </div> : <div className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-teal-50 shadow-sm">
              <div className="flex items-center gap-3 border-b border-sky-100 bg-white/70 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-teal-100 text-teal-800"><Network className="size-5" /></span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">Generar rango de IPs</h3>
                  <p className="text-xs text-slate-600">Desde la primera dirección hasta la última</p>
                </div>
              </div>
              <div className="grid gap-4 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
                  <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-800">1</span>Desde</span>
                    <input aria-label="IP inicial del rango" className="h-12 w-full min-w-0 rounded-xl border border-sky-200 bg-white px-3 font-mono text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100" inputMode="decimal" maxLength={15} onChange={(event) => setRegisterForm((current) => ({ ...current, rangeStart: normalizeIpv4Input(event.target.value) }))} placeholder="192.168.13.1" type="text" value={registerForm.rangeStart} />
                    {rangeStart && !rangeStartValid ? <span className="text-[11px] font-medium text-rose-600">Completa una IPv4 válida</span> : null}
                  </label>
                  <ArrowRight className="hidden mb-3 size-5 text-sky-500 sm:block" />
                  <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-800">2</span>Hasta</span>
                    <input aria-label="IP final del rango" className="h-12 w-full min-w-0 rounded-xl border border-teal-200 bg-white px-3 font-mono text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100" inputMode="decimal" maxLength={15} onChange={(event) => setRegisterForm((current) => ({ ...current, rangeEnd: normalizeIpv4Input(event.target.value) }))} placeholder="192.168.13.250" type="text" value={registerForm.rangeEnd} />
                    {rangeEnd && !rangeEndValid ? <span className="text-[11px] font-medium text-rose-600">Completa una IPv4 válida</span> : null}
                  </label>
                </div>
                {rangeReady ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-900">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{parsedIps.length} {parsedIps.length === 1 ? 'IP lista' : 'IPs listas'} para registrar</p>
                      <p className="truncate font-mono text-xs text-emerald-800">{rangeStart} → {rangeEnd}</p>
                    </div>
                  </div>
                ) : rangeReversed || rangeTooLarge ? (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {rangeReversed ? 'La dirección final debe ser igual o posterior a la inicial.' : 'El rango máximo permitido es de 1,024 direcciones.'}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-xs text-slate-600">
                    Se incluirán ambos extremos. Máximo: <strong>1,024 IPs</strong> por registro.
                  </div>
                )}
              </div>
            </div>}
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              Consultorio
              <input className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" inputMode="numeric" maxLength={120} onChange={(event) => setRegisterForm((current) => ({ ...current, office: event.target.value.replace(/\D/g, '') }))} pattern="[0-9]+" placeholder="203" required type="text" value={registerForm.office} />
            </label>
            {formError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p> : null}
            <Button className="min-h-11 rounded-xl bg-gradient-to-r from-teal-700 to-sky-800 font-semibold shadow-md hover:from-teal-800 hover:to-sky-900" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? 'Registrando...' : <><Plus /> Registrar {parsedIps.length || ''} IP{parsedIps.length === 1 ? '' : 's'}</>}</Button>
          </div>
        </form>
        <section data-pane="list" className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-slate-900/5">
          <div className="grid gap-3 border-b bg-gradient-to-r from-sky-50 via-white to-teal-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Directorio de IPs</h2>
                <p className="mt-1 text-sm text-slate-600">Asigna o reasigna cada direccion desde su registro.</p>
              </div>
              <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:max-w-80">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <span className="sr-only">Buscar IPs</span>
                <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar IP, consultorio o responsable" type="search" value={searchTerm} />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Consultorio
                <select aria-label="Filtrar por consultorio" className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" onChange={(event) => setOfficeFilter(event.target.value)} value={officeFilter}>
                  <option value="all">Todos los consultorios</option>
                  {officeOptions.map((office) => <option key={office} value={office}>Consultorio {office}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Estado de la IP
                <select aria-label="Filtrar por estado de asignación" className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" onChange={(event) => setAssignmentFilter(event.target.value as typeof assignmentFilter)} value={assignmentFilter}>
                  <option value="all">Todas las IPs</option>
                  <option value="assigned">Asignadas</option>
                  <option value="unassigned">Sin asignar</option>
                </select>
              </label>
            </div>
          </div>
          <RecordCards
            items={filteredIps}
            getKey={(item) => item.id}
            compact
            title={(item) => <span className="flex min-w-0 items-center gap-2"><span className="whitespace-nowrap font-mono text-sm font-extrabold tracking-wide text-[#0b2347]">{item.ip}</span><span className={item.configuredAt ? 'shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800' : 'shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700'}>{item.configuredAt ? 'Asignada' : 'Disponible'}</span></span>}
            subtitle={(item) => <>Consultorio {item.office}</>}
            fields={[
              { label: 'Responsable', render: (item) => <span className={item.responsible ? 'font-semibold text-slate-800' : 'font-medium text-amber-700'}>{item.responsible ?? 'Pendiente de asignación'}</span> },
              { label: 'Modem / antena', render: (item) => item.configuredAt ? item.antenna ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Sí</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-700"><X className="size-4" /> No</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-500"><span className="size-1.5 rounded-full bg-slate-400" /> Sin asignar</span> },
            ]}
            actions={(item) => (
              <div className="record-card-actions flex flex-wrap gap-1.5">
                <Button aria-label={`Asignar ${item.ip}`} className="h-8 rounded-lg border border-teal-200 bg-gradient-to-b from-white to-teal-50 px-2 text-xs font-semibold text-teal-800 shadow-sm hover:border-teal-300 hover:from-teal-50 hover:to-teal-100" disabled={Boolean(item.configuredAt)} onClick={() => openAssignment(item, 'assign')} type="button" variant="outline"><UserPlus className="size-3.5" /> Asignar</Button>
                <Button aria-label={`Reasignar ${item.ip}`} className="h-8 rounded-lg border border-violet-200 bg-gradient-to-b from-white to-violet-50 px-2 text-xs font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:from-violet-50 hover:to-violet-100" disabled={!item.configuredAt} onClick={() => openAssignment(item, 'reassign')} type="button" variant="outline"><UserCheck className="size-3.5" /> Reasignar</Button>
              </div>
            )}
            emptyMessage="No se encontraron IPs."
            listClassName="gap-3 p-3 sm:gap-4 sm:p-4"
            cardClassName={(item) => item.configuredAt ? 'border-emerald-200 bg-emerald-50 shadow-sm shadow-emerald-950/5 hover:border-emerald-300' : 'border-slate-300 bg-slate-100 shadow-sm hover:border-slate-400'}
            headerClassName={(item) => item.configuredAt ? 'border-emerald-200 bg-gradient-to-r from-emerald-100 via-emerald-50 to-teal-50' : 'border-slate-200 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200'}
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[840px] border-separate border-spacing-0 text-sm">
              <thead className="bg-gradient-to-r from-sky-100 via-slate-50 to-teal-50 text-left text-[10px] uppercase tracking-[0.12em] text-slate-600">
                <tr>
                  <th className="whitespace-nowrap border-b border-sky-100 px-4 py-3 font-bold">Dirección IP</th>
                  <th className="whitespace-nowrap border-b border-sky-100 px-4 py-3 font-bold">Consultorio</th>
                  <th className="whitespace-nowrap border-b border-sky-100 px-4 py-3 font-bold">Responsable</th>
                  <th className="whitespace-nowrap border-b border-sky-100 px-4 py-3 text-center font-bold">Modem/antena</th>
                  <th className="whitespace-nowrap border-b border-sky-100 px-4 py-3 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredIps.map((item) => (
                  <tr className="group transition-colors hover:bg-sky-50/70" key={item.id}>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2.5"><span className="font-mono text-[13px] font-bold tracking-tight text-[#0b2347]">{item.ip}</span><span className={item.configuredAt ? 'rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-800' : 'rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-600'}>{item.configuredAt ? 'Asignada' : 'Disponible'}</span></div></td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3"><span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-900">{item.office}</span></td>
                    <td className="max-w-48 truncate border-b border-slate-100 px-4 py-3 text-sm text-slate-700" title={item.responsible ?? 'Pendiente'}>{item.responsible ?? <span className="text-amber-700">Pendiente de asignación</span>}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center">
                      {item.configuredAt ? item.antenna ? <span aria-label="Modem o antena: sí" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" title="Sí tiene modem o antena"><CheckCircle2 className="size-4" /> Sí</span> : <span aria-label="Modem o antena: no" className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700" title="No tiene modem o antena"><X className="size-4" /> No</span> : <span aria-label="Sin asignar" className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500"><span className="size-1.5 rounded-full bg-slate-400" /> Sin asignar</span>}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button aria-label={`Asignar ${item.ip}`} className="size-8 rounded-lg border-teal-200 bg-white p-0 text-teal-800 shadow-sm transition hover:bg-teal-50" disabled={Boolean(item.configuredAt)} onClick={() => openAssignment(item, 'assign')} size="icon" title="Asignar" type="button" variant="outline"><UserPlus className="size-4" /></Button>
                        <Button aria-label={`Reasignar ${item.ip}`} className="size-8 rounded-lg border-violet-200 bg-white p-0 text-violet-800 shadow-sm transition hover:bg-violet-50" disabled={!item.configuredAt} onClick={() => openAssignment(item, 'reassign')} size="icon" title="Reasignar" type="button" variant="outline"><UserCheck className="size-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredIps.length === 0 ? <tr><td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>No se encontraron IPs.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      {assignmentAction && activeIp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAssignment(); }}>
          <section aria-labelledby="tower-ip-assignment-title" aria-modal="true" className="min-w-0 max-w-xl overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5" role="dialog" style={{ width: 'min(calc(100vw - 32px), 36rem)', maxHeight: 'calc(100dvh - 32px)' }}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-teal-700">{activeIp.ip} - {activeIp.office}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900" id="tower-ip-assignment-title">{assignmentAction === 'assign' ? 'Asignar IP' : 'Reasignar IP'}</h2>
                <p className="mt-1 text-sm text-slate-600">El sistema guardara el usuario y la fecha de este movimiento.</p>
              </div>
              <Button aria-label="Cerrar" onClick={closeAssignment} size="icon" type="button" variant="ghost"><X /></Button>
            </div>
            <form className="mt-5 grid min-w-0 gap-4" onSubmit={submitAssignment}>
              <label className="grid gap-2 text-sm font-semibold text-slate-800">Responsable
                <input autoFocus className="h-11 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" onChange={(event) => setAssignmentForm((current) => ({ ...current, responsible: event.target.value }))} required value={assignmentForm.responsible} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-800">Ubicacion
                <input className="h-11 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" onChange={(event) => setAssignmentForm((current) => ({ ...current, location: event.target.value }))} placeholder="Piso, area o punto de red" required value={assignmentForm.location} />
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                <input checked={assignmentForm.antenna} className="size-4 accent-[#00afaa]" onChange={(event) => setAssignmentForm((current) => ({ ...current, antenna: event.target.checked }))} type="checkbox" />
                Modem / antena
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-800">Observaciones
                <textarea className="min-h-24 w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" onChange={(event) => setAssignmentForm((current) => ({ ...current, observations: event.target.value }))} value={assignmentForm.observations} />
              </label>
              {assignmentError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{assignmentError}</p> : null}
              <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button className="w-full rounded-xl sm:w-auto" onClick={closeAssignment} type="button" variant="outline">Cancelar</Button>
                <Button className="w-full rounded-xl bg-gradient-to-r from-teal-700 to-sky-800 font-semibold shadow-md hover:from-teal-800 hover:to-sky-900 sm:w-auto" disabled={assignmentMutation.isPending} type="submit">{assignmentMutation.isPending ? 'Guardando...' : assignmentAction === 'assign' ? <><UserPlus /> Asignar IP</> : <><UserCheck /> Guardar reasignacion</>}</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function HaqIpsView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HaqIpFormState>(emptyHaqIpForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const ipsQuery = useQuery({
    queryKey: ['haq-ips'],
    queryFn: () => request<ApiHaqIp[]>('/haq-ips'),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: HaqIpFormState }) =>
      request<ApiHaqIp>(id ? `/haq-ips/${id}` : '/haq-ips', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['haq-ips'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/haq-ips/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['haq-ips'] }),
  });
  const ips = ipsQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredIps = ips.filter((item) =>
    [item.ip, item.area, item.responsible, item.username, item.observations ?? ''].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyHaqIpForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editIp(item: ApiHaqIp) {
    setEditingId(item.id);
    setForm({
      ip: item.ip,
      area: item.area,
      responsible: item.responsible,
      username: item.username,
      observations: item.observations ?? '',
    });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removeIp(item: ApiHaqIp) {
    if (!window.confirm(`Dar de baja la IP de HAQ ${item.ip}?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible dar de baja la IP.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      ...form,
      ip: form.ip.trim(),
      area: form.area.trim(),
      responsible: form.responsible.trim(),
      username: form.username.trim(),
      observations: form.observations.trim(),
    };
    if (!body.ip || !body.area || !body.responsible || !body.username) {
      setFormError('IP, área, responsable y usuario son obligatorios.');
      return;
    }
    try {
      const wasEditing = Boolean(editingId);
      await saveMutation.mutateAsync({ id: editingId, body });
      resetForm();
      setFormSuccess(wasEditing ? 'IP de HAQ actualizada.' : 'IP de HAQ registrada.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar la IP de HAQ.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">IPs de HAQ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro de IPs, áreas, usuarios y responsables de HAQ.
          </p>
        </div>
        <Button onClick={startNew} variant="outline">
          <Plus />
          Nueva IP
        </Button>
      </header>

      {ipsQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando IPs de HAQ...
        </p>
      ) : null}
      {ipsQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {ipsQuery.error.message}
        </p>
      ) : null}

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
        className="mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]"
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
                {editingId ? 'Editar IP de HAQ' : 'Nueva IP de HAQ'}
              </h2>
              <p className="text-sm text-muted-foreground">Las observaciones son opcionales.</p>
            </div>
            {editingId ? (
              <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                <X />
                Cancelar
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              IP
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setForm((current) => ({ ...current, ip: event.target.value }))}
                required
                value={form.ip}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Área
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, area: event.target.value }))
                }
                required
                value={form.area}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Responsable
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsible: event.target.value }))
                }
                required
                value={form.responsible}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Usuario
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
                required
                value={form.username}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
              <textarea
                className="min-h-24 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, observations: event.target.value }))
                }
                value={form.observations}
              />
            </label>
          </div>
          {formError && workspace.pane === 'form' ? (
            <p
              role="alert"
              className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}
          <Button className="mt-4 w-full" disabled={saveMutation.isPending} type="submit">
            {saveMutation.isPending ? (
              'Guardando...'
            ) : editingId ? (
              <>
                <Edit3 /> Guardar cambios
              </>
            ) : (
              <>
                <Plus /> Registrar IP
              </>
            )}
          </Button>
        </form>

        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de IPs de HAQ</h2>
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar IPs de HAQ</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar IP, área o usuario"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredIps}
            getKey={(item) => item.id}
            title={(item) => item.ip}
            subtitle={(item) => item.area}
            fields={[
              { label: 'Responsable', render: (item) => item.responsible },
              { label: 'Usuario', render: (item) => item.username },
              {
                label: 'Observaciones',
                render: (item) => item.observations || 'Sin observaciones',
              },
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
            emptyMessage="No se encontraron IPs de HAQ."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Área</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Observaciones</th>
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
                    <td className="px-4 py-3">{item.area}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.responsible}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.username}</td>
                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      {item.observations || 'Sin observaciones'}
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
                      No se encontraron IPs de HAQ.
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
        className="module-workspace-wide mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(320px,430px)_minmax(0,1fr)]"
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
  const [form, setForm] = useState<TonerFormState>(emptyTonerForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [stockAction, setStockAction] = useState<'add' | 'remove' | null>(null);
  const [activeToner, setActiveToner] = useState<ApiToner | null>(null);
  const [showingHistory, setShowingHistory] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('1');
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [stockError, setStockError] = useState('');
  const tonersQuery = useQuery({
    queryKey: ['toners'],
    queryFn: () => request<ApiToner[]>('/toners'),
  });
  const printersQuery = useQuery({
    queryKey: ['printers'],
    queryFn: () => request<ApiPrinter[]>('/printers'),
  });
  const historyQuery = useQuery({
    queryKey: ['toner-history'],
    queryFn: () => request<ApiTonerMovement[]>('/toners/history'),
    enabled: showingHistory,
  });
  const saveMutation = useMutation({
    mutationFn: (body: TonerSaveBody) =>
      request<ApiToner>('/toners', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['toners'] }),
  });
  const stockMutation = useMutation({
    mutationFn: ({ tonerId, action, quantity, printerId }: {
      tonerId: string;
      action: 'add' | 'remove';
      quantity: number;
      printerId?: string;
    }) => request(`/toners/${tonerId}/stock/${action}`, {
      method: 'POST',
      body: JSON.stringify(action === 'remove' ? { quantity, printerId } : { quantity }),
    }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['toners'] }),
  });
  const toners = tonersQuery.data ?? [];
  const filteredToners = toners.filter((toner) =>
    [
      toner.model,
      toner.color,
      toner.printerName,
    ].some((value) =>
      value.toLocaleLowerCase('es').includes(searchTerm.trim().toLocaleLowerCase('es')),
    ),
  );

  function resetForm() {
    setForm(emptyTonerForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    setShowingHistory(false);
    setForm(emptyTonerForm);
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  function showTonerList() {
    setShowingHistory(false);
    workspace.showList();
  }

  function showTonerHistory() {
    setShowingHistory(true);
    workspace.showList();
  }

  function openStockDialog(toner: ApiToner, action: 'add' | 'remove') {
    setActiveToner(toner);
    setStockAction(action);
    setStockQuantity('1');
    setSelectedPrinterId('');
    setStockError('');
  }

  function closeStockDialog() {
    setStockAction(null);
    setActiveToner(null);
    setStockError('');
  }

  async function submitStockAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeToner || (stockAction !== 'add' && stockAction !== 'remove')) return;
    const quantity = Number(stockQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setStockError('Ingresa una cantidad entera mayor que cero.');
      return;
    }
    if (stockAction === 'remove' && !selectedPrinterId) {
      setStockError('Selecciona la impresora donde se instaló el toner.');
      return;
    }
    try {
      await stockMutation.mutateAsync({
        tonerId: activeToner.id,
        action: stockAction,
        quantity,
        printerId: stockAction === 'remove' ? selectedPrinterId : undefined,
      });
      setFormSuccess(stockAction === 'add' ? 'Toner agregado al stock.' : 'Salida de toner registrada.');
      closeStockDialog();
    } catch (error) {
      setStockError(error instanceof Error ? error.message : 'No fue posible actualizar el stock.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(form.quantity);
    if (
      !form.model.trim() ||
      !form.color.trim() ||
      !form.printerName.trim() ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      setFormError('Completa todos los campos con una cantidad entera mayor que cero.');
      return;
    }
    try {
      await saveMutation.mutateAsync({
        model: `TK-${tonerModelSuffix(form.model.trim())}`,
        color: form.color.trim(),
        printerName: form.printerName.trim(),
        quantity,
      });
      resetForm();
      setFormSuccess('Toner registrado.');
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
      </header>
      {tonersQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando toners...
        </p>
      ) : null}
      {tonersQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {tonersQuery.error.message}
        </p>
      ) : null}
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
          onShowList={showTonerList}
          onShowForm={startNew}
          onShowHistory={showTonerHistory}
          historyActive={showingHistory}
          formLabel="Nuevo"
          showOnDesktop
        />
      </div>
      <section
        className={cn(
          'mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]',
          showingHistory && 'xl:grid-cols-1',
        )}
        data-mobile-pane={showingHistory ? 'history' : workspace.pane}
      >
        <form
          data-pane="form"
          className={cn('min-w-0 rounded-md border bg-card p-4 shadow-sm', showingHistory && 'hidden')}
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Nuevo toner</h2>
              <p className="text-sm text-muted-foreground">Registra el modelo, color e impresora compatible.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Modelo
              <div className="flex h-10 overflow-hidden rounded-md border bg-background transition focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center border-r bg-sky-50 px-3 font-mono text-sm font-bold text-[#0b2347]">
                  TK-
                </span>
                <input
                  aria-label="Modelo del toner"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm font-normal outline-none"
                  maxLength={117}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      model: tonerModelSuffix(event.target.value),
                    }))
                  }
                  placeholder="Completa el modelo"
                  required
                  value={form.model}
                />
              </div>
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
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, printerName: event.target.value }))
                }
                maxLength={500}
                placeholder="ECOSYS M3145idn"
                required
                value={form.printerName}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Cantidad
              <div className="flex h-10 w-fit items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-teal-200 sm:h-11">
                <Button
                  aria-label="Reducir cantidad"
                  className="h-full w-9 rounded-none border-0 bg-slate-50 px-0 text-slate-700 shadow-none hover:bg-teal-50 hover:text-teal-800 sm:w-11"
                  disabled={Number(form.quantity) <= 1}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      quantity: String(Math.max(1, (Number(current.quantity) || 1) - 1)),
                    }))
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Minus />
                </Button>
                <input
                  aria-label="Cantidad de toners"
                  className="h-full w-14 appearance-none border-x border-slate-200 bg-transparent text-center text-base font-bold text-[#0b2347] outline-none sm:w-20"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  required
                  step={1}
                  type="number"
                  value={form.quantity}
                />
                <Button
                  aria-label="Aumentar cantidad"
                  className="h-full w-9 rounded-none border-0 bg-slate-50 px-0 text-slate-700 shadow-none hover:bg-teal-50 hover:text-teal-800 sm:w-11"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      quantity: String((Number(current.quantity) || 0) + 1),
                    }))
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus />
                </Button>
              </div>
            </label>
            {formError ? (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? 'Guardando...' : <><Plus /> Registrar toner</>}
            </Button>
          </div>
        </form>
        <section
          data-pane="list"
          className={cn(
            'min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-slate-900/5',
            showingHistory && 'hidden',
          )}
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de toners</h2>
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
            title={(toner) => (
              <span className="font-mono text-xl font-extrabold tracking-wide text-[#0b2347] sm:text-2xl">
                {toner.model}
              </span>
            )}
            subtitle={(toner) => (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${tonerColorClass(toner.color)}`}
              >
                {toner.color}
              </span>
            )}
            fields={[
              {
                label: 'Cantidad',
                render: (toner) => (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-teal-900 ring-1 ring-inset ring-teal-200">
                    <Boxes className="size-4" />
                    <strong className="text-lg">{toner.quantity}</strong>
                    <span className="text-xs font-semibold">en stock</span>
                  </span>
                ),
              },
              {
                label: 'Impresora',
                render: (toner) => (
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                    <Printer className="size-4 shrink-0 text-sky-700" />
                    {toner.printerName}
                  </span>
                ),
              },
            ]}
            actions={(toner) => (
              <div className="record-card-actions flex flex-wrap gap-2">
                <Button aria-label={`Agregar toner de ${toner.model}`} className="min-h-11 rounded-xl border border-emerald-200 bg-gradient-to-b from-white to-emerald-50 font-bold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:from-emerald-50 hover:to-emerald-100 hover:shadow-md" onClick={() => openStockDialog(toner, 'add')} type="button" variant="outline"><Plus /> Agregar</Button>
                <Button aria-label={`Instalar toner ${toner.model}`} className="min-h-11 rounded-xl border border-sky-200 bg-gradient-to-b from-white to-sky-50 font-bold text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:from-sky-50 hover:to-sky-100 hover:shadow-md" onClick={() => openStockDialog(toner, 'remove')} type="button" variant="outline"><Printer /> Instalar</Button>
              </div>
            )}
            emptyMessage="No se encontraron toners."
            cardClassName={(toner) => tonerCardStyle(toner.color).card}
            headerClassName={(toner) => tonerCardStyle(toner.color).header}
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-gradient-to-r from-sky-50 via-white to-teal-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Modelo</th>
                  <th className="px-4 py-3 font-semibold">Color</th>
                  <th className="px-4 py-3 font-semibold">Impresora</th>
                  <th className="px-4 py-3 font-semibold">Cantidad</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredToners.map((toner) => (
                  <tr
                    className="transition-colors hover:bg-sky-50/60"
                    key={toner.id}
                  >
                    <td className="px-4 py-3 font-mono text-base font-extrabold tracking-wide text-[#0b2347]">
                      {toner.model}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${tonerColorClass(toner.color)}`}
                      >
                        {toner.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {toner.printerName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-1.5 text-teal-900 ring-1 ring-inset ring-teal-200">
                        <Boxes className="size-4" />
                        <strong className="text-base">{toner.quantity}</strong>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button aria-label={`Agregar toner al stock de ${toner.model}`} className="rounded-lg border-emerald-200 bg-emerald-50 font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100" onClick={() => openStockDialog(toner, 'add')} size="sm" type="button" variant="outline"><Plus /> Agregar</Button>
                        <Button aria-label={`Instalar toner ${toner.model}`} className="rounded-lg border-sky-200 bg-sky-50 font-semibold text-sky-800 shadow-sm hover:bg-sky-100" onClick={() => openStockDialog(toner, 'remove')} size="sm" type="button" variant="outline"><Printer /> Instalar</Button>
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
      {showingHistory ? (
        <section data-pane="history" className="mt-4 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-slate-900/5">
          <div className="border-b bg-gradient-to-r from-sky-50 via-white to-teal-50 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">Historial de instalaciones</h2>
            <p className="mt-1 text-sm text-slate-600">Salidas de toner, impresora, usuario y fecha de cada registro.</p>
          </div>
          <div className="grid gap-3 p-4 sm:p-5">
            {historyQuery.isLoading ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-600">Cargando historial...</p> : null}
            {historyQuery.error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{historyQuery.error.message}</p> : null}
            {!historyQuery.isLoading && !historyQuery.error && historyQuery.data?.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">Aun no hay toners instalados.</p> : null}
            {historyQuery.data?.map((movement) => (
              <article className="grid gap-3 rounded-xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-4 sm:grid-cols-[minmax(140px,0.8fr)_minmax(0,2fr)] sm:items-center" key={movement.id}>
                <div className="flex items-center justify-between gap-3 sm:block">
                  <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Toner</p><strong className="mt-1 block font-mono text-lg text-slate-900">{movement.tonerModel}</strong></div>
                  <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-900">-{movement.quantity}</span>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Impresora</dt><dd className="mt-1 break-words font-medium text-slate-800">{movement.printerName}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</dt><dd className="mt-1 font-medium text-slate-800">{movement.userName}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha y hora</dt><dd className="mt-1 font-medium text-slate-800">{new Date(movement.createdAt).toLocaleString('es-MX')}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {stockAction && activeToner ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeStockDialog(); }}>
          <section aria-labelledby="toner-action-title" aria-modal="true" className="min-w-0 max-w-xl overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5" role="dialog" style={{ width: 'min(calc(100vw - 32px), 36rem)', maxHeight: 'calc(100dvh - 32px)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{activeToner.model}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900" id="toner-action-title">{stockAction === 'add' ? 'Agregar toner al stock' : 'Instalar toner'}</h2>
              </div>
              <Button aria-label="Cerrar" onClick={closeStockDialog} size="icon" type="button" variant="ghost"><X /></Button>
            </div>
            <form className="mt-5 grid min-w-0 gap-4" onSubmit={submitStockAction}>
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Cantidad
                <div className="flex h-12 w-fit items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-teal-200">
                  <Button aria-label="Reducir cantidad" className="h-full w-12 rounded-none border-0 bg-slate-50 px-0 text-slate-700 shadow-none hover:bg-teal-50 hover:text-teal-800" disabled={Number(stockQuantity) <= 1} onClick={() => setStockQuantity(String(Math.max(1, (Number(stockQuantity) || 1) - 1)))} size="sm" type="button" variant="outline"><Minus /></Button>
                  <input aria-label="Cantidad de toner" className="h-full w-16 border-x border-slate-200 bg-transparent text-center text-lg font-bold text-[#0b2347] outline-none" inputMode="numeric" min={1} onChange={(event) => setStockQuantity(event.target.value)} required step={1} type="number" value={stockQuantity} />
                  <Button aria-label="Aumentar cantidad" className="h-full w-12 rounded-none border-0 bg-slate-50 px-0 text-slate-700 shadow-none hover:bg-teal-50 hover:text-teal-800" onClick={() => setStockQuantity(String((Number(stockQuantity) || 0) + 1))} size="sm" type="button" variant="outline"><Plus /></Button>
                </div>
              </label>
              {stockAction === 'remove' ? (
                <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-800">Impresora donde se instalo
                  <select className="box-border h-12 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" onChange={(event) => setSelectedPrinterId(event.target.value)} required value={selectedPrinterId}>
                    <option value="">{printersQuery.isLoading ? 'Cargando impresoras...' : 'Selecciona una impresora'}</option>
                    {printersQuery.data?.map((printer) => <option key={printer.id} value={printer.id}>{printer.model} - {printer.area} - {printer.serialNumber}{printer.ip ? ` - ${printer.ip}` : ""}</option>)}
                  </select>
                  {printersQuery.error ? <span className="text-xs font-normal text-red-700">{printersQuery.error.message}</span> : null}
                  {!printersQuery.isLoading && !printersQuery.error && printersQuery.data?.length === 0 ? <span className="text-xs font-normal text-amber-800">No hay impresoras registradas.</span> : null}
                </label>
              ) : null}
              {stockError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{stockError}</p> : null}
              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button className="w-full rounded-xl sm:w-auto" onClick={closeStockDialog} type="button" variant="outline">Cancelar</Button>
                <Button className={cn('w-full rounded-xl font-semibold shadow-md sm:w-auto', stockAction === 'add' ? 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800' : 'bg-gradient-to-r from-sky-700 to-blue-800 hover:from-sky-800 hover:to-blue-900')} disabled={stockMutation.isPending || (stockAction === 'remove' && (!selectedPrinterId || printersQuery.isLoading || !printersQuery.data?.length))} type="submit">
                  {stockMutation.isPending ? 'Guardando...' : stockAction === 'add' ? <><Plus /> Agregar al stock</> : <><Printer /> Confirmar instalacion</>}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ComputerEquipmentView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ComputerEquipmentFormState>(emptyComputerEquipmentForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const equipmentQuery = useQuery({
    queryKey: ['computer-equipment'],
    queryFn: () => request<ApiComputerEquipment[]>('/computer-equipment'),
  });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: ComputerEquipmentFormState }) =>
      request<ApiComputerEquipment>(id ? `/computer-equipment/${id}` : '/computer-equipment', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['computer-equipment'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<void>(`/computer-equipment/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['computer-equipment'] }),
  });
  const equipment = equipmentQuery.data ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredEquipment = equipment.filter((item) =>
    [
      item.serialNumber,
      item.ip,
      item.model,
      item.ciId,
      item.assetType,
      item.description,
      item.location,
      item.responsible,
    ].some((value) => value.toLocaleLowerCase('es').includes(normalizedSearch)),
  );

  function resetForm() {
    setEditingId(null);
    setForm(emptyComputerEquipmentForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  function startNew() {
    resetForm();
    workspace.showForm();
  }

  function editEquipment(item: ApiComputerEquipment) {
    setEditingId(item.id);
    setForm({
      serialNumber: item.serialNumber,
      ip: item.ip,
      model: item.model,
      ciId: item.ciId,
      assetType: item.assetType,
      description: item.description,
      equipmentDate: item.equipmentDate.slice(0, 10),
      location: item.location,
      responsible: item.responsible,
    });
    setFormError('');
    setFormSuccess('');
    workspace.showForm();
  }

  async function removeEquipment(item: ApiComputerEquipment) {
    if (!window.confirm(`Dar de baja el equipo ${item.serialNumber}?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      if (editingId === item.id) resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'No fue posible dar de baja el equipo.',
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      ...form,
      serialNumber: form.serialNumber.trim(),
      ip: form.ip.trim(),
      model: form.model.trim(),
      ciId: form.ciId.trim(),
      assetType: form.assetType.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      responsible: form.responsible.trim(),
    };
    if (Object.values(body).some((value) => !String(value).trim())) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }
    try {
      const wasEditing = Boolean(editingId);
      await saveMutation.mutateAsync({ id: editingId, body });
      resetForm();
      setFormSuccess(wasEditing ? 'Equipo actualizado.' : 'Equipo registrado.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar el equipo.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Equipos de cómputo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario de computadoras, identificadores, ubicación y responsables.
          </p>
        </div>
        <Button onClick={startNew} variant="outline">
          <Plus />
          Nuevo equipo
        </Button>
      </header>

      {equipmentQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando equipos...
        </p>
      ) : null}
      {equipmentQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {equipmentQuery.error.message}
        </p>
      ) : null}

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
        className="module-workspace-wide mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]"
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
                {editingId ? 'Editar equipo' : 'Nuevo equipo'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Captura la información de control patrimonial.
              </p>
            </div>
            {editingId ? (
              <Button onClick={resetForm} size="sm" type="button" variant="ghost">
                <X />
                Cancelar
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              No. de serie
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, serialNumber: event.target.value }))
                }
                required
                value={form.serialNumber}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              IP
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setForm((current) => ({ ...current, ip: event.target.value }))}
                required
                value={form.ip}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Modelo
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, model: event.target.value }))
                }
                required
                value={form.model}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              CI-ID
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, ciId: event.target.value }))
                }
                required
                value={form.ciId}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Tipo de activo
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, assetType: event.target.value }))
                }
                required
                value={form.assetType}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Descripción
              <textarea
                className="min-h-20 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                required
                value={form.description}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Fecha
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, equipmentDate: event.target.value }))
                }
                required
                type="date"
                value={form.equipmentDate}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Ubicación
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                required
                value={form.location}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Responsable
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsible: event.target.value }))
                }
                required
                value={form.responsible}
              />
            </label>
          </div>
          {formError && workspace.pane === 'form' ? (
            <p
              role="alert"
              className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}
          <Button className="mt-4 w-full" disabled={saveMutation.isPending} type="submit">
            {saveMutation.isPending ? (
              'Guardando...'
            ) : editingId ? (
              <>
                <Edit3 /> Guardar cambios
              </>
            ) : (
              <>
                <Plus /> Registrar equipo
              </>
            )}
          </Button>
        </form>

        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-md border bg-card shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de equipos</h2>
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar equipos</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por serie, CI-ID, IP o responsable"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredEquipment}
            getKey={(item) => item.id}
            title={(item) => item.model}
            subtitle={(item) => `${item.serialNumber} · ${item.ip}`}
            fields={[
              { label: 'CI-ID', render: (item) => item.ciId },
              { label: 'Tipo de activo', render: (item) => item.assetType },
              { label: 'Ubicación', render: (item) => item.location },
              { label: 'Responsable', render: (item) => item.responsible },
              {
                label: 'Fecha',
                render: (item) => new Date(item.equipmentDate).toLocaleDateString('es-MX'),
              },
              { label: 'Descripción', render: (item) => item.description },
            ]}
            actions={(item) => (
              <>
                <Button onClick={() => editEquipment(item)} type="button" variant="outline">
                  <Edit3 /> Editar
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => void removeEquipment(item)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 /> Eliminar
                </Button>
              </>
            )}
            emptyMessage="No se encontraron equipos."
          />
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Serie / CI-ID</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Modelo / tipo</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Ubicación</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEquipment.map((item) => (
                  <tr
                    className={editingId === item.id ? 'bg-secondary/70' : undefined}
                    key={item.id}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.serialNumber}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.ciId}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{item.ip}</td>
                    <td className="px-4 py-3">
                      <div>{item.model}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.assetType}</div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-muted-foreground">{item.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.equipmentDate).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.responsible}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Editar ${item.model}`}
                          onClick={() => editEquipment(item)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Edit3 />
                        </Button>
                        <Button
                          aria-label={`Eliminar ${item.model}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => void removeEquipment(item)}
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
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted-foreground" colSpan={8}>
                      No se encontraron equipos.
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

function ExtensionsView({ request }: { request: AuthenticatedRequest }) {
  const queryClient = useQueryClient();
  const workspace = useModuleWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<ExtensionFormState>(emptyExtensionForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const extensionsQuery = useQuery({
    queryKey: ['extensions'],
    queryFn: () => request<ApiExtension[]>('/extensions'),
  });
  const areasQuery = useQuery({
    queryKey: ['areas'],
    queryFn: () => request<ApiArea[]>('/areas'),
  });
  const saveMutation = useMutation({
    mutationFn: (body: ExtensionFormState) =>
      request<ApiExtension>('/extensions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['extensions'] }),
  });
  const extensions = extensionsQuery.data ?? [];
  const registeredAreas = [...(areasQuery.data ?? [])].sort((first, second) =>
    first.name.localeCompare(second.name, 'es'),
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredExtensions = extensions.filter((item) =>
    [item.extension, item.area, item.description].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );

  function resetForm() {
    setForm(emptyExtensionForm);
    setFormError('');
    setFormSuccess('');
    workspace.showList();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      extension: form.extension.trim(),
      description: form.description.trim(),
      area: form.area.trim(),
    };
    if (body.extension && !/^\d+$/.test(body.extension)) {
      setFormError('La extension debe contener solo numeros.');
      return;
    }
    if (!body.extension || !body.description || !body.area) {
      setFormError('Extensión, descripción y área son obligatorios.');
      return;
    }
    try {
      await saveMutation.mutateAsync(body);
      resetForm();
      setFormSuccess('Extensión registrada.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No fue posible guardar la extensión.');
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Extensiones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directorio de extensiones telefónicas por área.
          </p>
        </div>
      </header>
      {extensionsQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando extensiones...
        </p>
      ) : null}
      {extensionsQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {extensionsQuery.error.message}
        </p>
      ) : null}
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
          formLabel="Nuevo"
          showOnDesktop
          className="border-teal-200 bg-gradient-to-r from-white via-teal-50/70 to-sky-50/70 shadow-md shadow-teal-900/5"
          activeTabClassName="bg-gradient-to-r from-[#0b2347] to-teal-700 shadow-md shadow-teal-900/15"
          inactiveTabClassName="text-slate-600 hover:bg-teal-100/70 hover:text-teal-900"
        />
      </div>
      <section
        className="extension-workspace mt-4 grid min-w-0 gap-4 xl:mt-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        data-mobile-pane={workspace.pane}
      >
        <form
          data-pane="form"
          className="min-w-0 rounded-2xl border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/60 p-4 shadow-lg shadow-slate-900/5"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Nueva extensión</h2>
              <p className="text-sm text-muted-foreground">
                Registra la información telefónica del área.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Extensión
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-100"
                inputMode="numeric"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    extension: event.target.value.replace(/\D/g, ''),
                  }))
                }
                pattern="[0-9]*"
                required
                type="text"
                value={form.extension}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Descripción
              <textarea
                className="min-h-24 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-100"
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                required
                value={form.description}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Área
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-100"
                disabled={areasQuery.isLoading || (registeredAreas.length === 0 && !form.area)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, area: event.target.value }))
                }
                required
                value={form.area}
              >
                <option value="">
                  {areasQuery.isLoading
                    ? 'Cargando áreas...'
                    : areasQuery.error
                      ? 'No se pudieron cargar las áreas'
                      : registeredAreas.length === 0
                        ? 'No hay áreas registradas'
                        : 'Selecciona un área'}
                </option>
                {form.area && !registeredAreas.some((area) => area.name === form.area) ? (
                  <option value={form.area}>{form.area} (actual)</option>
                ) : null}
                {registeredAreas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
              {areasQuery.error ? (
                <span className="text-xs font-normal text-destructive">
                  {areasQuery.error.message}
                </span>
              ) : !areasQuery.isLoading && registeredAreas.length === 0 && !form.area ? (
                <span className="text-xs font-normal text-muted-foreground">
                  Registra un área en el módulo Áreas para poder asignarla.
                </span>
              ) : null}
            </label>
          </div>
          {formError && workspace.pane === 'form' ? (
            <p
              role="alert"
              className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}
          <Button
            className="mt-5 h-12 w-full bg-gradient-to-r from-[#0b2347] via-sky-800 to-teal-700 shadow-md shadow-teal-900/15 transition-all hover:-translate-y-0.5 hover:from-[#082044] hover:via-sky-900 hover:to-teal-800 hover:shadow-lg"
            disabled={saveMutation.isPending}
            type="submit"
          >
            {saveMutation.isPending ? 'Guardando...' : <><Plus /> Registrar extensión</>}
          </Button>
        </form>
        <section
          data-pane="list"
          className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-slate-900/5"
        >
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Directorio de extensiones</h2>
            </div>
            <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-sky-50/70 px-3 shadow-inner transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100 sm:max-w-80">
              <Search className="size-4 shrink-0 text-sky-700" />
              <span className="sr-only">Buscar extensiones</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar"
                type="search"
                value={searchTerm}
              />
            </label>
          </div>
          <RecordCards
            items={filteredExtensions}
            getKey={(item) => item.id}
            title={(item) => (
              <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-[#0b2347] to-sky-800 px-2.5 py-1 font-mono text-base font-bold tracking-wide text-white shadow-sm shadow-sky-900/15 sm:text-lg">
                  <Phone className="size-4 sm:size-5" />
                  {item.extension}
                </span>
                <span className="shrink-0 text-slate-400">-</span>
                <span className="min-w-0 truncate text-sm font-semibold leading-snug text-slate-800 sm:text-base">
                  {item.description}
                </span>
              </div>
            )}
            subtitle={(item) => (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                <Building2 className="size-3.5" />
                {item.area}
              </span>
            )}
            fields={[]}
            emptyMessage="No se encontraron extensiones."
            cardClassName="border-sky-100 shadow-md shadow-slate-900/5 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/10"
            headerClassName="border-sky-100 bg-gradient-to-br from-sky-50/90 via-white to-teal-50/80"
            listClassName="md:grid-cols-1"
          />
          <div className="hidden divide-y divide-slate-100 xl:block">
            {filteredExtensions.map((item) => (
              <article
                className="group relative grid grid-cols-[minmax(110px,0.18fr)_minmax(0,1fr)_minmax(130px,0.22fr)] items-center gap-6 border-l-4 border-l-teal-400 bg-gradient-to-r from-teal-50/50 via-white to-white px-5 py-4 transition-all hover:border-l-sky-600 hover:from-sky-50 hover:via-white hover:shadow-sm"
                key={item.id}
              >
                <p className="inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[#0b2347] to-sky-800 px-3.5 py-2 font-mono text-lg font-bold tracking-wide text-white shadow-sm shadow-sky-900/15 transition-transform group-hover:scale-[1.03]">
                  <Phone className="size-4" />
                  {item.extension}
                </p>
                <p className="min-w-0 text-sm font-medium leading-6 text-slate-700">{item.description}</p>
                <span className="inline-flex max-w-56 items-center gap-1.5 justify-self-end truncate rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                  <Building2 className="size-3.5 shrink-0" />
                  {item.area}
                </span>
              </article>
            ))}
            {filteredExtensions.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No se encontraron extensiones.
              </p>
            ) : null}
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
  const areasQuery = useQuery({
    queryKey: ['areas'],
    queryFn: () => request<ApiArea[]>('/areas'),
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
  const registeredAreas = [...(areasQuery.data ?? [])].sort((first, second) =>
    first.name.localeCompare(second.name, 'es'),
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredPrinters = printers.filter((printer) =>
    [printer.area, printer.model, printer.serialNumber, printer.ip ?? '', printer.responsible, printer.status].some(
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
      ip: printer.ip ?? '',
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
      ip: form.ip.trim(),
      responsible: form.responsible.trim(),
    };
    if (
      !body.area ||
      !body.model ||
      !body.serialNumber ||
      !body.ip ||
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
      </header>

      {printersQuery.isLoading || areasQuery.isLoading ? (
        <p className="mt-6 rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Cargando impresoras...
        </p>
      ) : null}
      {printersQuery.error || areasQuery.error ? (
        <p className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {printersQuery.error?.message ?? areasQuery.error?.message}
        </p>
      ) : null}

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
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={areasQuery.isLoading || (registeredAreas.length === 0 && !form.area)}
                onChange={(event) => updateField('area', event.target.value)}
                required
                value={form.area}
              >
                <option value="">
                  {areasQuery.isLoading
                    ? 'Cargando áreas...'
                    : areasQuery.error
                      ? 'No se pudieron cargar las áreas'
                      : registeredAreas.length === 0
                        ? 'No hay áreas registradas'
                        : 'Selecciona un área'}
                </option>
                {form.area && !registeredAreas.some((area) => area.name === form.area) ? (
                  <option value={form.area}>{form.area} (actual)</option>
                ) : null}
                {registeredAreas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
              {areasQuery.error ? (
                <span className="text-xs font-normal text-destructive">
                  {areasQuery.error.message}
                </span>
              ) : !areasQuery.isLoading && registeredAreas.length === 0 && !form.area ? (
                <span className="text-xs font-normal text-muted-foreground">
                  Registra un área en el módulo Áreas para poder asignarla.
                </span>
              ) : null}
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
              IP
              <input
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                inputMode="decimal"
                onChange={(event) => updateField('ip', event.target.value)}
                placeholder="192.168.1.100"
                required
                type="text"
                value={form.ip}
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
            </div>
            <label className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 sm:max-w-80">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Buscar impresoras</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar area, modelo, serie o IP"
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
              { label: 'IP', render: (printer) => printer.ip ?? 'Sin IP' },
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
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Área</th>
                  <th className="px-4 py-3 font-semibold">Modelo / Serie</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Instalación</th>
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
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">{printer.ip ?? 'Sin IP'}</td>
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
