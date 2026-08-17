import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as rentalContractsService from './rental-contracts.service';

const router = Router();
router.use(authenticate);

const contractSchema = z.object({
  ownerResidentId: z.string(),
  tenantResidentId: z.string(),
  rentAmount: z.number().positive(),
  commissionPct: z.number().min(0).max(1),
  currency: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateContractSchema = z.object({
  rentAmount: z.number().positive().optional(),
  commissionPct: z.number().min(0).max(1).optional(),
  currency: z.string().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// GET /rental-contracts
router.get('/', asyncHandler(async (req, res) => {
  const { buildingId } = req.query;
  const data = await rentalContractsService.getAllContracts(req.companyId!, buildingId as string | undefined);
  res.json({ success: true, data });
}));

// GET /rental-contracts/apartment/:apartmentId
router.get('/apartment/:apartmentId', asyncHandler(async (req, res) => {
  const data = await rentalContractsService.getContractsByApartment(req.params.apartmentId, req.companyId!);
  res.json({ success: true, data });
}));

// POST /rental-contracts/apartment/:apartmentId
router.post('/apartment/:apartmentId', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const body = contractSchema.parse(req.body);
  const contract = await rentalContractsService.createContract(req.params.apartmentId, req.companyId!, {
    ...body,
    startDate: new Date(body.startDate),
    endDate: body.endDate ? new Date(body.endDate) : undefined,
  });
  res.status(201).json({ success: true, data: contract });
}));

// GET /rental-contracts/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const data = await rentalContractsService.getContractById(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// PUT /rental-contracts/:id
router.put('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const body = updateContractSchema.parse(req.body);
  const contract = await rentalContractsService.updateContract(req.params.id, req.companyId!, {
    ...body,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
  });
  res.json({ success: true, data: contract });
}));

// POST /rental-contracts/:id/terminate
router.post('/:id/terminate', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const contract = await rentalContractsService.terminateContract(req.params.id, req.companyId!);
  res.json({ success: true, data: contract });
}));

// POST /rental-contracts/:id/generate-charge
router.post('/:id/generate-charge', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const { period, dueDate } = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
    dueDate: z.string().datetime(),
  }).parse(req.body);

  const charge = await rentalContractsService.generateRentCharge(
    req.params.id,
    req.companyId!,
    period,
    new Date(dueDate)
  );
  res.status(201).json({ success: true, data: charge });
}));

// DELETE /rental-contracts/:id
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  await rentalContractsService.deleteContract(req.params.id, req.companyId!);
  res.json({ success: true, message: 'Contrato eliminado' });
}));

export default router;
