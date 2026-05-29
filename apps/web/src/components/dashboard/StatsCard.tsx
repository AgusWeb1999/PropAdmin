import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'danger' | 'success' | 'warning';
  className?: string;
}

const VARIANTS = {
  default: {
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-900',
    trend: { positive: 'text-emerald-600', negative: 'text-red-500' },
  },
  danger: {
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-600',
    trend: { positive: 'text-emerald-600', negative: 'text-red-500' },
  },
  success: {
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
    trend: { positive: 'text-emerald-600', negative: 'text-red-500' },
  },
  warning: {
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-700',
    trend: { positive: 'text-emerald-600', negative: 'text-red-500' },
  },
};

export function StatsCard({
  title, value, subtitle, icon: Icon,
  trend, variant = 'default', className,
}: StatsCardProps) {
  const styles = VARIANTS[variant];

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-100 p-5',
      'hover:shadow-sm transition-shadow duration-200',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className={cn('text-2xl font-bold mt-1 tabular-nums', styles.value)}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              trend.value >= 0 ? styles.trend.positive : styles.trend.negative
            )}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl', styles.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
