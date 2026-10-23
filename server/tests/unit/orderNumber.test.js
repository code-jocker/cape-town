import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderNumber, kigaliDateKey } from '../../utils/orderNumber.js';

test('formatOrderNumber: pads the daily sequence to four digits', () => {
  assert.equal(formatOrderNumber(1), 'EP-0001');
  assert.equal(formatOrderNumber(42), 'EP-0042');
  assert.equal(formatOrderNumber(1234), 'EP-1234');
  // Sequences beyond four digits keep growing rather than truncating.
  assert.equal(formatOrderNumber(12345), 'EP-12345');
});

test('kigaliDateKey: returns an ISO YYYY-MM-DD string in Kigali time', () => {
  // 22:30 UTC is 00:30 the next day in Kigali (UTC+2).
  const lateUtc = new Date('2026-03-04T22:30:00Z');
  assert.equal(kigaliDateKey(lateUtc), '2026-03-05');

  const midday = new Date('2026-03-04T10:00:00Z');
  assert.equal(kigaliDateKey(midday), '2026-03-04');
});

test('kigaliDateKey: matches YYYY-MM-DD shape', () => {
  assert.match(kigaliDateKey(new Date('2026-01-01T00:00:00Z')), /^\d{4}-\d{2}-\d{2}$/);
});
