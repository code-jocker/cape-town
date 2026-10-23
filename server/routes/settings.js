import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getSettingsRoute, putSettings } from '../controllers/settingsController.js';
import { listAuditLogs } from '../controllers/auditController.js';

const router = Router();

const hoursEntry = z.object({
  day: z.number().int().min(0).max(6),
  label: z.string().max(20).optional().default(''),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('10:00'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('23:00'),
  closed: z.boolean().default(false)
});

const settingsSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  tagline: z.string().max(40).optional(),
  location: z.string().max(80).optional(),
  logo: z.string().max(300).optional(),
  currency: z.string().min(1).max(8).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  serviceCharge: z.number().min(0).max(100).optional(),
  languages: z.array(z.enum(['en', 'fr', 'rw'])).min(1).max(3).optional(),
  openingHours: z.array(hoursEntry).length(7).optional(),
  announcement: z.string().max(200).optional(),
  lateThresholds: z
    .object({ warnMin: z.number().int().min(1).max(120), lateMin: z.number().int().min(2).max(240) })
    .optional(),
  autoCloseHours: z.number().min(1).max(48).optional()
});

// Any signed-in staff may read restaurant settings (kitchen needs the late
// thresholds); only managers may change them.
router.get('/settings', requireAuth, getSettingsRoute);
router.put('/settings', requireAuth, requireRole('manager'), validate(settingsSchema), putSettings);
router.get('/audit-logs', requireAuth, requireRole('manager'), listAuditLogs);

export default router;
