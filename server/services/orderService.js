import { Order, TRANSITIONS, ACTIVE_STATUSES } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { Promo } from '../models/Promo.js';
import { Payment } from '../models/Payment.js';
import { audit } from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { nextOrderNumber } from '../utils/orderNumber.js';
import { computeTotals } from './pricingService.js';
import { getOrCreateOpenSession, touchSession, refreshSessionTotals, closeSession } from './sessionService.js';
import { decrementStockForItems, restoreStockForItems } from './stockService.js';
import { getSettings } from './settingsService.js';
import { emitOrderNew, emitOrderUpdated, emitOrderReady, emitStats } from '../sockets/emitter.js';

/** Which roles may perform which status change.
 *  Manager and Chef can cover waiter duties (serve / mark paid) so the
 *  floor keeps moving even when no waiter has a device handy.
 */
const TRANSITION_ROLES = {
  accepted: ['chef', 'manager'],
  preparing: ['chef', 'manager'],
  ready: ['chef', 'manager'],
  served: ['waiter', 'chef', 'manager'],
  paid: ['waiter', 'chef', 'manager'],
  cancelled: ['chef', 'waiter', 'manager']
};

/** Validate + snapshot incoming order items against the live menu. */
async function buildItemSnapshots(rawItems) {
  const ids = [...new Set(rawItems.map((i) => i.menuItemId))].filter(Boolean);
  const menuItems = await MenuItem.find({ _id: { $in: ids } }).lean();
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const { isItemAvailableNow } = await import('./pricingService.js');
  const snapshots = [];

  for (const raw of rawItems) {
    const item = byId.get(String(raw.menuItemId));
    if (!item) throw new AppError('ITEM_NOT_FOUND', 'One of the ordered items no longer exists', 400);
    if (!isItemAvailableNow(item)) {
      throw new AppError('ITEM_UNAVAILABLE', `“${item.name.en}” is not available right now`, 409);
    }

    const selectedOptions = [];
    for (const sel of raw.selectedOptions || []) {
      const def = (item.options || []).find((o) => o.name === sel.name);
      if (!def) continue; // ignore unknown option groups (never trust client)
      const validChoices = [];
      for (const label of sel.choices || []) {
        const choice = def.choices.find((c) => c.label === label);
        if (choice) {
          validChoices.push({ label: choice.label, extraPrice: choice.extraPrice });
        }
      }
      if (def.required && validChoices.length === 0) {
        throw new AppError('OPTION_REQUIRED', `“${def.name}” is required for “${item.name.en}”`, 422);
      }
      if (!def.multiple && validChoices.length > 1) validChoices.length = 1;
      if (validChoices.length) selectedOptions.push({ name: def.name, choices: validChoices });
    }

    // Any required option group the client never sent must still be rejected.
    for (const def of item.options || []) {
      if (def.required && !selectedOptions.some((s) => s.name === def.name)) {
        throw new AppError('OPTION_REQUIRED', `“${def.name}” is required for “${item.name.en}”`, 422);
      }
    }

    snapshots.push({
      menuItem: item._id,
      nameSnapshot: { en: item.name.en, fr: item.name.fr || item.name.en, rw: item.name.rw || item.name.en },
      priceSnapshot: item.price,
      quantity: raw.quantity,
      selectedOptions,
      note: (raw.note || '').slice(0, 200),
      station: item.station
    });
  }
  return snapshots;
}

/** Validate a promo code and return {promo, discountDoc} or null. */
async function resolvePromo(code) {
  if (!code) return null;
  const promo = await Promo.findOne({ code: String(code).toUpperCase().trim(), isActive: true }).lean();
  if (!promo) throw new AppError('PROMO_INVALID', 'Promo code not recognized', 422);
  const now = new Date();
  if (promo.validFrom && now < promo.validFrom) throw new AppError('PROMO_NOT_ACTIVE', 'Promo code not active yet', 422);
  if (promo.validTo && now > promo.validTo) throw new AppError('PROMO_EXPIRED', 'Promo code has expired', 422);
  if (promo.maxUses > 0 && promo.used >= promo.maxUses) throw new AppError('PROMO_EXHAUSTED', 'Promo code has no uses left', 422);
  return promo;
}

/**
 * Create an order. All pricing/availability decided HERE, never on the client.
 * Idempotent via unique idempotencyKey (double taps / retries return the
 * original order with duplicate: true).
 */
