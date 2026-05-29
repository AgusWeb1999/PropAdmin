import Link from 'next/link';
import { Building2, Home, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  totalUnits: number;
  currency: string;
  _count?: { apartments: number };
}

interface BuildingCardProps {
  building: Building;
  stats?: {
    occupiedApartments: number;
    overdueDebt: number;
    overdueCount: number;
  };
  className?: string;
}

export function BuildingCard({ building, stats, className }: BuildingCardProps) {
  const occupancy = stats && building.totalUnits > 0
    ? Math.round((stats.occupiedApartments / building.totalUnits) * 100)
    : null;

  return (
    <Link
      href={`/edificios/${building.id}`}
      className={cn(
        'block bg-white rounded-2xl border border-gray-100 p-5',
        'hover:shadow-md hover:border-gray-200 transition-all duration-200 group',
        className
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors">
          <Building2 className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{building.name}</h3>
          <p className="text-xs text-slate-400 truncate">{building.address}</p>
          <p className="text-xs text-slate-400">{building.city}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">Apartamentos</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {building._count?.apartments ?? building.totalUnits}
            <span className="text-xs font-normal text-slate-400"> / {building.totalUnits}</span>
          </p>
          {occupancy !== null && (
            <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all"
                style={{ width: `${occupancy}%` }}
              />
            </div>
          )}
        </div>

        <div className={cn(
          'rounded-xl p-3',
          stats && stats.overdueDebt > 0 ? 'bg-red-50' : 'bg-gray-50'
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className={cn('w-3.5 h-3.5', stats && stats.overdueDebt > 0 ? 'text-red-400' : 'text-slate-400')} />
            <span className={cn('text-xs', stats && stats.overdueDebt > 0 ? 'text-red-500' : 'text-slate-500')}>
              Deuda vencida
            </span>
          </div>
          <p className={cn('text-sm font-semibold', stats && stats.overdueDebt > 0 ? 'text-red-600' : 'text-slate-400')}>
            {stats ? formatCurrency(stats.overdueDebt, building.currency) : '—'}
          </p>
          {stats && stats.overdueCount > 0 && (
            <p className="text-xs text-red-400 mt-0.5">{stats.overdueCount} morosos</p>
          )}
        </div>
      </div>
    </Link>
  );
}
