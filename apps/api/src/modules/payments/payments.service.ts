import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

export async function registerPayment(
  companyId: string,
  data: {
    residentId: string;
    amount: number;
    method: string;
    reference?: string;
    date: Date;
    notes?: string;
    chargeIds?: string[];
  }
) {
  // Verify resident belongs to company
  const resident = await prisma.resident.findFirst({
    where: {
      id: data.residentId,
      apartment: { building: { companyId } },
      deletedAt: null,
    },
    include: {
      apartment: { include: { building: true } },
    },
  });
  if (!resident) throw new AppError('Residente no encontrado', 404, 'NOT_FOUND');

  const { chargeIds = [], ...paymentData } = data;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        residentId: data.residentId,
        amount: data.amount,
        method: data.method as Parameters<typeof tx.payment.create>[0]['data']['method'],
        reference: data.reference,
        date: data.date,
        notes: data.notes,
      },
    });

    // Apply payment to specific charges
    if (chargeIds.length > 0) {
      let remaining = data.amount;

      for (const chargeId of chargeIds) {
        if (remaining <= 0) break;

        const charge = await tx.charge.findUnique({ where: { id: chargeId } });
        if (!charge || charge.status === 'PAID') continue;

        const totalOwed = Number(charge.amount) + Number(charge.interestAmount);
        const alreadyPaid = Number(charge.paidAmount);
        const stillOwed = totalOwed - alreadyPaid;
        if (stillOwed <= 0) continue;

        const applied = Math.min(remaining, stillOwed);
        remaining -= applied;

        const newPaidAmount = alreadyPaid + applied;
        const newStatus = newPaidAmount >= totalOwed ? 'PAID' : 'PARTIAL';

        await Promise.all([
          tx.paymentCharge.create({
            data: { paymentId: payment.id, chargeId, amount: applied },
          }),
          tx.charge.update({
            where: { id: chargeId },
            data: { status: newStatus, paidAmount: newPaidAmount },
          }),
        ]);
      }
    }

    return payment;
  });
}

export async function getPaymentsByResident(residentId: string, companyId: string) {
  // Verify resident belongs to company
  const resident = await prisma.resident.findFirst({
    where: {
      id: residentId,
      apartment: { building: { companyId } },
    },
  });
  if (!resident) throw new AppError('Residente no encontrado', 404, 'NOT_FOUND');

  return prisma.payment.findMany({
    where: { residentId, deletedAt: null },
    include: {
      paymentCharges: {
        include: { charge: { select: { description: true, period: true, amount: true } } },
      },
    },
    orderBy: { date: 'desc' },
  });
}

export async function getPaymentsByBuilding(buildingId: string, companyId: string, period?: string) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.payment.findMany({
    where: {
      deletedAt: null,
      resident: {
        apartment: { buildingId },
        ...(period ? {} : {}),
      },
    },
    include: {
      resident: {
        select: { firstName: true, lastName: true, apartment: { select: { number: true } } },
      },
    },
    orderBy: { date: 'desc' },
    take: 100,
  });
}

export async function getReceiptData(paymentId: string, companyId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      resident: { apartment: { building: { companyId } } },
      deletedAt: null,
    },
    include: {
      resident: {
        include: {
          apartment: {
            include: { building: { include: { company: true } } },
          },
        },
      },
      paymentCharges: {
        include: { charge: true },
      },
    },
  });
  if (!payment) throw new AppError('Pago no encontrado', 404, 'NOT_FOUND');
  return payment;
}

export async function getDelinquents(companyId: string, buildingId?: string) {
  const charges = await prisma.charge.findMany({
    where: {
      status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
      dueDate: { lt: new Date() },
      deletedAt: null,
      apartment: {
        building: {
          companyId,
          ...(buildingId ? { id: buildingId } : {}),
          deletedAt: null,
        },
      },
    },
    include: {
      apartment: {
        select: {
          number: true,
          floor: true,
          buildingId: true,
          building: { select: { name: true } },
          residents: {
            where: { isActive: true, deletedAt: null },
            select: { firstName: true, lastName: true, email: true, phone: true, type: true },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ apartment: { buildingId: 'asc' } }, { dueDate: 'asc' }],
  });

  // Group by apartment
  const grouped = new Map<string, {
    apartmentId: string;
    apartment: (typeof charges)[0]['apartment'];
    charges: typeof charges;
    totalDebt: number;
  }>();

  for (const charge of charges) {
    const key = charge.apartmentId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        apartmentId: key,
        apartment: charge.apartment,
        charges: [],
        totalDebt: 0,
      });
    }
    const entry = grouped.get(key)!;
    entry.charges.push(charge);
    entry.totalDebt += Number(charge.amount) + Number(charge.interestAmount);
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalDebt - a.totalDebt);
}
