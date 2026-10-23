import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { audit } from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { invalidateMenuCache } from '../middleware/cache.js';
import { setItemAvailability } from '../services/stockService.js';

/** GET /api/menu/items — staff view (includes unavailable + stock). */
export const listItems = asyncWrap(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  const items = await MenuItem.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate('category', 'name')
    .lean();
  res.json({ ok: true, data: items });
});

/** GET /api/menu/categories */
export const listCategories = asyncWrap(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  res.json({ ok: true, data: categories });
});

const touchMenu = () => invalidateMenuCache();

/** POST /api/menu/categories (manager) */
export const createCategory = asyncWrap(async (req, res) => {
  const cat = await Category.create(req.body);
  touchMenu();
  await audit(req.staff, 'category.create', 'Category', cat._id, null, req.body);
  res.status(201).json({ ok: true, data: cat });
});

/** PATCH /api/menu/categories/:id (manager) */
export const updateCategory = asyncWrap(async (req, res) => {
  const before = await Category.findById(req.params.id).lean();
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) throw new AppError('CATEGORY_NOT_FOUND', 'Category not found', 404);
  touchMenu();
  await audit(req.staff, 'category.update', 'Category', cat._id, before, req.body);
  res.json({ ok: true, data: cat });
});

/** DELETE /api/menu/categories/:id (manager) — blocked while items exist. */
export const deleteCategory = asyncWrap(async (req, res) => {
  const count = await MenuItem.countDocuments({ category: req.params.id });
  if (count > 0) {
    throw new AppError('CATEGORY_NOT_EMPTY', 'Move or delete the items in this category first', 409);
  }
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw new AppError('CATEGORY_NOT_FOUND', 'Category not found', 404);
  touchMenu();
  await audit(req.staff, 'category.delete', 'Category', req.params.id, cat, null);
  res.json({ ok: true, data: null });
});

/** POST /api/menu/items (manager) */
export const createItem = asyncWrap(async (req, res) => {
  const item = await MenuItem.create(req.body);
  touchMenu();
  await audit(req.staff, 'item.create', 'MenuItem', item._id, null, req.body);
  res.status(201).json({ ok: true, data: item });
});

/** PATCH /api/menu/items/:id (manager) */
export const updateItem = asyncWrap(async (req, res) => {
  const before = await MenuItem.findById(req.params.id).lean();
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw new AppError('ITEM_NOT_FOUND', 'Menu item not found', 404);
  touchMenu();
  await audit(req.staff, 'item.update', 'MenuItem', item._id, before, req.body);
  res.json({ ok: true, data: item });
});

/** DELETE /api/menu/items/:id (manager) */
export const deleteItem = asyncWrap(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('ITEM_NOT_FOUND', 'Menu item not found', 404);
  touchMenu();
  await audit(req.staff, 'item.delete', 'MenuItem', req.params.id, item, null);
  res.json({ ok: true, data: null });
});

/** PATCH /api/menu/items/:id/availability (chef, manager) — broadcast live. */
export const patchAvailability = asyncWrap(async (req, res) => {
  const item = await setItemAvailability(req.params.id, Boolean(req.body.isAvailable));
  await audit(req.staff, 'item.availability', 'MenuItem', req.params.id, null, { isAvailable: item.isAvailable });
  res.json({ ok: true, data: item });
});

/** POST /api/menu/reorder (manager) — { type: 'categories'|'items', ids: [...] } */
export const reorder = asyncWrap(async (req, res) => {
  const { type, ids } = req.body;
  const Model = type === 'categories' ? Category : MenuItem;
  const ops = ids.map((id, i) => ({
    updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i + 1 } } }
  }));
  await Model.bulkWrite(ops);
  touchMenu();
  await audit(req.staff, `${type}.reorder`, type === 'categories' ? 'Category' : 'MenuItem', null, null, ids);
  res.json({ ok: true, data: null });
});
