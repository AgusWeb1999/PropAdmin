import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as dashboardService from './dashboard.service';

const router = Router();
router.use(authenticate);

// GET /dashboard/stats
router.get('/stats', asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardStats(req.companyId!);
  res.json({ success: true, data });
}));

// GET /dashboard/chart/collection
router.get('/chart/collection', asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months as string) || 6;
  const data = await dashboardService.getMonthlyCollectionChart(req.companyId!, months);
  res.json({ success: true, data });
}));

export default router;
