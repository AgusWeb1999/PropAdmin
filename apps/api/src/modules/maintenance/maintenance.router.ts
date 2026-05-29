import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  buildingId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'STRUCTURAL', 'CLEANING', 'ELEVATOR', 'SECURITY', 'GARDEN', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// GET /maintenance/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const building = await prisma.building.findFirst({
    where: { id: req.params.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const tasks = await prisma.maintenanceTask.findMany({
    where: { buildingId: req.params.buildingId, deletedAt: null },
    orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
  });
  res.json({ success: true, data: tasks });
}));

// POST /maintenance
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = taskSchema.parse(req.body);
  const building = await prisma.building.findFirst({
    where: { id: data.buildingId, companyId: req.companyId!, deletedAt: null },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const task = await prisma.maintenanceTask.create({
    data: {
      ...data,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
    } as Parameters<typeof prisma.maintenanceTask.create>[0]['data'],
  });
  res.status(201).json({ success: true, data: task });
}));

// PATCH /maintenance/:id/status
router.patch('/:id/status', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const { status, completedDate, cost } = z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    completedDate: z.string().datetime().optional(),
    cost: z.number().min(0).optional(),
  }).parse(req.body);

  const task = await prisma.maintenanceTask.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(completedDate ? { completedDate: new Date(completedDate) } : {}),
      ...(cost !== undefined ? { cost } : {}),
    },
  });
  res.json({ success: true, data: task });
}));

export default router;
