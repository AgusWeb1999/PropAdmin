import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as paymentsService from './payments.service';
import { generateReceipt } from '../../utils/pdf';

const router = Router();
router.use(authenticate);

const paymentSchema = z.object({
  residentId: z.string(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK', 'ONLINE', 'OTHER']),
  reference: z.string().optional(),
  date: z.string().datetime(),
  notes: z.string().optional(),
  chargeIds: z.array(z.string()).optional(),
});

// POST /payments
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = paymentSchema.parse(req.body);
  const payment = await paymentsService.registerPayment(req.companyId!, {
    ...data,
    date: new Date(data.date),
  });
  res.status(201).json({ success: true, data: payment });
}));

// GET /payments/resident/:residentId
router.get('/resident/:residentId', asyncHandler(async (req, res) => {
  const data = await paymentsService.getPaymentsByResident(req.params.residentId, req.companyId!);
  res.json({ success: true, data });
}));

// GET /payments/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const { period } = req.query;
  const data = await paymentsService.getPaymentsByBuilding(
    req.params.buildingId,
    req.companyId!,
    period as string | undefined
  );
  res.json({ success: true, data });
}));

// GET /payments/delinquents
router.get('/delinquents', asyncHandler(async (req, res) => {
  const { buildingId } = req.query;
  const data = await paymentsService.getDelinquents(req.companyId!, buildingId as string | undefined);
  res.json({ success: true, data });
}));

// GET /payments/:id/receipt (PDF)
router.get('/:id/receipt', asyncHandler(async (req, res) => {
  const raw = await paymentsService.getReceiptData(req.params.id, req.companyId!);
  // Prisma returns Decimal for amount fields — cast to number for PDF generator
  const data = {
    ...raw,
    amount: Number(raw.amount),
    paymentCharges: raw.paymentCharges.map((pc) => ({
      ...pc,
      amount: Number(pc.amount),
      charge: { ...pc.charge, amount: Number(pc.charge.amount) },
    })),
  };
  const pdf = await generateReceipt(data);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${req.params.id}.pdf"`);
  pdf.pipe(res);
  pdf.end();
}));

export default router;
