import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'UYU'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(date));
}

export function formatPeriod(period: string): string {
  // "2024-01" → "Enero 2024"
  const [year, month] = period.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleString('es-UY', { month: 'long', year: 'numeric' });
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: 'UTE (Electricidad)',
  WATER: 'OSE (Agua)',
  CLEANING: 'Limpieza',
  ELEVATOR: 'Ascensor',
  MAINTENANCE: 'Mantenimiento',
  CONCIERGE: 'Portería',
  INSURANCE: 'Seguro',
  ADMINISTRATION: 'Administración',
  RESERVE_FUND: 'Fondo de reserva',
  OTHER: 'Otros',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  ONLINE: 'Online',
  OTHER: 'Otro',
};

export const CHARGE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Pago parcial',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
};
