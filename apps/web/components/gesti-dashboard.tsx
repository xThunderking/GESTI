'use client';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Computer,
  Download,
  Filter,
  LifeBuoy,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: fetchHealth,
  });

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b bg-card px-4 py-4 lg:border-b-0 lg:border-r">
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
            {[
              { label: 'Tablero', icon: BarChart3, active: true },
              { label: 'Tickets', icon: LifeBuoy },
              { label: 'Inventario', icon: Computer },
              { label: 'Activos', icon: Boxes },
              { label: 'Monitoreo', icon: Activity },
            ].map((item) => (
              <button
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-muted-foreground',
                  item.active && 'bg-secondary text-foreground',
                )}
                key={item.label}
                type="button"
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
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
                    className={cn('flex size-10 items-center justify-center rounded-md', item.tone)}
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
                  <p className="text-sm text-muted-foreground">Apertura y resolucion de tickets</p>
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
              <p className="text-sm text-muted-foreground">Inventario por condicion operativa</p>
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
                    <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
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
                <p className="text-sm text-muted-foreground">Tickets que requieren seguimiento</p>
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
        </section>
      </div>
    </main>
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
