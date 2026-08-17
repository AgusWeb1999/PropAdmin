import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

export async function getAllContracts(companyId: string, buildingId?: string) {
  return prisma.rentalContract.findMany({
    where: {
      deletedAt: null,
      apartment: {
        deletedAt: null,
        building: { companyId, deletedAt: null, ...(buildingId ? { id: buildingId } : {}) },
      },
    },
    include: {
      apartment: {
        select: { number: true, floor: true, building: { select: { id: true, name: true } } },
      },
      ownerResident: { select: { firstName: true, lastName: true } },
      tenantResident: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getContractsByApartment(apartmentId: string, companyId: string) {
  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, building: { companyId }, deletedAt: null },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');

  return prisma.rentalContract.findMany({
    where: { apartmentId, deletedAt: null },
    include: {
      ownerResident: { select: { firstName: true, lastName: true, email: true } },
      tenantResident: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getContractById(id: string, companyId: string) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id, apartment: { building: { companyId } }, deletedAt: null },
    include: {
      apartment: {
        select: { number: true, floor: true, building: { select: { id: true, name: true, currency: true } } },
      },
      ownerResident: { select: { firstName: true, lastName: true, email: true, phone: true } },
      tenantResident: { select: { firstName: true, lastName: true, email: true, phone: true } },
      charges: { where: { deletedAt: null }, orderBy: { dueDate: 'desc' } },
      settlements: { where: { deletedAt: null }, orderBy: { period: 'desc' } },
    },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');
  return contract;
}

export async function createContract(
  apartmentId: string,
  companyId: string,
  data: {
    ownerResidentId: string;
    tenantResidentId: string;
    rentAmount: number;
    commissionPct: number;
    currency?: string;
    startDate: Date;
    endDate?: Date;
    notes?: string;
  }
) {
  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, building: { companyId }, deletedAt: null },
  });
  if (!apartment) throw new AppError('Apartamento no encontrado', 404, 'NOT_FOUND');

  const [owner, tenant] = await Promise.all([
    prisma.resident.findFirst({ where: { id: data.ownerResidentId, apartmentId, deletedAt: null } }),
    prisma.resident.findFirst({ where: { id: data.tenantResidentId, apartmentId, deletedAt: null } }),
  ]);
  if (!owner || owner.type !== 'OWNER') {
    throw new AppError('El propietario debe ser un residente de tipo OWNER de este apartamento', 400, 'INVALID_OWNER');
  }
  if (!tenant || tenant.type !== 'TENANT') {
    throw new AppError('El inquilino debe ser un residente de tipo TENANT de este apartamento', 400, 'INVALID_TENANT');
  }

  const activeContract = await prisma.rentalContract.findFirst({
    where: { apartmentId, status: 'ACTIVE', deletedAt: null },
  });
  if (activeContract) {
    throw new AppError('Ya existe un contrato de alquiler activo para este apartamento', 409, 'CONTRACT_EXISTS');
  }

  return prisma.rentalContract.create({
    data: { ...data, apartmentId } as Parameters<typeof prisma.rentalContract.create>[0]['data'],
  });
}

export async function updateContract(
  id: string,
  companyId: string,
  data: Partial<{
    rentAmount: number;
    commissionPct: number;
    currency: string;
    endDate: Date;
    notes: string;
  }>
) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');

  return prisma.rentalContract.update({
    where: { id },
    data: data as Parameters<typeof prisma.rentalContract.update>[0]['data'],
  });
}

export async function terminateContract(id: string, companyId: string) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');

  return prisma.rentalContract.update({
    where: { id },
    data: { status: 'TERMINATED', endDate: contract.endDate ?? new Date() },
  });
}

export async function deleteContract(id: string, companyId: string) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');

  return prisma.rentalContract.update({ where: { id }, data: { deletedAt: new Date() } });
}

// Generate the monthly rent charge for a contract (mirrors expenses.generateCharges)
export async function generateRentCharge(
  contractId: string,
  companyId: string,
  period: string,
  dueDate: Date
) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: contractId, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');
  if (contract.status !== 'ACTIVE') {
    throw new AppError('El contrato no está activo', 400, 'CONTRACT_NOT_ACTIVE');
  }

  const existing = await prisma.charge.count({
    where: { rentalContractId: contractId, period, deletedAt: null },
  });
  if (existing > 0) {
    throw new AppError(`Ya existe un cargo de alquiler generado para el período ${period}`, 409, 'CHARGE_EXISTS');
  }

  return prisma.charge.create({
    data: {
      apartmentId: contract.apartmentId,
      rentalContractId: contractId,
      description: `Alquiler ${period}`,
      amount: contract.rentAmount,
      dueDate,
      period,
      status: 'PENDING',
    },
  });
}
