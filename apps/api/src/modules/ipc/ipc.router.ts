import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

const ipcSchema = z.object({
  year:  z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  value: z.number().min(-1).max(1), // ej: 0.008 = 0.8%
});

// GET /ipc — todos los índices de la empresa, ordenados desc
router.get('/', asyncHandler(async (req, res) => {
  const indexes = await prisma.ipcIndex.findMany({
    where: { companyId: req.companyId! },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  res.json({ success: true, data: indexes });
}));

// POST /ipc — agregar o actualizar índice de un mes
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const { year, month, value } = ipcSchema.parse(req.body);

  const index = await prisma.ipcIndex.upsert({
    where: { companyId_year_month: { companyId: req.companyId!, year, month } },
    create: { companyId: req.companyId!, year, month, value },
    update: { value },
  });

  res.status(201).json({ success: true, data: index });
}));

// DELETE /ipc/:id — eliminar un índice
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const index = await prisma.ipcIndex.findFirst({
    where: { id: req.params.id, companyId: req.companyId! },
  });
  if (!index) throw new AppError('Índice no encontrado', 404, 'NOT_FOUND');

  await prisma.ipcIndex.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

export default router;
