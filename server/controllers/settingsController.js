import { Settings } from '../models/Settings.js';
import { audit } from '../models/AuditLog.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { getSettings, invalidateSettings } from '../services/settingsService.js';

/** GET /api/settings (manager) */
export const getSettingsRoute = asyncWrap(async (req, res) => {
  res.json({ ok: true, data: await Settings.get() });
});

/** PUT /api/settings (manager) */
export const putSettings = asyncWrap(async (req, res) => {
  const before = await Settings.get();
  const allowed = {};
  for (const key of [
    'name',
    'tagline',
    'location',
    'logo',
    'currency',
    'taxRate',
    'serviceCharge',
    'languages',
    'openingHours',
    'announcement',
    'lateThresholds',
    'autoCloseHours'
  ]) {
    if (key in req.body) allowed[key] = req.body[key];
  }

  await Settings.updateOne({ key: 'main' }, { $set: allowed }, { runValidators: true, upsert: true });
  invalidateSettings();
  await audit(req.staff, 'settings.update', 'Settings', 'main', before, allowed);
  res.json({ ok: true, data: await Settings.get() });
});
