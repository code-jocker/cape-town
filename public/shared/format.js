/**
 * Formatting helpers — currency and dates in the restaurant's locale.
 * Currency format per spec: "RWF 1,500" (prefix, thousands separator, no decimals).
 */

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function money(amount, currency = 'RWF') {
  return `${currency} ${nf.format(Math.round(Number(amount) || 0))}`;
}

export function num(n) {
  return nf.format(Number(n) || 0);
}

/** "14:35" style time in Kigali. */
export function timeHM(date = new Date(), tz = 'Africa/Kigali') {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date(date));
}

/** "Mon 7 Oct" style date. */
export function dateShort(date = new Date(), tz = 'Africa/Kigali') {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(new Date(date));
}

/** "Mon 7 Oct, 14:35". */
export function dateTime(date = new Date(), tz = 'Africa/Kigali') {
  return `${dateShort(date, tz)}, ${timeHM(date, tz)}`;
}

/** Compact relative time for timers: "3m 20s", "1h 05m". */
export function elapsed(from, to = Date.now()) {
  let s = Math.max(0, Math.floor((to - new Date(from).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
