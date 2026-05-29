import { prisma } from '../../prisma/client';

export async function getDashboardStats(companyId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalBuildings,
    totalApartments,
    overdueCharges,
    monthPayments,
    recentPayments,
    delinquentApartments,
    upcomingMaintenance,
  ] = await Promise.all([
    prisma.building.count({ where: { companyId, deletedAt: null, isActive: true } }),

    prisma.apartment.count({
      where: { building: { companyId, deletedAt: null }, deletedAt: null },
    }),

    prisma.charge.aggregate({
      where: {
        apartment: { building: { companyId } },
        status: { in: ['OVERDUE', 'PENDING'] },
        dueDate: { lt: now },
        deletedAt: null,
      },
      _sum: { amount: true, interestAmount: true },
      _count: true,
    }),

    prisma.payment.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        resident: { apartment: { building: { companyId } } },
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.payment.findMany({
      where: {
        resident: { apartment: { building: { companyId } } },
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            firstName: true,
            lastName: true,
            apartment: { select: { number: true, building: { select: { name: true } } } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),

    prisma.apartment.count({
      where: {
        building: { companyId },
        charges: {
          some: {
            status: { in: ['OVERDUE', 'PENDING'] },
            dueDate: { lt: now },
            deletedAt: null,
          },
        },
      },
    }),

    prisma.maintenanceTask.findMany({
      where: {
        building: { companyId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: { gte: now },
        deletedAt: null,
      },
      include: { building: { select: { name: true } } },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    }),
  ]);

  const totalOverdue =
    Number(overdueCharges._sum.amount || 0) + Number(overdueCharges._sum.interestAmount || 0);

  return {
    stats: {
      totalBuildings,
      totalApartments,
      totalOverdue,
      overdueCount: overdueCharges._count,
      monthCollection: Number(monthPayments._sum.amount || 0),
      monthPaymentCount: monthPayments._count,
      delinquentApartments,
    },
    recentPayments,
    upcomingMaintenance,
  };
}

export async function getMonthlyCollectionChart(companyId: string, months = 6) {
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const result = await prisma.payment.aggregate({
      where: {
        resident: { apartment: { building: { companyId } } },
        date: { gte: start, lte: end },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    data.push({
      month: start.toISOString().slice(0, 7),
      label: start.toLocaleString('es-UY', { month: 'short', year: '2-digit' }),
      amount: Number(result._sum.amount || 0),
    });
  }

  return data;
}
