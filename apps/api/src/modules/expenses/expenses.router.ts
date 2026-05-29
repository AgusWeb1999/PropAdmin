import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as expensesService from './expenses.service';

const router = Router();
router.use(authenticate);

const expenseSchema = z.object({
  category: z.enum([
    'ELECTRICITY', 'WATER', 'CLEANING', 'ELEVATOR', 'MAINTENANCE',
    'CONCIERGE', 'INSURANCE', 'ADMINISTRATION', 'RESERVE_FUND', 'OTHER',
  ]),
  description: z.string().min(2),
  amount: z.number().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
  invoiceNumber: z.string().optional(),
  invoiceUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

// GET /expenses/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const { period } = req.query;
  const data = await expensesService.getExpenses(
    req.params.buildingId,
    req.companyId!,
    period as string | undefined
  );
  res.json({ success: true, data });
}));

// GET /expenses/building/:buildingId/debt
router.get('/building/:buildingId/debt', asyncHandler(async (req, res) => {
  const data = await expensesService.getDebtSummary(req.params.buildingId, req.companyId!);
  res.json({ success: true, data });
}));

// POST /expenses/building/:buildingId
router.post('/building/:buildingId', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = expenseSchema.parse(req.body);
  const expense = await expensesService.createExpense(req.params.buildingId, req.companyId!, data);
  res.status(201).json({ success: true, data: expense });
}));

// POST /expenses/building/:buildingId/generate-charges
router.post('/building/:buildingId/generate-charges', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const { period, dueDate } = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/),
    dueDate: z.string().datetime(),
  }).parse(req.body);

  const result = await expensesService.generateCharges(
    req.params.buildingId,
    req.companyId!,
    period,
    new Date(dueDate)
  );
  res.status(201).json({ success: true, data: result });
}));

// DELETE /expenses/:id
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  await expensesService.deleteExpense(req.params.id, req.companyId!);
  res.json({ success: true, message: 'Gasto eliminado' });
}));

export default router;
