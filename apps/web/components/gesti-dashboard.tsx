'use client';

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
import { useQuery } from '@tanstack/react-query';
import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
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
import { cn } from '@/lib/utils';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

type RoleName = 'ADMIN' | 'SUPERVISOR' | 'TI' | 'USUARIO';
type ViewName = 'dashboard' | 'users';
type UserStatus = 'Activo' | 'Inactivo';
type UserRow = {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  status: UserStatus;
  essential?: boolean;
};

type UserFormState = {
  email: string;
  name: string;
  role: RoleName;
  status: UserStatus;
};

const adminUser: UserRow = {
  id: 'admin',
  email: 'admin@gesti.local',
  name: 'Administrador GESTI',
  role: 'ADMIN',
  status: 'Activo',
  essential: true,
};

const usersAllowedRoles = new Set<RoleName>(['ADMIN', 'SUPERVISOR']);

const initialUserRows: UserRow[] = [
  adminUser,
  {
    id: 'supervisor',
    email: 'supervisor@gesti.local',
    name: 'Supervisor de TI',
    role: 'SUPERVISOR',
    status: 'Activo',
  },
  {
    id: 'soporte-ti',
    email: 'soporte@gesti.local',
    name: 'Soporte Tecnico',
    role: 'TI',
    status: 'Activo',
  },
  {
    id: 'usuario-general',
    email: 'usuario@gesti.local',
    name: 'Usuario General',
    role: 'USUARIO',
    status: 'Inactivo',
  },
];

const emptyUserForm: UserFormState = {
  email: '',
  name: '',
  role: 'USUARIO',
  status: 'Activo',
};

const localLoginPassword = 'Admin123!';

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
  { name: 'Asignados', value: 134, color: '#0f766e' },
  { name: 'Stock', value: 28, color: '#2563eb' },
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
    tone: 'text-blue-700 bg-blue-50',
  },
  {
    label: 'Activos registrados',
    value: '181',
    delta: '12 en revision',
    icon: Boxes,
    tone: 'text-teal-700 bg-teal-50',
  },
  {
    label: 'Usuarios activos',
    value: '326',
    delta: 'RBAC pendiente',
    icon: Users,
    tone: 'text-violet-700 bg-violet-50',
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
  const [users, setUsers] = useState<UserRow[]>(initialUserRows);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [activeView, setActiveView] = useState<ViewName>('dashboard');
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: fetchHealth,
  });
  const canViewUsers = currentUser ? usersAllowedRoles.has(currentUser.role) : false;
  const navigationItems: Array<{ id: ViewName; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: 'Tablero', icon: BarChart3 },
    ...(canViewUsers ? [{ id: 'users' as const, label: 'Usuarios', icon: Users }] : []),
  ];

  function handleLogin(user: UserRow) {
    setCurrentUser(user);
    setActiveView('dashboard');
  }

  function handleLogout() {
    setCurrentUser(null);
    setActiveView('dashboard');
  }

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} users={users} />;
  }

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col border-b bg-card px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-normal">GESTI</p>
              <p className="text-xs text-muted-foreground">Departamento de TI</p>
            </div>
          </div>

          <nav className="mt-6 grid gap-1">
            {navigationItems.map((item) => (
              <button
                aria-current={activeView === item.id ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  activeView === item.id && 'bg-secondary text-foreground',
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

          <div className="mt-6 border-t pt-4 lg:mt-auto">
            <div className="rounded-md bg-secondary p-3">
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{currentUser.email}</p>
              <span className="mt-3 inline-flex rounded-md border bg-card px-2 py-1 text-xs font-semibold">
                {currentUser.role}
              </span>
            </div>
            <Button className="mt-3 w-full justify-start" onClick={handleLogout} variant="outline">
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
            <UsersView currentRole={currentUser.role} users={users} onUsersChange={setUsers} />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function LoginView({ users, onLogin }: { users: UserRow[]; onLogin: (user: UserRow) => void }) {
  const [email, setEmail] = useState(adminUser.email);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLocaleLowerCase('es');
    const matchedUser = users.find(
      (user) => user.email.toLocaleLowerCase('es') === normalizedEmail && user.status === 'Activo',
    );

    if (!matchedUser || password !== localLoginPassword) {
      setError('Usa un usuario activo y la contrasena temporal correcta.');
      return;
    }

    setError('');
    onLogin(matchedUser);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-md border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">GESTI</h1>
            <p className="text-sm text-muted-foreground">Acceso al departamento de TI</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Correo
            <span className="flex h-10 items-center gap-2 rounded-md border bg-background px-3">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Contrasena
            <span className="flex h-10 items-center gap-2 rounded-md border bg-background px-3">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Admin123!"
                type="password"
                value={password}
              />
            </span>
          </label>

          {error ? (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit">
            <UserCheck />
            Entrar
          </Button>
        </form>

        <div className="mt-5 rounded-md border bg-secondary p-3 text-sm">
          <p className="font-medium">Usuario local de prueba</p>
          <p className="mt-1 break-all text-muted-foreground">{adminUser.email}</p>
        </div>
      </section>
    </main>
  );
}

function UsersView({
  currentRole,
  users,
  onUsersChange,
}: {
  currentRole: RoleName;
  users: UserRow[];
  onUsersChange: Dispatch<SetStateAction<UserRow[]>>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(emptyUserForm);
  const [formError, setFormError] = useState('');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');
  const filteredUsers = users.filter((user) =>
    [user.name, user.email, user.role].some((value) =>
      value.toLocaleLowerCase('es').includes(normalizedSearch),
    ),
  );
  const canManageUsers = usersAllowedRoles.has(currentRole);
  const isEditing = editingUserId !== null;

  function updateFormField<Key extends keyof UserFormState>(key: Key, value: UserFormState[Key]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingUserId(null);
    setFormState(emptyUserForm);
    setFormError('');
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
  }

  function handleDelete(user: UserRow) {
    if (user.essential) {
      return;
    }

    const confirmed = window.confirm(`Eliminar usuario ${user.email}?`);

    if (!confirmed) {
      return;
    }

    onUsersChange((currentUsers) => currentUsers.filter((item) => item.id !== user.id));

    if (editingUserId === user.id) {
      resetForm();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (isEditing) {
      onUsersChange((currentUsers) =>
        currentUsers.map((user) =>
          user.id === editingUserId
            ? {
                ...user,
                email,
                name,
                role: formState.role,
                status: formState.status,
              }
            : user,
        ),
      );
    } else {
      onUsersChange((currentUsers) => [
        ...currentUsers,
        {
          id: crypto.randomUUID(),
          email,
          name,
          role: formState.role,
          status: formState.status,
        },
      ]);
    }

    resetForm();
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

            <Button disabled={!canManageUsers} type="submit">
              {isEditing ? <Edit3 /> : <UserPlus />}
              {isEditing ? 'Guardar cambios' : 'Crear usuario'}
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
                          disabled={!canManageUsers || user.essential}
                          onClick={() => handleDelete(user)}
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
