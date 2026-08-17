// ─── Tipos ────────────────────────────────────────────────────
export interface IpcEntry {
  year:  number;
  month: number; // 1–12
  value: number; // variación mensual decimal (ej: 0.008 = 0.8%)
}

// ─── Helpers ──────────────────────────────────────────────────

/** Devuelve lista [{year, month}] desde el mes siguiente a dueDate hasta el mes de today (inclusive) */
function overdueMonths(dueDate: Date, today: Date): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];

  // Empieza desde el mes siguiente al vencimiento
  let y = dueDate.getFullYear();
  let m = dueDate.getMonth() + 2; // getMonth() es 0-based; +1=mes del vencimiento, +2=siguiente
  if (m > 12) { m = 1; y++; }

  const endY = today.getFullYear();
  const endM = today.getMonth() + 1; // mes actual (1-based)

  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ─── Cálculo según Ley uruguaya ───────────────────────────────
/**
 * Interés legal uruguayo para GC vencidos:
 *   1. El monto original se actualiza por IPC acumulado mes a mes.
 *   2. Sobre el monto actualizado se aplica 1 % mensual fijo.
 *
 * `interestAmount` = (ajuste IPC) + (1 % mensual sobre monto ajustado)
 *
 * Si no hay datos de IPC para un mes, ese mes no suma ajuste (se ignora).
 */
export function calculateInterestWithIpc(
  principal:  number,
  dueDate:    Date,
  ipcIndexes: IpcEntry[],
  today:      Date = new Date()
): { interestAmount: number; ipcAdjustment: number; monthlyInterest: number; monthsOverdue: number } {
  if (today <= dueDate) {
    return { interestAmount: 0, ipcAdjustment: 0, monthlyInterest: 0, monthsOverdue: 0 };
  }

  const months = overdueMonths(dueDate, today);
  const monthsOverdue = months.length;

  // Factor IPC acumulado: ∏(1 + ipc_i) para cada mes con dato
  let ipcFactor = 1;
  for (const { year, month } of months) {
    const entry = ipcIndexes.find(e => e.year === year && e.month === month);
    if (entry) ipcFactor *= (1 + entry.value);
  }

  const adjustedPrincipal = principal * ipcFactor;
  const ipcAdjustment     = adjustedPrincipal - principal;            // cuánto sumó el IPC
  const monthlyInterest   = adjustedPrincipal * 0.01 * monthsOverdue; // 1 % × meses
  const interestAmount    = Math.round((ipcAdjustment + monthlyInterest) * 100) / 100;

  return { interestAmount, ipcAdjustment: Math.round(ipcAdjustment * 100) / 100, monthlyInterest: Math.round(monthlyInterest * 100) / 100, monthsOverdue };
}

// ─── Fallback (tasa manual — se mantiene por compatibilidad) ──
/** @deprecated Usar calculateInterestWithIpc cuando haya datos de IPC */
export function calculateInterest(
  principal:   number,
  monthlyRate: number,
  dueDate:     Date,
  today:       Date = new Date()
): number {
  if (today <= dueDate) return 0;
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.round(principal * monthlyRate * (daysOverdue / 30) * 100) / 100;
}

// ─── Marcar vencidos (con IPC) ────────────────────────────────
export function markOverdueCharges(
  charges: Array<{
    id:             string;
    amount:         number | string;
    dueDate:        Date;
    status:         string;
    interestAmount: number | string;
  }>,
  ipcIndexes: IpcEntry[],
  today = new Date()
) {
  return charges.map((charge) => {
    if (charge.status === 'PAID') return charge;
    const isOverdue = charge.dueDate < today;
    const newStatus = isOverdue ? 'OVERDUE' : charge.status;

    let interestAmount = 0;
    let ipcAdjustment  = 0;
    let monthlyInterest = 0;
    let monthsOverdue   = 0;

    if (isOverdue) {
      ({ interestAmount, ipcAdjustment, monthlyInterest, monthsOverdue } =
        calculateInterestWithIpc(Number(charge.amount), charge.dueDate, ipcIndexes, today));
    }

    return {
      ...charge,
      status:         newStatus,
      interestAmount,
      ipcAdjustment,
      monthlyInterest,
      monthsOverdue,
      totalDue: Number(charge.amount) + interestAmount,
    };
  });
}
