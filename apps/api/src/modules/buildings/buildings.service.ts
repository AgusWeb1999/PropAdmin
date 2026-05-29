import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

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
            select: { id: true, amount: true, interestAmount: true, status: true },
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
            select: { description: true, period: true, amount: true, interestAmount: true, status: true, dueDate: true },
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
        amount: Number(c.amount),
        interestAmount: Number(c.interestAmount),
        status: c.status,
        dueDate: c.dueDate,
      })),
    })),
  };
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
