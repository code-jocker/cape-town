import { Counter } from '../models/Counter.js';
import { AppError } from './AppError.js';

const PREFIX = 'EP';

/** Current date in the restaurant's timezone (Kigali, UTC+2, no DST). */
export function kigaliDateKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function formatOrderNumber(seq) {
  return `${PREFIX}-${String(seq).padStart(4, '0')}`;
}

/**
 * Atomically reserve the next daily order number (resets every day via Counter $inc).
 */
export async function nextOrderNumber() {
  const key = `orders-${kigaliDateKey()}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  if (!doc?.seq) throw new AppError('ORDER_NUMBER_FAILED', 'Could not generate order number', 500);
  return formatOrderNumber(doc.seq);
}
