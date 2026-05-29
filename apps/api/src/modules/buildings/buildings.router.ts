import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as buildingsService from './buildings.service';

const router = Router();
router.use(authenticate);

const buildingSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  address: z.string().min(5),
  city: z.string().min(2),
  department: z.string().optional(),
  totalUnits: z.number().int().min(1),
  reserveFund: z.number().min(0).optional(),
  adminFee: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(1).optional(),
  currency: z.enum(['UYU', 'USD']).optional(),
  notes: z.string().optional(),
});

// GET /buildings
router.get('/', asyncHandler(async (req, res) => {
  const data = await buildingsService.getBuildings(req.companyId!);
  res.json({ success: true, data });
}));

// GET /buildings/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const data = await buildingsService.getBuildingById(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// GET /buildings/:id/stats
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const data = await buildingsService.getBuildingStats(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// POST /buildings
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = buildingSchema.parse(req.body);
  const building = await buildingsService.createBuilding(req.companyId!, data);
  res.status(201).json({ success: true, data: building });
}));

// PUT /buildings/:id
router.put('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = buildingSchema.partial().parse(req.body);
  const building = await buildingsService.updateBuilding(req.params.id, req.companyId!, data);
  res.json({ success: true, data: building });
}));

// DELETE /buildings/:id
router.delete('/:id', requireRole('COMPANY_ADMIN'), asyncHandler(async (req, res) => {
  await buildingsService.deleteBuilding(req.params.id, req.companyId!);
  res.json({ success: true, message: 'Edificio eliminado' });
}));

export default router;
