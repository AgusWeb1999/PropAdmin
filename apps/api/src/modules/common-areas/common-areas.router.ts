import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

const areaSchema = z.object({
  buildingId: z.string(),
  name: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  pricePerUse: z.number().min(0).default(0),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  rules: z.string().optional(),
});

// GET /common-areas/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const building = await prisma.building.findFirst({
    where: { id: req.params.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const areas = await prisma.commonArea.findMany({
    where: { buildingId: req.params.buildingId, deletedAt: null },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: areas });
}));

// POST /common-areas
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = areaSchema.parse(req.body);

  const building = await prisma.building.findFirst({
    where: { id: data.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const area = await prisma.commonArea.create({
    data: { ...data, pricePerUse: data.pricePerUse },
  });
  res.status(201).json({ success: true, data: area });
}));

// PUT /common-areas/:id
router.put('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = areaSchema.partial().parse(req.body);

  const area = await prisma.commonArea.findFirst({
    where: { id: req.params.id, deletedAt: null, building: { companyId: req.companyId! } },
  });
  if (!area) throw new AppError('Amenidad no encontrada', 404, 'NOT_FOUND');

  const updated = await prisma.commonArea.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ success: true, data: updated });
}));

// DELETE /common-areas/:id
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const area = await prisma.commonArea.findFirst({
    where: { id: req.params.id, deletedAt: null, building: { companyId: req.companyId! } },
  });
  if (!area) throw new AppError('Amenidad no encontrada', 404, 'NOT_FOUND');

  await prisma.commonArea.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), isActive: false },
  });
  res.json({ success: true, message: 'Amenidad eliminada' });
}));

export default router;
