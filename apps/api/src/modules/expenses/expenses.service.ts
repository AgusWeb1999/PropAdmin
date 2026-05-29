import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';
import { calculateInterest } from '../../utils/interest';

export async function getExpenses(buildingId: string, companyId: string, period?: string) {
  // Verify building belongs to company
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.expense.findMany({
    where: {
      buildingId,
      deletedAt: null,
      ...(period ? { period } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createExpense(
  buildingId: string,
  companyId: string,
  data: {
    category: string;
    description: string;
    amount: number;
    period: string;
    invoiceNumber?: string;
    invoiceUrl?: string;
    notes?: string;
  }
) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.expense.create({
    data: { ...data, buildingId } as Parameters<typeof prisma.expense.create>[0]['data'],
  });
}

// Generate charges for all apartments based on expenses of a period
export async function generateCharges(
  buildingId: string,
  companyId: string,
  period: string,
  dueDate: Date
) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  // Check if charges already generated for this period
  const existing = await prisma.charge.count({
    where: {
      apartment: { buildingId },
      period,
      deletedAt: null,
    },
  });
  if (existing > 0) {
    throw new AppError(`Ya existen cargos generados para el período ${period}`, 409, 'CHARGES_EXIST');
  }

  // Get all expenses for the period
  const expenses = await prisma.expense.findMany({
    where: { buildingId, period, deletedAt: null },
  });
  if (expenses.length === 0) {
    throw new AppError('No hay gastos registrados para este período', 400, 'NO_EXPENSES');
  }

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Get apartments with their coefficients
  const apartments = await prisma.apartment.findMany({
    where: { buildingId, deletedAt: null },
  });

  const totalCoefficient = apartments.reduce(
    (sum, a) => sum + Number(a.coefficient),
    0
  );

  if (totalCoefficient === 0) {
    throw new AppError('Los apartamentos no tienen coeficientes configurados', 400, 'NO_COEFFICIENTS');
  }

  // Create charges in a transaction
  const charges = await prisma.$transaction(
    apartments.map((apt) => {
      const share = Number(apt.coefficient) / totalCoefficient;
      const amount = Math.round(totalExpenses * share * 100) / 100;

      return prisma.charge.create({
        data: {
          apartmentId: apt.id,
          description: `Expensas ${period}`,
          amount,
          dueDate,
          period,
          status: 'PENDING',
        },
      });
    })
  );

  return {
    period,
    totalExpenses,
    chargesGenerated: charges.length,
    charges,
  };
}

export async function getDebtSummary(buildingId: string, companyId: string) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const charges = await prisma.charge.findMany({
    where: {
      apartment: { buildingId },
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      deletedAt: null,
    },
    include: {
      apartment: { select: { number: true, floor: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Update interest amounts for overdue charges
  const now = new Date();
  const interestRate = Number(building.interestRate);

  return charges.map((charge) => {
    let interest = Number(charge.interestAmount);
    if (charge.status === 'OVERDUE' || (charge.status === 'PENDING' && charge.dueDate < now)) {
      interest = calculateInterest(Number(charge.amount), interestRate, charge.dueDate, now);
    }
    return {
      ...charge,
      interestAmount: interest,
      totalDebt: Number(charge.amount) + interest,
    };
  });
}

export async function deleteExpense(id: string, companyId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, building: { companyId }, deletedAt: null },
  });
  if (!expense) throw new AppError('Gasto no encontrado', 404, 'NOT_FOUND');

  return prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
}
