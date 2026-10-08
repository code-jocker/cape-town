import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, round, isItemAvailableNow } from '../../services/pricingService.js';

const settings = { taxRate: 0, serviceCharge: 0 };

test('computeTotals: plain subtotal with no promo/tax', () => {
  const items = [
    { priceSnapshot: 4000, quantity: 2, selectedOptions: [] },
    { priceSnapshot: 1500, quantity: 1, selectedOptions: [] }
  ];
  const t = computeTotals(items, settings);
  assert.equal(t.subtotal, 9500);
  assert.equal(t.discount, 0);
  assert.equal(t.tax, 0);
  assert.equal(t.serviceCharge, 0);
  assert.equal(t.total, 9500);
});

test('computeTotals: option extra prices are added per unit', () => {
  const items = [
    {
      priceSnapshot: 3000,
      quantity: 2,
      selectedOptions: [{ choices: [{ extraPrice: 500 }, { extraPrice: 250 }] }]
    }
  ];
  const t = computeTotals(items, settings);
  // (3000 + 750) * 2
  assert.equal(t.subtotal, 7500);
});

test('computeTotals: percent promo discounts then taxes the remainder', () => {
  const items = [{ priceSnapshot: 10000, quantity: 1, selectedOptions: [] }];
  const t = computeTotals(items, { taxRate: 10, serviceCharge: 0 }, { type: 'percent', value: 10 });
  assert.equal(t.discount, 1000);
  assert.equal(t.tax, 900); // 10% of 9000
  assert.equal(t.total, 9900);
});

test('computeTotals: fixed promo cannot exceed subtotal', () => {
  const items = [{ priceSnapshot: 2000, quantity: 1, selectedOptions: [] }];
  const t = computeTotals(items, settings, { type: 'fixed', value: 99999 });
  assert.equal(t.discount, 2000);
  assert.equal(t.total, 0);
});

test('round: rounds to whole RWF', () => {
  assert.equal(round(10.4), 10);
  assert.equal(round(10.5), 11);
});

test('isItemAvailableNow: unavailable flag wins', () => {
  assert.equal(isItemAvailableNow({ isAvailable: false }), false);
});

test('isItemAvailableNow: out of stock when tracked', () => {
  assert.equal(isItemAvailableNow({ isAvailable: true, trackStock: true, stockQty: 0 }), false);
  assert.equal(isItemAvailableNow({ isAvailable: true, trackStock: true, stockQty: 3 }), true);
});

test('isItemAvailableNow: no schedule means always available', () => {
  assert.equal(isItemAvailableNow({ isAvailable: true, availableFrom: '', availableTo: '' }), true);
});

test('isItemAvailableNow: respects a same-day window', () => {
  const noon = new Date('2026-01-01T12:00:00+02:00');
  const item = { isAvailable: true, availableFrom: '10:00', availableTo: '14:00' };
  assert.equal(isItemAvailableNow(item, noon, 'Africa/Kigali'), true);
  const night = new Date('2026-01-01T20:00:00+02:00');
  assert.equal(isItemAvailableNow(item, night, 'Africa/Kigali'), false);
});

test('isItemAvailableNow: window crossing midnight', () => {
  const item = { isAvailable: true, availableFrom: '22:00', availableTo: '02:00' };
  const late = new Date('2026-01-01T23:30:00+02:00');
  const early = new Date('2026-01-01T01:00:00+02:00');
  const midday = new Date('2026-01-01T12:00:00+02:00');
  assert.equal(isItemAvailableNow(item, late, 'Africa/Kigali'), true);
  assert.equal(isItemAvailableNow(item, early, 'Africa/Kigali'), true);
  assert.equal(isItemAvailableNow(item, midday, 'Africa/Kigali'), false);
});
