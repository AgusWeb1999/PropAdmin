import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

export async function getApartments(buildingId: string, companyId: string) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.apartment.findMany({
    where: { buildingId, deletedAt: null },
    include: {
      residents: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, firstName: true, lastName: true, type: true, phone: true, email: true },
      },
      charges: {
        where: { status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] }, deletedAt: null },
        select: { id: true, amount: true, interestAmount: true, status: true, dueDate: true },
      },
    },
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
  });
}

export async function getApartmentById(id: string, companyId: string) {
  const apartment = await prisma.apartment.findFirst({
    where: { id, building: { companyId }, deletedAt: null },
    include: {
      building: { select: { id: true, name: true, interestRate: true, currency: true } },
      residents: {
        where: { deletedAt: null },
        select: {
          id: true, firstName: true, lastName: true, type: true,
          phone: true, email: true, isActive: true, startDate: true, endDate: true,
        },
      },
      charges: {
        where: { deletedAt: null },
        orderBy: { dueDate: 'desc' },
        take: 24,
      },
    },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');
  return apartment;
}

export async function createApartment(buildingId: string, companyId: string, data: {
  number: string;
  floor?: string;
  coefficient: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasParking?: boolean;
  hasStorage?: boolean;
  notes?: string;
}) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, companyId, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  return prisma.apartment.create({ data: { ...data, buildingId } });
}

export async function updateApartment(id: string, companyId: string, data: Partial<{
  number: string;
  floor: string;
  coefficient: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  hasParking: boolean;
  hasStorage: boolean;
  status: string;
  notes: string;
}>) {
  const apartment = await prisma.apartment.findFirst({
    where: { id, building: { companyId }, deletedAt: null },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');

  return prisma.apartment.update({ where: { id }, data: data as Parameters<typeof prisma.apartment.update>[0]['data'] });
}

export async function deleteApartment(id: string, companyId: string) {
  const apartment = await prisma.apartment.findFirst({
    where: { id, building: { companyId }, deletedAt: null },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');

  return prisma.apartment.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getApartmentStatement(id: string, companyId: string) {
  const apartment = await prisma.apartment.findFirst({
    where: { id, building: { companyId }, deletedAt: null },
    include: {
      building: { select: { name: true, address: true, company: { select: { name: true } } } },
      residents: { where: { isActive: true }, take: 1 },
      charges: {
        where: { deletedAt: null },
        include: {
          paymentCharges: { include: { payment: true } },
        },
        orderBy: { dueDate: 'desc' },
        take: 12,
      },
    },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');
  return apartment;
}
