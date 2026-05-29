import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as apartmentsService from './apartments.service';

const router = Router();
router.use(authenticate);

const apartmentSchema = z.object({
  number: z.string().min(1),
  floor: z.string().optional(),
  coefficient: z.number().positive(),
  area: z.number().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  hasParking: z.boolean().optional(),
  hasStorage: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /apartments/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const data = await apartmentsService.getApartments(req.params.buildingId, req.companyId!);
  res.json({ success: true, data });
}));

// GET /apartments/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const data = await apartmentsService.getApartmentById(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// GET /apartments/:id/statement
router.get('/:id/statement', asyncHandler(async (req, res) => {
  const data = await apartmentsService.getApartmentStatement(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// POST /apartments/building/:buildingId
router.post('/building/:buildingId', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = apartmentSchema.parse(req.body);
  const apartment = await apartmentsService.createApartment(req.params.buildingId, req.companyId!, data);
  res.status(201).json({ success: true, data: apartment });
}));

// PUT /apartments/:id
router.put('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = apartmentSchema.partial().parse(req.body);
  const apartment = await apartmentsService.updateApartment(req.params.id, req.companyId!, data);
  res.json({ success: true, data: apartment });
}));

// DELETE /apartments/:id
router.delete('/:id', requireRole('COMPANY_ADMIN'), asyncHandler(async (req, res) => {
  await apartmentsService.deleteApartment(req.params.id, req.companyId!);
  res.json({ success: true, message: 'Apartamento eliminado' });
}));

export default router;
