import { MenuItem } from '../models/MenuItem.js';
import { invalidateMenuCache } from '../middleware/cache.js';
import { emitMenuAvailability } from '../sockets/emitter.js';
import { AppError } from '../utils/AppError.js';

/**
 * Atomically decrement stock for accepted order items.
 * $inc with a stockQty >= qty condition — a concurrent accept cannot oversell.
 * Rolls back partial decrements and throws listing missing items.
 */
export async function decrementStockForItems(items) {
  const tracked = items.filter((it) => it.menuItem && it.trackStock);
  const done = [];
  const failed = [];

  for (const it of tracked) {
    const res = await MenuItem.updateOne(
      { _id: it.menuItem, stockQty: { $gte: it.quantity } },
      { $inc: { stockQty: -it.quantity } }
    );
    if (res.modifiedCount === 1) done.push(it);
    else failed.push(it.nameSnapshot?.en || 'item');
  }

  if (failed.length) {
    for (const it of done) {
      await MenuItem.updateOne({ _id: it.menuItem }, { $inc: { stockQty: it.quantity } });
    }
    throw new AppError('OUT_OF_STOCK', `Not enough stock for: ${failed.join(', ')}`, 409);
  }

  // At zero -> auto mark unavailable and broadcast.
  for (const it of done) {
    const doc = await MenuItem.findById(it.menuItem).select('isAvailable stockQty').lean();
    if (doc && doc.stockQty <= 0 && doc.isAvailable) {
      await MenuItem.updateOne({ _id: it.menuItem }, { $set: { isAvailable: false } });
      invalidateMenuCache();
      emitMenuAvailability({ itemId: String(it.menuItem), isAvailable: false });
    }
  }
}

/** Restore stock after a cancellation (items that were decremented). */
export async function restoreStockForItems(items) {
  for (const it of items) {
    if (!it.menuItem) continue;
    const doc = await MenuItem.findOneAndUpdate(
      { _id: it.menuItem },
      { $inc: { stockQty: it.quantity } },
      { new: true }
    ).select('stockQty isAvailable');
    if (doc && doc.stockQty > 0 && !doc.isAvailable) {
      await MenuItem.updateOne({ _id: it.menuItem }, { $set: { isAvailable: true } });
    }
    invalidateMenuCache();
    emitMenuAvailability({ itemId: String(it.menuItem), isAvailable: true });
  }
}

/** Manual availability toggle (chef/manager). Returns the updated item. */
export async function setItemAvailability(itemId, isAvailable) {
  const item = await MenuItem.findByIdAndUpdate(
    itemId,
    { $set: { isAvailable } },
    { new: true }
  ).lean();
  if (!item) throw new AppError('ITEM_NOT_FOUND', 'Menu item not found', 404);
  invalidateMenuCache();
  emitMenuAvailability({ itemId, isAvailable });
  return item;
}
