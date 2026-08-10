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
  hasGrill: z.boolean().optional(),
  status: z.enum(['OCCUPIED', 'VACANT', 'MAINTENANCE']).optional(),
  notes: z.string().optional(),
});

// GET /apartments (all for company, optional ?buildingId=)
router.get('/', asyncHandler(async (req, res) => {
  const data = await apartmentsService.getAllApartments(req.companyId!, req.query.buildingId as string | undefined);
  res.json({ success: true, data });
}));

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

// POST /apartments/building/:buildingId/bulk
router.post('/building/:buildingId/bulk', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const rows = z.array(apartmentSchema).min(1).max(500).parse(req.body);

  const results = await Promise.allSettled(
    rows.map(row => apartmentsService.createApartment(req.params.buildingId, req.companyId!, row))
  );

  const created = results.filter(r => r.status === 'fulfilled').length;
  const errors  = results
    .map((r, i) => r.status === 'rejected'
      ? { row: i + 1, number: rows[i].number, error: (r as PromiseRejectedResult).reason?.message ?? 'Error' }
      : null
    )
    .filter(Boolean);

  res.status(201).json({ success: true, data: { created, errors } });
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
