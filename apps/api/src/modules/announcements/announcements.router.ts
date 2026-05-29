import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// GET /announcements/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: {
      buildingId: req.params.buildingId,
      building: { companyId: req.companyId! },
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
  });
  res.json({ success: true, data: announcements });
}));

// POST /announcements
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = z.object({
    buildingId: z.string(),
    title: z.string().min(2),
    content: z.string().min(5),
    isImportant: z.boolean().optional(),
    expiresAt: z.string().datetime().optional(),
  }).parse(req.body);

  const building = await prisma.building.findFirst({
    where: { id: data.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const announcement = await prisma.announcement.create({
    data: {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });
  res.status(201).json({ success: true, data: announcement });
}));

// DELETE /announcements/:id
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  await prisma.announcement.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  res.json({ success: true, message: 'Anuncio eliminado' });
}));

export default router;
