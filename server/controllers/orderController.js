import { Order, ACTIVE_STATUSES } from '../models/Order.js';
import { Table } from '../models/Table.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { transitionOrder, payOrder, getStats } from '../services/orderService.js';
import { audit } from '../models/AuditLog.js';

const PAGE_MAX = 100;

/** GET /api/orders?status=&table=&from=&to=&page=&limit= — staff list. */
export const listOrders = asyncWrap(async (req, res) => {
  const { status, table, from, to } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(req.query.limit, 10) || 25));

  const filter = {};
  if (status === 'active') filter.status = { $in: ACTIVE_STATUSES };
  else if (status && status !== 'all') {
    filter.status = status;
  }
  if (table) filter.table = table;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00+02:00`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59+02:00`);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('table', 'number')
      .lean(),
    Order.countDocuments(filter)
  ]);

  res.json({
    ok: true,
    data: {
      orders,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total
    }
  });
});

/** GET /api/orders/:id */
export const getOrder = asyncWrap(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('table', 'number label').lean();
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  res.json({ ok: true, data: order });
});

/** PATCH /api/orders/:id/status — chef, waiter, manager. */
export const patchStatus = asyncWrap(async (req, res) => {
  const order = await transitionOrder(req.params.id, req.body.status, req.staff, req.body.reason || '');
  res.json({ ok: true, data: order });
});

/** PATCH /api/orders/:id — manager: edit notes (items edits go through cancel+reorder). */
export const patchOrder = asyncWrap(async (req, res) => {
  const before = await Order.findById(req.params.id).lean();
  if (!before) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  if (['paid', 'cancelled'].includes(before.status)) {
    throw new AppError('ORDER_LOCKED', 'Paid or cancelled orders cannot be edited', 409);
  }
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: { notes: String(req.body.notes || '').slice(0, 300) } },
    { new: true }
  ).lean();
  await audit(req.staff, 'order.edit', 'Order', req.params.id, { notes: before.notes }, { notes: order.notes });
  res.json({ ok: true, data: order });
});

/** POST /api/orders/:id/cancel — reason required. */
export const cancelOrder = asyncWrap(async (req, res) => {
  const order = await transitionOrder(req.params.id, 'cancelled', req.staff, req.body.reason);
  res.json({ ok: true, data: order });
});

/** POST /api/orders/:id/pay — waiter, manager. */
export const pay = asyncWrap(async (req, res) => {
  const order = await payOrder(req.params.id, req.body.method, req.staff);
  res.json({ ok: true, data: order });
});

/** GET /api/orders/stats/live — overview snapshot (manager). */
export const liveStats = asyncWrap(async (req, res) => {
  res.json({ ok: true, data: await getStats() });
});
