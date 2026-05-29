'use client';
import { useEffect, useState } from 'react';
import {
  Building2, CreditCard, AlertTriangle, TrendingUp,
  Home, Plus, ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  stats: {
    totalBuildings: number;
    totalApartments: number;
    totalOverdue: number;
    overdueCount: number;
    monthCollection: number;
    monthPaymentCount: number;
    delinquentApartments: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
    resident: {
      firstName: string;
      lastName: string;
      apartment: { number: string; building: { name: string } };
    };
  }>;
  upcomingMaintenance: Array<{
    id: string;
    title: string;
    priority: string;
    scheduledDate: string;
    building: { name: string };
  }>;
}

interface ChartPoint { month: string; label: string; amount: number }

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>('/dashboard/stats'),
      api.get<ChartPoint[]>('/dashboard/chart/collection'),
    ]).then(([stats, chartData]) => {
      setData(stats);
      setChart(chartData);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  const s = data?.stats;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`${greeting()}, ${user?.firstName || ''}`}
        actions={
          <Link
            href="/edificios/nuevo"
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo edificio
          </Link>
        }
      />

      <div className="p-6 space-y-6 animate-slide-up">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Edificios activos"
            value={s?.totalBuildings ?? 0}
            subtitle={`${s?.totalApartments ?? 0} apartamentos`}
            icon={Building2}
          />
          <StatsCard
            title="Recaudación del mes"
            value={formatCurrency(s?.monthCollection ?? 0)}
            subtitle={`${s?.monthPaymentCount ?? 0} pagos`}
            icon={TrendingUp}
            variant="success"
          />
          <StatsCard
            title="Deuda vencida"
            value={formatCurrency(s?.totalOverdue ?? 0)}
            subtitle={`${s?.overdueCount ?? 0} cargos`}
            icon={AlertTriangle}
            variant="danger"
          />
          <StatsCard
            title="Morosos"
            value={s?.delinquentApartments ?? 0}
            subtitle="apartamentos con deuda"
            icon={Home}
            variant="warning"
          />
        </div>

        {/* Chart + recent payments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recaudación mensual</h2>
                <p className="text-xs text-slate-400">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chart} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Recaudado']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="amount" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent payments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Pagos recientes</h2>
              <Link href="/pagos" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {data?.recentPayments.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Sin pagos recientes</p>
              )}
              {data?.recentPayments.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {p.resident.firstName} {p.resident.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        Apt {p.resident.apartment.number} · {p.resident.apartment.building.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-slate-400">{formatDate(p.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming maintenance */}
        {data?.upcomingMaintenance && data.upcomingMaintenance.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Mantenimientos próximos</h2>
              <Link href="/mantenimiento" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {data.upcomingMaintenance.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.building.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.priority} />
                    <span className="text-xs text-slate-400">{formatDate(task.scheduledDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
