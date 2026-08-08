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
      ...(from && to ? {
        startDateTime: { gte: new Date(from as string), lte: new Date(to as string) },
      } : {}),
    },
    include: {
      commonArea: { select: { id: true, name: true, icon: true, pricePerUse: true } },
      resident: {
        select: {
          id: true, firstName: true, lastName: true,
          apartment: { select: { id: true, number: true } },
        },
      },
      charge: { select: { id: true, status: true } },
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

  // Validate building belongs to company
  const building = await prisma.building.findFirst({
    where: { id: data.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

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

  // Get cost from common area
  const area = await prisma.commonArea.findFirst({
    where: { id: data.commonAreaId, deletedAt: null },
  });
  if (!area) throw new AppError('Amenidad no encontrada', 404, 'NOT_FOUND');

  const reservation = await prisma.reservation.create({
    data: {
      ...data,
      startDateTime: new Date(data.startDateTime),
      endDateTime: new Date(data.endDateTime),
      totalCost: area.pricePerUse,
    },
    include: {
      commonArea: { select: { id: true, name: true, icon: true, pricePerUse: true } },
      resident: { select: { id: true, firstName: true, lastName: true, apartment: { select: { id: true, number: true } } } },
    },
  });
  res.status(201).json({ success: true, data: reservation });
}));

// PATCH /reservations/:id/status
router.patch('/:id/status', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const { status, cancelReason } = z.object({
    status: z.enum(['CONFIRMED', 'CANCELLED']),
    cancelReason: z.string().optional(),
  }).parse(req.body);

  // Load full reservation with related data
  const reservation = await prisma.reservation.findFirst({
    where: { id: req.params.id, deletedAt: null, building: { companyId: req.companyId! } },
    include: {
      commonArea: true,
      resident: { include: { apartment: true } },
      charge: true,
    },
  });
  if (!reservation) throw new AppError('Reserva no encontrada', 404, 'NOT_FOUND');

  // Already confirmed or cancelled
  if (reservation.status === status) {
    return res.json({ success: true, data: reservation });
  }

  let chargeId = reservation.chargeId;

  // Auto-create charge when confirming a paid amenity
  if (status === 'CONFIRMED' && !reservation.chargeId && Number(reservation.commonArea.pricePerUse) > 0) {
    const dateStr = new Date(reservation.startDateTime).toLocaleDateString('es-UY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const period = new Date(reservation.startDateTime)
      .toISOString().slice(0, 7); // "2026-08"

    // Due date = first day of next month
    const start = new Date(reservation.startDateTime);
    const dueDate = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    const charge = await prisma.charge.create({
      data: {
        apartmentId: reservation.resident.apartmentId,
        description: `Reserva: ${reservation.commonArea.icon ? reservation.commonArea.icon + ' ' : ''}${reservation.commonArea.name} — ${dateStr}`,
        amount: reservation.commonArea.pricePerUse,
        dueDate,
        period,
        status: 'PENDING',
      },
    });
    chargeId = charge.id;
  }

  // Cancel: if there was a pending charge, soft-delete it
  if (status === 'CANCELLED' && reservation.chargeId && reservation.charge?.status === 'PENDING') {
    await prisma.charge.update({
      where: { id: reservation.chargeId },
      data: { deletedAt: new Date() },
    });
    chargeId = null;
  }

  const updated = await prisma.reservation.update({
    where: { id: req.params.id },
    data: { status, cancelReason, chargeId },
    include: {
      commonArea: { select: { id: true, name: true, icon: true, pricePerUse: true } },
      resident: { select: { id: true, firstName: true, lastName: true, apartment: { select: { id: true, number: true } } } },
      charge: { select: { id: true, status: true } },
    },
  });

  res.json({ success: true, data: updated });
}));

// DELETE /reservations/:id  (soft delete, only PENDING)
router.delete('/:id', asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.findFirst({
    where: { id: req.params.id, deletedAt: null, building: { companyId: req.companyId! } },
  });
  if (!reservation) throw new AppError('Reserva no encontrada', 404, 'NOT_FOUND');
  if (reservation.status === 'CONFIRMED') throw new AppError('No se puede eliminar una reserva confirmada', 400, 'INVALID_STATUS');

  await prisma.reservation.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), status: 'CANCELLED' },
  });
  res.json({ success: true, message: 'Reserva eliminada' });
}));

export default router;
