import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// GET /reservations/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const building = await prisma.building.findFirst({
    where: { id: req.params.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const reservations = await prisma.reservation.findMany({
    where: {
      buildingId: req.params.buildingId,
      deletedAt: null,
      ...(from && to ? { startDateTime: { gte: new Date(from as string), lte: new Date(to as string) } } : {}),
    },
    include: {
      commonArea: { select: { name: true } },
      resident: { select: { firstName: true, lastName: true, apartment: { select: { number: true } } } },
    },
    orderBy: { startDateTime: 'asc' },
  });
  res.json({ success: true, data: reservations });
}));

// POST /reservations
router.post('/', asyncHandler(async (req, res) => {
  const data = z.object({
    buildingId: z.string(),
    commonAreaId: z.string(),
    residentId: z.string(),
    startDateTime: z.string().datetime(),
    endDateTime: z.string().datetime(),
    notes: z.string().optional(),
  }).parse(req.body);

  // Check for conflicts
  const conflict = await prisma.reservation.findFirst({
    where: {
      commonAreaId: data.commonAreaId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      deletedAt: null,
      OR: [
        { startDateTime: { lt: new Date(data.endDateTime), gte: new Date(data.startDateTime) } },
        { endDateTime: { gt: new Date(data.startDateTime), lte: new Date(data.endDateTime) } },
      ],
    },
  });
  if (conflict) throw new AppError('El horario ya está reservado', 409, 'SLOT_TAKEN');

  const reservation = await prisma.reservation.create({
    data: {
      ...data,
      startDateTime: new Date(data.startDateTime),
      endDateTime: new Date(data.endDateTime),
    },
  });
  res.status(201).json({ success: true, data: reservation });
}));

// PATCH /reservations/:id/status
router.patch('/:id/status', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const { status } = z.object({
    status: z.enum(['CONFIRMED', 'CANCELLED']),
    cancelReason: z.string().optional(),
  }).parse(req.body);

  const reservation = await prisma.reservation.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json({ success: true, data: reservation });
}));

export default router;