export async function createOrder({ table, payload }) {
  const settings = await getSettings();
  const session = await getOrCreateOpenSession(table._id);

  const snapshots = await buildItemSnapshots(payload.items);
  const promo = await resolvePromo(payload.promoCode);
  const totals = computeTotals(snapshots, settings, promo);
  const orderNumber = await nextOrderNumber();

  const doc = {
    orderNumber,
    table: table._id,
    session: session._id,
    items: snapshots.map(({ _extras, ...s }) => s),
    subtotal: totals.subtotal,
    discount: totals.discount,
    promoCode: promo ? promo.code : '',
    tax: totals.tax,
    serviceCharge: totals.serviceCharge,
    total: totals.total,
    status: 'pending',
    statusHistory: [{ status: 'pending', at: new Date(), by: 'customer', byRole: 'customer' }],
    notes: (payload.notes || '').slice(0, 300),
    idempotencyKey: payload.idempotencyKey
  };

  let order;
  try {
    order = (await Order.create(doc)).toObject();
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: doc.idempotencyKey }).lean();
      if (existing) return { order: existing, duplicate: true, sessionId: session.sessionId };
    }
    throw err;
  }

  if (promo) {
    await Promo.updateOne({ _id: promo._id }, { $inc: { used: 1 } });
  }

  const { TableSession } = await import('../models/TableSession.js');
  await TableSession.updateOne(
    { _id: session._id },
    { $push: { orders: order._id }, $set: { lastActivityAt: new Date() } }
  );

  const compactItems = order.items.map((i) => ({
    n: i.nameSnapshot.en,
    q: i.quantity,
    note: i.note,
    opts: i.selectedOptions.flatMap((o) => o.choices.map((c) => c.label))
  }));
  emitOrderNew({
    id: String(order._id),
    no: order.orderNumber,
    table: table.number,
    items: compactItems,
    total: order.total
  });
  emitStats(await getStats());

  return { order, duplicate: false, sessionId: session.sessionId };
}

/**
 * Apply a status transition with optimistic locking:
 * atomic findOneAndUpdate on current status so two chefs can never
 * double-process the same order.
 */
export async function transitionOrder(orderId, nextStatus, staff, cancelReason = '') {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);

  const current = order.status;
  if (current === nextStatus) return order; // idempotent repeat

  if (!TRANSITIONS[current]?.includes(nextStatus)) {
    throw new AppError('INVALID_TRANSITION', `Cannot move an order from “${current}” to “${nextStatus}”`, 409);
  }
  if (!TRANSITION_ROLES[nextStatus]?.includes(staff.role)) {
    throw new AppError('FORBIDDEN', `Role “${staff.role}” cannot set status “${nextStatus}”`, 403);
  }
  if (nextStatus === 'cancelled' && !String(cancelReason || '').trim()) {
    throw new AppError('CANCEL_REASON_REQUIRED', 'A reason is required to cancel an order', 422);
  }

  // Atomic CAS: only the first transition wins.
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: current },
    {
      $set: {
        status: nextStatus,
        ...(nextStatus === 'cancelled' ? { cancelReason: cancelReason.trim() } : {}),
        ...(nextStatus === 'paid' ? { paymentStatus: 'paid' } : {})
      },
      $push: {
        statusHistory: {
          status: nextStatus,
          at: new Date(),
          by: staff.name,
          byRole: staff.role
        }
      }
    },
    { new: true }
  ).lean();

  if (!updated) {
    throw new AppError('ORDER_ALREADY_UPDATED', 'The order was just updated by someone else — refresh', 409);
  }

  try {
    if (nextStatus === 'accepted') {
      await decrementStockForItems(updated.items);
    }
    if (nextStatus === 'cancelled' && ['accepted', 'preparing'].includes(current)) {
      await restoreStockForItems(updated.items);
    }
  } catch (err) {
    // Stock failure on accept: revert the CAS so the order stays actionable.
    await Order.updateOne(
      { _id: orderId, status: nextStatus },
      { $set: { status: current }, $pull: { statusHistory: { status: nextStatus } } }
    );
    throw err;
  }

  const compact = {
    id: String(updated._id),
    orderId: String(updated._id),
    no: updated.orderNumber,
    status: nextStatus,
    table: updated.table,
    by: staff.name
  };
  emitOrderUpdated(compact);
  if (nextStatus === 'ready') {
    emitOrderReady({ id: String(updated._id), orderId: String(updated._id), no: updated.orderNumber, table: updated.table });
  }
  await audit(staff, `order.${nextStatus}`, 'Order', updated._id, { status: current }, { status: nextStatus, reason: cancelReason });
  emitStats(await getStats());

  return updated;
}

/** Record a payment for a served (or ready) order. */
export async function payOrder(orderId, method, staff) {
  let order = await Order.findById(orderId).lean();
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  if (order.status === 'cancelled') throw new AppError('ORDER_CANCELLED', 'Cannot pay a cancelled order', 409);
  if (order.paymentStatus === 'paid') throw new AppError('ALREADY_PAID', 'Order is already paid', 409);

  if (order.status === 'ready') {
    await transitionOrder(orderId, 'served', staff);
    order = await Order.findById(orderId).lean();
  }
  if (order.status !== 'served') {
    throw new AppError('NOT_SERVED', 'Order must be served before payment', 409);
  }

  await Payment.create({
    session: order.session,
    orders: [order._id],
    amount: order.total,
    method,
    receivedBy: staff.id
  });

  const updated = await transitionOrder(orderId, 'paid', staff);
  await refreshSessionTotals(order.session);
  await audit(staff, 'order.paid', 'Order', orderId, null, { method, amount: order.total });
  return updated;
}

