import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { CATEGORIES, ITEMS } from './data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ITEMS_DIR = path.join(ROOT, 'public', 'uploads', 'items');

async function imageFor(itemKey, categoryKey) {
  for (const key of [itemKey, categoryKey]) {
    const imagePath = path.join(ITEMS_DIR, `${key}.webp`);
    try {
      await fs.access(imagePath);
      const thumbPath = path.join(ITEMS_DIR, `${key}-thumb.webp`);
      try {
        await fs.access(thumbPath);
        return { url: `/uploads/items/${key}.webp`, thumbUrl: `/uploads/items/${key}-thumb.webp` };
      } catch {
        return { url: `/uploads/items/${key}.webp`, thumbUrl: `/uploads/items/${key}.webp` };
      }
    } catch {
      // Try the category image if there is no item image.
    }
  }
  return null;
}

export async function syncMenu() {
  const categoryByKey = new Map();
  const syncedCategoryIds = [];
  const syncedItemIds = [];

  for (const category of CATEGORIES) {
    const { key, ...fields } = category;
    const existing = (await Category.findOne({ key })) || (await Category.findOne({ 'name.en': fields.name.en }));
    const query = existing ? { _id: existing._id } : { key };
    const saved = await Category.findOneAndUpdate(
      query,
      { $set: { ...fields, key, isActive: true } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    categoryByKey.set(key, saved);
    syncedCategoryIds.push(saved._id);
  }

  for (const [sortOrder, source] of ITEMS.entries()) {
    const { cat, key, ...fields } = source;
    const category = categoryByKey.get(cat);
    const existing =
      (await MenuItem.findOne({ seedKey: key })) ||
      (await MenuItem.findOne({ category: category._id, 'name.en': fields.name.en }));
    const query = existing ? { _id: existing._id } : { seedKey: key };
    const image = await imageFor(key, cat);

    const saved = await MenuItem.findOneAndUpdate(
      query,
      {
        $set: {
          ...fields,
          options: fields.options || [],
          seedKey: key,
          category: category._id,
          sortOrder,
          ...(image ? { image } : {})
        }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    syncedItemIds.push(saved._id);
  }

  const archivedItems = await MenuItem.updateMany(
    { _id: { $nin: syncedItemIds }, isAvailable: true },
    { $set: { isAvailable: false } }
  );
  const archivedCategories = await Category.updateMany(
    { _id: { $nin: syncedCategoryIds }, isActive: true },
    { $set: { isActive: false } }
  );

  console.log(
    `Menu sync complete: ${CATEGORIES.length} categories, ${ITEMS.length} items; archived ${archivedItems.modifiedCount} items and ${archivedCategories.modifiedCount} categories.`
  );
  return {
    categories: CATEGORIES.length,
    items: ITEMS.length,
    archivedItems: archivedItems.modifiedCount,
    archivedCategories: archivedCategories.modifiedCount
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(syncMenu)
    .then(() => disconnectDB())
    .catch(async (err) => {
      console.error('Menu sync failed:', err);
      await disconnectDB();
      process.exitCode = 1;
    });
}