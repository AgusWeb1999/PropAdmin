import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

export async function getResidentsByApartment(apartmentId: string, companyId: string) {
  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, building: { companyId }, deletedAt: null },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');

  return prisma.resident.findMany({
    where: { apartmentId, deletedAt: null },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createResident(apartmentId: string, companyId: string, data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  documentId?: string;
  type: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}) {
  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, building: { companyId }, deletedAt: null },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');

  return prisma.resident.create({
    data: { ...data, apartmentId } as Parameters<typeof prisma.resident.create>[0]['data'],
  });
}

export async function updateResident(id: string, companyId: string, data: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentId: string;
  type: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  notes: string;
}>) {
  const resident = await prisma.resident.findFirst({
    where: { id, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!resident) throw new AppError('Residente no encontrado', 404, 'NOT_FOUND');

  return prisma.resident.update({ where: { id }, data: data as Parameters<typeof prisma.resident.update>[0]['data'] });
}

export async function getResidentDebt(id: string, companyId: string) {
  const resident = await prisma.resident.findFirst({
    where: { id, apartment: { building: { companyId } }, deletedAt: null },
    include: {
      apartment: {
        include: {
          building: { select: { name: true, interestRate: true, currency: true } },
          charges: {
            where: {
              status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
              deletedAt: null,
            },
            orderBy: { dueDate: 'asc' },
          },
        },
      },
    },
  });
  if (!resident) throw new AppError('Residente no encontrado', 404, 'NOT_FOUND');
  return resident;
}
