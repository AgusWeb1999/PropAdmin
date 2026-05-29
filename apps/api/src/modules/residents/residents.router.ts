import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as residentsService from './residents.service';

const router = Router();
router.use(authenticate);

const residentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  documentId: z.string().optional(),
  type: z.enum(['OWNER', 'TENANT']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// GET /residents/apartment/:apartmentId
router.get('/apartment/:apartmentId', asyncHandler(async (req, res) => {
  const data = await residentsService.getResidentsByApartment(req.params.apartmentId, req.companyId!);
  res.json({ success: true, data });
}));

// GET /residents/:id/debt
router.get('/:id/debt', asyncHandler(async (req, res) => {
  const data = await residentsService.getResidentDebt(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// POST /residents/apartment/:apartmentId
router.post('/apartment/:apartmentId', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = residentSchema.parse(req.body);
  const resident = await residentsService.createResident(req.params.apartmentId, req.companyId!, {
    ...data,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });
  res.status(201).json({ success: true, data: resident });
}));

// PUT /residents/:id
router.put('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = residentSchema.partial().parse(req.body);
  const resident = await residentsService.updateResident(req.params.id, req.companyId!, data as Parameters<typeof residentsService.updateResident>[2]);
  res.json({ success: true, data: resident });
}));

export default router;
