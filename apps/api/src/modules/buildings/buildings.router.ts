import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as buildingsService from './buildings.service';
import { generateDebtReport } from '../../utils/pdf';

const router = Router();
router.use(authenticate);

const buildingSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  address: z.string().min(5),
  city: z.string().min(2),
  department: z.string().optional(),
  type: z.enum(['EDIFICIO', 'COMPLEJO', 'CASA']).optional(),
  totalUnits: z.number().int().min(1),
  reserveFund: z.number().min(0).optional(),
  adminFee: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(1).optional(),
  currency: z.enum(['UYU', 'USD']).optional(),
  notes: z.string().optional(),
});

// GET /buildings
router.get('/', asyncHandler(async (req, res) => {
  const data = await buildingsService.getBuildings(req.companyId!);
  res.json({ success: true, data });
}));

// GET /buildings/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const data = await buildingsService.getBuildingById(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// GET /buildings/:id/stats
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const data = await buildingsService.getBuildingStats(req.params.id, req.companyId!);
  res.json({ success: true, data });
}));

// GET /buildings/:id/debt-report  → PDF download
router.get('/:id/debt-report', asyncHandler(async (req, res) => {
  const data = await buildingsService.getDebtReportData(req.params.id, req.companyId!);
  const safeFilename = data.building.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="deudas_${safeFilename}_${dateStr}.pdf"`);
  const doc = generateDebtReport(data);
  doc.pipe(res);
  doc.end();
}));

// POST /buildings/:id/notify-residents  → send debt emails to all residents
// Responde de inmediato; el envío ocurre en segundo plano para no colgar el browser.
router.post('/:id/notify-residents', asyncHandler(async (req, res) => {
  const buildingId = req.params.id;
  const companyId  = req.companyId!;

  // Responder antes de que empiece el envío
  res.json({ success: true, data: { queued: true, message: 'Notificaciones enviándose en segundo plano' } });

  // Fire-and-forget: no await, errores van al log
  buildingsService.notifyResidents(buildingId, companyId)
    .then(r => console.log(`[notify-residents] background done:`, r))
    .catch(e => console.error(`[notify-residents] background error:`, e));
}));

// POST /buildings
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = buildingSchema.parse(req.body);
  const building = await buildingsService.createBuilding(req.companyId!, data);
  res.status(201).json({ success: true, data: building });
}));

// POST /buildings/bulk  — carga masiva desde CSV
router.post('/bulk', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const rows = z.array(buildingSchema).min(1).max(500).parse(req.body);

  const results = await Promise.allSettled(
    rows.map(row => buildingsService.createBuilding(req.companyId!, row))
  );

  const created = results.filter(r => r.status === 'fulfilled').length;
  const errors  = results
    .map((r, i) => r.status === 'rejected'
      ? { row: i + 1, name: rows[i].name, error: (r as PromiseRejectedResult).reason?.message ?? 'Error' }
      : null
    )
    .filter(Boolean);

  res.status(201).json({ success: true, data: { created, errors } });
}));

// PUT /buildings/:id
router.put('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = buildingSchema.partial().parse(req.body);
  const building = await buildingsService.updateBuilding(req.params.id, req.companyId!, data);
  res.json({ success: true, data: building });
}));

// DELETE /buildings/:id
router.delete('/:id', requireRole('COMPANY_ADMIN'), asyncHandler(async (req, res) => {
  await buildingsService.deleteBuilding(req.params.id, req.companyId!);
  res.json({ success: true, message: 'Edificio eliminado' });
}));

export default router;
