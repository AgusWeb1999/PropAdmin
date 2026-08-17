import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

export async function getSettlementsByContract(contractId: string, companyId: string) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: contractId, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');

  return prisma.settlement.findMany({
    where: { rentalContractId: contractId, deletedAt: null },
    orderBy: { period: 'desc' },
  });
}

export async function getSettlementForPdf(id: string, companyId: string) {
  const settlement = await prisma.settlement.findFirst({
    where: { id, rentalContract: { apartment: { building: { companyId } } }, deletedAt: null },
    include: {
      rentalContract: {
        include: {
          apartment: { include: { building: { select: { name: true, address: true, company: { select: { name: true } } } } } },
          ownerResident: { select: { firstName: true, lastName: true } },
          tenantResident: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!settlement) throw new AppError('Liquidación no encontrada', 404, 'NOT_FOUND');
  return settlement;
}

// Genera la liquidación de un contrato para un período: alquiler cobrado - comisión - deducciones = neto al propietario
export async function generateSettlement(
  contractId: string,
  companyId: string,
  period: string,
  deductionsDetail: Array<{ label: string; amount: number }> = [],
  force = false
) {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: contractId, apartment: { building: { companyId } }, deletedAt: null },
  });
  if (!contract) throw new AppError('Contrato no encontrado', 404, 'NOT_FOUND');

  const existing = await prisma.settlement.findFirst({
    where: { rentalContractId: contractId, period, deletedAt: null },
  });
  if (existing) {
    throw new AppError(`Ya existe una liquidación generada para el período ${period}`, 409, 'SETTLEMENT_EXISTS');
  }

  const charge = await prisma.charge.findFirst({
    where: { rentalContractId: contractId, period, deletedAt: null },
  });
  if (!charge) {
    throw new AppError('No hay cargo de alquiler generado para este período', 400, 'NO_CHARGE');
  }

  const rentCollected = Number(charge.paidAmount);
  if (rentCollected === 0 && !force) {
    throw new AppError(
      'Todavía no se cobró nada de este período. Confirmá si querés liquidar en $0 igual.',
      409,
      'NOTHING_COLLECTED'
    );
  }

  const commissionAmount = Math.round(rentCollected * Number(contract.commissionPct) * 100) / 100;
  const totalDeductions = deductionsDetail.reduce((sum, d) => sum + d.amount, 0);
  const netToOwner = Math.round((rentCollected - commissionAmount - totalDeductions) * 100) / 100;

  return prisma.settlement.create({
    data: {
      rentalContractId: contractId,
      chargeId: charge.id,
      period,
      rentAmount: contract.rentAmount,
      rentCollected,
      commissionAmount,
      deductionsDetail,
      netToOwner,
      status: 'PENDING',
    } as Parameters<typeof prisma.settlement.create>[0]['data'],
  });
}

export async function markTransferred(id: string, companyId: string) {
  const settlement = await prisma.settlement.findFirst({
    where: { id, rentalContract: { apartment: { building: { companyId } } }, deletedAt: null },
  });
  if (!settlement) throw new AppError('Liquidación no encontrada', 404, 'NOT_FOUND');
  if (settlement.status === 'TRANSFERRED') {
    throw new AppError('La liquidación ya fue marcada como transferida', 409, 'ALREADY_TRANSFERRED');
  }

  return prisma.settlement.update({
    where: { id },
    data: { status: 'TRANSFERRED', transferredAt: new Date() },
  });
}
