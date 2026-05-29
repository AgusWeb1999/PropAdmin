import { cn } from '@/lib/utils';

const VARIANTS: Record<string, { label: string; className: string }> = {
  // Charges
  PENDING:  { label: 'Pendiente',     className: 'bg-amber-100 text-amber-700' },
  PARTIAL:  { label: 'Pago parcial',  className: 'bg-blue-100 text-blue-700' },
  PAID:     { label: 'Pagado',        className: 'bg-emerald-100 text-emerald-700' },
  OVERDUE:  { label: 'Vencido',       className: 'bg-red-100 text-red-700' },
  // Apartments
  OCCUPIED:    { label: 'Ocupado',    className: 'bg-emerald-100 text-emerald-700' },
  VACANT:      { label: 'Vacío',      className: 'bg-gray-100 text-gray-600' },
  MAINTENANCE: { label: 'En obra',    className: 'bg-amber-100 text-amber-700' },
  // Residents
  OWNER:  { label: 'Propietario', className: 'bg-indigo-100 text-indigo-700' },
  TENANT: { label: 'Inquilino',   className: 'bg-purple-100 text-purple-700' },
  // Reservations
  CONFIRMED:  { label: 'Confirmada',  className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:  { label: 'Cancelada',   className: 'bg-red-100 text-red-700' },
  COMPLETED:  { label: 'Completada',  className: 'bg-gray-100 text-gray-600' },
  // Maintenance
  IN_PROGRESS: { label: 'En curso',   className: 'bg-blue-100 text-blue-700' },
  // Priority
  LOW:    { label: 'Baja',    className: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Media',   className: 'bg-amber-100 text-amber-700' },
  HIGH:   { label: 'Alta',    className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgente', className: 'bg-red-100 text-red-700' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = VARIANTS[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variant.className,
      className
    )}>
      {variant.label}
    </span>
  );
}
