import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as settlementsService from './settlements.service';
import { generateSettlementPdf } from '../../utils/pdf';

const router = Router();
router.use(authenticate);

const generateSchema = z.object({
  rentalContractId: z.string(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
  deductionsDetail: z.array(z.object({ label: z.string().min(1), amount: z.number().nonnegative() })).optional(),
  force: z.boolean().optional(),
});

// GET /settlements/contract/:contractId
router.get('/contract/:contractId', asyncHandler(async (req, res) => {
  const data = await settlementsService.getSettlementsByContract(req.params.contractId, req.companyId!);
  res.json({ success: true, data });
}));

// POST /settlements/generate
router.post('/generate', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const body = generateSchema.parse(req.body);
  const settlement = await settlementsService.generateSettlement(
    body.rentalContractId,
    req.companyId!,
    body.period,
    body.deductionsDetail ?? [],
    body.force ?? false
  );
  res.status(201).json({ success: true, data: settlement });
}));

// PATCH /settlements/:id/transfer
router.patch('/:id/transfer', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const settlement = await settlementsService.markTransferred(req.params.id, req.companyId!);
  res.json({ success: true, data: settlement });
}));

// GET /settlements/:id/pdf
router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const settlement = await settlementsService.getSettlementForPdf(req.params.id, req.companyId!);
  const contract = settlement.rentalContract;

  const doc = generateSettlementPdf({
    company: { name: contract.apartment.building.company.name },
    apartment: {
      number: contract.apartment.number,
      building: { name: contract.apartment.building.name, address: contract.apartment.building.address },
    },
    owner: contract.ownerResident,
    tenant: contract.tenantResident,
    period: settlement.period,
    currency: contract.currency,
    rentAmount: Number(settlement.rentAmount),
    rentCollected: Number(settlement.rentCollected),
    commissionPct: Number(contract.commissionPct),
    commissionAmount: Number(settlement.commissionAmount),
    deductionsDetail: (settlement.deductionsDetail as Array<{ label: string; amount: number }>) ?? [],
    netToOwner: Number(settlement.netToOwner),
    status: settlement.status,
    transferredAt: settlement.transferredAt,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="liquidacion_${contract.apartment.number}_${settlement.period}.pdf"`);
  doc.pipe(res);
  doc.end();
}));

export default router;
