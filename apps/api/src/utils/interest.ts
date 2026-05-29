// Calculate simple monthly interest on overdue charges
export function calculateInterest(
  principal: number,
  monthlyRate: number,
  dueDate: Date,
  today: Date = new Date()
): number {
  if (today <= dueDate) return 0;
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  const interest = principal * monthlyRate * (daysOverdue / 30);
  return Math.round(interest * 100) / 100;
}

// Update overdue status and recalculate interest for a set of charges
export function markOverdueCharges(charges: Array<{
  id: string;
  amount: number | string;
  dueDate: Date;
  status: string;
  interestAmount: number | string;
}>, monthlyRate: number, today = new Date()) {
  return charges.map((charge) => {
    if (charge.status === 'PAID') return charge;
    const isOverdue = charge.dueDate < today;
    const newStatus = isOverdue ? 'OVERDUE' : charge.status;
    const interest = isOverdue
      ? calculateInterest(Number(charge.amount), monthlyRate, charge.dueDate, today)
      : 0;
    return {
      ...charge,
      status: newStatus,
      interestAmount: interest,
      totalDue: Number(charge.amount) + interest,
    };
  });
}
