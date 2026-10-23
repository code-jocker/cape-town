import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as reports from '../controllers/reportController.js';

const router = Router();

router.use(requireAuth, requireRole('manager'));

router.get('/sales', reports.sales);
router.get('/top-items', reports.topItems);
router.get('/peak-hours', reports.peakHours);
router.get('/prep-time', reports.prepTime);
router.get('/categories', reports.categories);
router.get('/cancellations', reports.cancellations);
router.get('/staff', reports.staff);
router.get('/export.csv', reports.exportCsv);

export default router;
