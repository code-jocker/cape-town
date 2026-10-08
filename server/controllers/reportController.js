import {
  salesReport,
  topItemsReport,
  peakHoursReport,
  prepTimeReport,
  categoryRevenue,
  cancellationsReport,
  staffPerformance,
  ordersCsv
} from '../services/reportService.js';
import { asyncWrap } from '../utils/asyncWrap.js';

const ok = (res, data) => res.json({ ok: true, data });

export const sales = asyncWrap(async (req, res) => ok(res, await salesReport(req.query)));
export const topItems = asyncWrap(async (req, res) => ok(res, await topItemsReport(req.query)));
export const peakHours = asyncWrap(async (req, res) => ok(res, await peakHoursReport(req.query)));
export const prepTime = asyncWrap(async (req, res) => ok(res, await prepTimeReport(req.query)));
export const categories = asyncWrap(async (req, res) => ok(res, await categoryRevenue(req.query)));
export const cancellations = asyncWrap(async (req, res) => ok(res, await cancellationsReport(req.query)));
export const staff = asyncWrap(async (req, res) => ok(res, await staffPerformance(req.query)));

export const exportCsv = asyncWrap(async (req, res) => {
  const csv = await ordersCsv(req.query);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="cape-town-k-hotel-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
