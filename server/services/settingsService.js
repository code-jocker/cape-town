import { Settings } from '../models/Settings.js';
import { settingsCache, invalidateSettingsCache } from '../middleware/cache.js';

/** Cached settings loader. */
export async function getSettings() {
  return settingsCache.get(() => Settings.get());
}

export function invalidateSettings() {
  invalidateSettingsCache();
}

/**
 * Is the restaurant open right now, per openingHours, in Kigali time?
 * Returns { open, today, nowMinutes }.
 */
export function isOpenNow(settings, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Kigali',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const dayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
  const today = (settings.openingHours || []).find((h) => h.day === dayIdx) || null;
  if (!today || today.closed) return { open: false, today, nowMinutes: 0 };

  const cur = Number(map.hour) * 60 + Number(map.minute);
  const [oh, om] = (today.open || '00:00').split(':').map(Number);
  const [ch, cm] = (today.close || '23:59').split(':').map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  const isOpen = open <= close ? cur >= open && cur < close : cur >= open || cur < close;
  return { open: isOpen, today, nowMinutes: cur };
}
