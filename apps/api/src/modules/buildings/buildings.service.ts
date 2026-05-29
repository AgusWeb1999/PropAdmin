import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';
import { generateAccountStatement } from '../../utils/pdf';
import { sendDebtNotificationEmail } from '../../utils/email';

export async function getBuildings(companyId: string) {
  return prisma.building.findMany({
    where: { companyId, deletedAt: null },
    include: {
      _count: { select: { apartments: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getBuildingById(id: string, companyId: string) {
  const building = await prisma.building.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      apartments: {
        where: { deletedAt: null },
        include: {
          residents: {
            where: { isActive: true, deletedAt: null },
            select: { id: true, firstName: true, lastName: true, type: true, phone: true, email: true },
          },
          charges: {
            where: { deletedAt: null, status: { not: 'PAID' } },
            select: { id: true, amount: true, interestAmount: true, paidAmount: true, status: true },
          },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      },
      commonAreas: { where: { isActive: true } },
      _count: { select: { apartments: true, expenses: true } },
    },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');
  return building;
}

export async function createBuilding(companyId: string, data: {
  name: string;
  address: string;
  city: string;
  department?: string;
  totalUnits: number;
  reserveFund?: number;
  adminFee?: number;
  interestRate?: number;
  currency?: string;
  notes?: string;
}) {
  return prisma.building.create({
    data: { ...data, companyId },
  });
}

export async function updateBuilding(id: string, companyId: string, data: Partial<{
  name: string;
  address: string;
  city: string;
  department: string;
  totalUnits: number;
  reserveFund: number;
  adminFee: number;
  interestRate: number;
  currency: string;
  isActive: boolean;
  notes: string;
  imageUrl: string;
}>) {
  const building = await prisma.building.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.building.update({ where: { id }, data });
}

export async function deleteBuilding(id: string, companyId: string) {
  const building = await prisma.building.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.building.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getDebtReportData(id: string, companyId: string) {
  const building = await prisma.building.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      apartments: {
        where: { deletedAt: null },
        include: {
          residents: {
            where: { isActive: true, deletedAt: null },
            select: { firstName: true, lastName: true },
            take: 1,
          },
          charges: {
            where: { deletedAt: null, status: { not: 'PAID' } },
            select: { description: true, period: true, amount: true, interestAmount: true, paidAmount: true, status: true, dueDate: true },
            orderBy: { dueDate: 'asc' },
          },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      },
    },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return {
    building: {
      name: building.name,
      address: building.address,
      city: building.city,
      currency: building.currency,
      company: { name: building.company.name },
    },
    apartments: building.apartments.map((a) => ({
      number: a.number,
      floor: a.floor,
      resident: a.residents[0]
        ? `${a.residents[0].firstName} ${a.residents[0].lastName}`
        : null,
      charges: a.charges.map((c) => ({
        description: c.description,
        period: c.period,
        amount: Number(c.amount) + Number(c.interestAmount) - Number(c.paidAmount),
        interestAmount: 0,
        status: c.status,
        dueDate: c.dueDate,
      })),
    })),
  };
}

export async function notifyResidents(id: string, companyId: string): Promise<{ sent: number; skipped: number; errors: number }> {
  const building = await prisma.building.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      apartments: {
        where: { deletedAt: null },
        include: {
          residents: {
            where: { isActive: true, deletedAt: null, email: { not: null } },
            select: { firstName: true, lastName: true, email: true },
            take: 1,
          },
          charges: {
            where: { deletedAt: null, status: { not: 'PAID' } },
            select: { description: true, period: true, amount: true, interestAmount: true, paidAmount: true, status: true, dueDate: true },
            orderBy: { dueDate: 'asc' },
          },
        },
      },
    },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  let sent = 0, skipped = 0, errors = 0;

  for (const apt of building.apartments) {
    const resident = apt.residents[0];
    const pendingCharges = apt.charges.filter(c => c.status !== 'PAID');

    // Skip if no email or no pending charges
    if (!resident?.email || pendingCharges.length === 0) {
      skipped++;
      continue;
    }

    const totalDebt = pendingCharges.reduce(
      (s, c) => s + Number(c.amount) + Number(c.interestAmount) - Number(c.paidAmount), 0
    );

    try {
      // Generate per-apartment statement PDF
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = generateAccountStatement({
          apartment: {
            number: apt.number,
            building: { name: building.name, address: building.address, company: { name: building.company.name } },
            residents: [{ firstName: resident.firstName, lastName: resident.lastName }],
            charges: pendingCharges.map(c => ({
              description: c.description,
              period: c.period,
              amount: Number(c.amount),
              interestAmount: Number(c.interestAmount),
              status: c.status,
              dueDate: c.dueDate,
            })),
          },
        });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
      });

      await sendDebtNotificationEmail({
        to: resident.email,
        residentName: `${resident.firstName} ${resident.lastName}`,
        buildingName: building.name,
        aptNumber: apt.number,
        companyName: building.company.name,
        totalDebt,
        chargeCount: pendingCharges.length,
        currency: building.currency,
        pdfBuffer,
      });

      sent++;
    } catch (err) {
      console.error(`[notify] Error sending to apt ${apt.number}:`, err);
      errors++;
    }
  }

  return { sent, skipped, errors };
}

export async function getBuildingStats(id: string, companyId: string) {
  const building = await prisma.building.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const [totalApartments, occupiedApartments, pendingCharges, overdueCharges] = await Promise.all([
    prisma.apartment.count({ where: { buildingId: id, deletedAt: null } }),
    prisma.apartment.count({ where: { buildingId: id, status: 'OCCUPIED', deletedAt: null } }),
    prisma.charge.aggregate({
      where: { apartment: { buildingId: id }, status: 'PENDING', deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.charge.aggregate({
      where: { apartment: { buildingId: id }, status: 'OVERDUE', deletedAt: null },
      _sum: { amount: true, interestAmount: true },
      _count: true,
    }),
  ]);

  return {
    totalApartments,
    occupiedApartments,
    vacantApartments: totalApartments - occupiedApartments,
    pendingDebt: Number(pendingCharges._sum.amount || 0),
    pendingCount: pendingCharges._count,
    overdueDebt: Number(overdueCharges._sum.amount || 0) + Number(overdueCharges._sum.interestAmount || 0),
    overdueCount: overdueCharges._count,
  };
}
