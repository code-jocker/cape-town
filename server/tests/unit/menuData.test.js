import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Category } from '../../models/Category.js';
import { MenuItem } from '../../models/MenuItem.js';
import { computeTotals } from '../../services/pricingService.js';
import { CATEGORIES, ITEMS } from '../../seed/data.js';

const expectedVariants = [
  ['chivas-regal-18', 'Bottle', 80000],
  ['chivas-regal-18', 'Shot', 5000],
  ['absolute-vodka', 'Bottle', 60000],
  ['absolute-vodka', 'Shot', 3000],
  ['margherita', 'Medium', 10000],
  ['margherita', 'Large', 12000],
  ['four-season', 'Medium', 12000],
  ['four-season', 'Large', 15000]
];

test('official menu entries satisfy the menu model', () => {
  const categoryId = new mongoose.Types.ObjectId();

  for (const [sortOrder, source] of ITEMS.entries()) {
    const { key, ...fields } = source;
    delete fields.cat;
    const item = new MenuItem({ ...fields, seedKey: key, category: categoryId, sortOrder });
    assert.equal(item.validateSync(), undefined, `${key} should validate`);
    for (const option of item.options) {
      for (const choice of option.choices) {
        assert.ok(choice.extraPrice >= 0, `${key} has a negative option price`);
      }
    }
  }

  for (const [key, size, expectedPrice] of expectedVariants) {
    const source = ITEMS.find((item) => item.key === key);
    const choice = source.options[0].choices.find((entry) => entry.label === size);
    const totals = computeTotals(
      [{ priceSnapshot: source.price, quantity: 1, selectedOptions: [{ choices: [{ extraPrice: choice.extraPrice || 0 }] }] }],
      { taxRate: 0, serviceCharge: 0 }
    );
    assert.equal(totals.total, expectedPrice, `${key} ${size} should cost ${expectedPrice} RWF`);
  }

  assert.equal(CATEGORIES.length, 23);
  assert.equal(ITEMS.length, 110);
  assert.equal(new Category({ name: CATEGORIES[0].name }).validateSync(), undefined);
});