/** Pay every unpaid order in a session in one go (whole-bill payment). */
export async function paySession(sessionId, method, staff) {
  const orders = await Order.find({
    session: sessionId,
    status: { $nin: ['paid', 'cancelled'] }
  })
    .select('_id status')
    .lean();
  if (!orders.length) throw new AppError('NOTHING_TO_PAY', 'No unpaid orders in this session', 409);

  for (const o of orders) {
    if (o.status === 'ready') await transitionOrder(o._id, 'served', staff);
  }
  let amount = 0;
  for (const o of orders) {
    const fresh = await Order.findById(o._id).select('total paymentStatus status').lean();
    if (fresh.paymentStatus === 'paid') continue;
    if (fresh.status !== 'served') {
      // still preparing/pending: payment is recorded but status stays until served
      await Payment.create({
        session: sessionId,
        orders: [o._id],
        amount: fresh.total,
        method,
        receivedBy: staff.id
      });
      await Order.updateOne({ _id: o._id }, { $set: { paymentStatus: 'paid', paymentMethod: method } });
      amount += fresh.total;
      continue;
    }
    await Payment.create({
      session: sessionId,
      orders: [o._id],
      amount: fresh.total,
      method,
      receivedBy: staff.id
    });
    amount += fresh.total;
    await Order.updateOne({ _id: o._id }, { $set: { paymentStatus: 'paid', paymentMethod: method } });
    await transitionOrder(o._id, 'paid', staff);
  }
  const totals = await refreshSessionTotals(sessionId);
  await audit(staff, 'session.paid', 'TableSession', sessionId, null, { method, amount });
  return { amount, ...totals };
}

/** Customer feedback (once per order, only after served). */
export async function addFeedback(orderId, rating, comment) {
  const order = await Order.findById(orderId).select('status feedback').lean();
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  if (!['served', 'paid'].includes(order.status)) {
    throw new AppError('TOO_EARLY', 'Feedback opens after the order is served', 409);
  }
  if (order.feedback?.rating) throw new AppError('FEEDBACK_EXISTS', 'Feedback already submitted', 409);

  await Order.updateOne(
    { _id: orderId },
    { $set: { feedback: { rating, comment: (comment || '').slice(0, 500), createdAt: new Date() } } }
  );
  return { ok: true };
}

/** Live stats snapshot (manager overview + throttled socket updates). */
export async function getStats() {
  const { kigaliDateKey } = await import('../utils/orderNumber.js');
  const todayStart = new Date(`${kigaliDateKey()}T00:00:00+02:00`);

  const [activeOrders, openSessions, salesAgg, prepAgg, openRequests] = await Promise.all([
    Order.countDocuments({ status: { $in: ACTIVE_STATUSES } }),
    (async () => {
      const { TableSession } = await import('../models/TableSession.js');
      return TableSession.countDocuments({ status: 'open' });
    })(),
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 3600_000) } } },
      {
        $addFields: {
          readyEntry: {
            $arrayElemAt: [{ $filter: { input: '$statusHistory', cond: { $eq: ['$$this.status', 'ready'] } } }, 0]
          }
        }
      },
      { $match: { readyEntry: { $ne: null } } },
      { $project: { readyAt: '$readyEntry.at', createdAt: 1 } },
      { $group: { _id: null, avgMin: { $avg: { $divide: [{ $subtract: ['$readyAt', '$createdAt'] }, 60000] } } } }
    ]),
    (async () => {
      const { ServiceRequest } = await import('../models/ServiceRequest.js');
      return ServiceRequest.countDocuments({ status: 'open' });
    })()
  ]);

  return {
    activeOrders,
    tablesInUse: openSessions,
    salesToday: salesAgg[0]?.revenue || 0,
    ordersToday: salesAgg[0]?.count || 0,
    avgPrepMin: Math.round(prepAgg[0]?.avgMin || 0),
    openRequests
  };
}

/** Rough customer-facing ETA from kitchen load + item prep times. */
export async function estimateWaitMinutes() {
  const settings = await getSettings();
  const active = await Order.countDocuments({ status: { $in: ['pending', 'accepted', 'preparing'] } });
  const agg = await MenuItem.aggregate([
    { $match: { isAvailable: true } },
    { $group: { _id: null, maxPrep: { $max: '$prepTimeMinutes' } } }
  ]);
  const base = agg[0]?.maxPrep || 10;
  return Math.min(60, base + active * 2);
}

export const orderHelpers = { closeSession, touchSession };
