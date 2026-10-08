import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';
import { ServiceRequest } from '../models/ServiceRequest.js';
import { Table } from '../models/Table.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { menuCache } from '../middleware/cache.js';
import { getSettings, isOpenNow } from '../services/settingsService.js';
import { createOrder, addFeedback, estimateWaitMinutes } from '../services/orderService.js';
import { getOrCreateOpenSession, findSessionByPublicId, refreshSessionTotals } from '../services/sessionService.js';
import { orderLimiter, requestLimiter } from '../middleware/rateLimit.js';

const LANGS = ['en', 'fr', 'rw'];
const pickLang = (q) => (LANGS.includes(q) ? q : 'en');

/** GET /api/public/menu?lang=en — cached categories + available items. */
export const getMenu = asyncWrap(async (req, res) => {
  const lang = pickLang(req.query.lang);
  const data = await menuCache.get(async () => {
    const [categories, items, settings] = await Promise.all([
      Category.find({ isActive: true }).sort({ sortOrder: 1 }).select('name sortOrder').lean(),
      MenuItem.find({ isAvailable: true })
        .sort({ sortOrder: 1 })
        .select('name description price category image tags allergens station options isAvailable availableFrom availableTo prepTimeMinutes trackStock stockQty lowStockThreshold')
        .lean(),
      getSettings()
    ]);
    return { categories, items, settings };
  });

  const open = isOpenNow(data.settings);
  const stockVisible = data.items.filter((it) => (it.trackStock ? it.stockQty > 0 : true));

  // schedule filtering is cheap and synchronous via pricingService
  const { isItemAvailableNow } = await import('../services/pricingService.js');
  const finalItems = stockVisible.filter((it) => isItemAvailableNow(it));

  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.json({
    ok: true,
    data: {
      lang,
      categories: data.categories,
      items: finalItems.map(stripStock),
      restaurant: {
        name: data.settings.name,
        tagline: data.settings.tagline,
        location: data.settings.location,
        currency: data.settings.currency
      },
      announcement: data.settings.announcement || '',
      openingHours: data.settings.openingHours,
      openNow: open.open,
      etaMinutes: await estimateWaitMinutes()
    }
  });
});

function stripStock(it) {
  // Never leak internal counters; only a boolean the UI needs.
  return { ...it, trackStock: undefined, stockQty: undefined, lowStockThreshold: undefined };
}

/** GET /api/public/table/:token — validate token, table info. */
export const getTableByToken = asyncWrap(async (req, res) => {
  // req.table already resolved by requireTable middleware
  const settings = await getSettings();
  const session = await getOrCreateOpenSession(req.table._id);
  res.json({
    ok: true,
    data: {
      table: { id: req.table._id, number: req.table.number, label: req.table.label },
      sessionId: session.sessionId,
      restaurant: {
        name: settings.name,
        tagline: settings.tagline,
        location: settings.location,
        currency: settings.currency,
        logo: settings.logo
      }
    }
  });
});

/** POST /api/public/orders — create order (idempotencyKey required). */
export const postOrder = [
  orderLimiter,
  asyncWrap(async (req, res) => {
    const { order, duplicate, sessionId } = await createOrder({
      table: req.table,
      payload: req.body
    });
    res.status(duplicate ? 200 : 201).json({
      ok: true,
      data: {
        duplicate,
        order: publicOrderView(order, req.query.lang),
        sessionId,
        etaMinutes: await estimateWaitMinutes()
      }
    });
  })
];

function publicOrderView(order, lang = 'en') {
  const i = ['en', 'fr', 'rw'].includes(lang) ? lang : 'en';
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    table: order.table,
    items: order.items.map((it) => ({
      name: it.nameSnapshot[i] || it.nameSnapshot.en,
      quantity: it.quantity,
      selectedOptions: it.selectedOptions,
      note: it.note,
      price: it.priceSnapshot
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    serviceCharge: order.serviceCharge,
    total: order.total,
    paymentStatus: order.paymentStatus,
    feedback: order.feedback || null,
    createdAt: order.createdAt,
    statusHistory: order.statusHistory
  };
}

/** GET /api/public/orders/:id — order status (session-checked). */
export const getOrderStatus = asyncWrap(async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  await assertSessionAccess(order, req.query.sid);
  res.json({ ok: true, data: publicOrderView(order, req.query.lang) });
});

/** GET /api/public/session/orders — orders of the current session. */
export const getSessionOrders = asyncWrap(async (req, res) => {
  const session = await findSessionByPublicId(req.query.sid);
  if (!session || String(session.table) !== String(req.table._id)) {
    return res.json({ ok: true, data: { orders: [], sessionId: null, total: 0, paymentStatus: 'unpaid' } });
  }
  const orders = await Order.find({ session: session._id }).sort({ createdAt: 1 }).lean();
  const totals = await refreshSessionTotals(session._id);
  res.json({
    ok: true,
    data: {
      sessionId: session.sessionId,
      status: session.status,
      orders: orders.map((o) => publicOrderView(o, req.query.lang)),
      total: totals.totalAmount,
      paymentStatus: totals.paymentStatus
    }
  });
});

async function assertSessionAccess(order, sid) {
  const { TableSession } = await import('../models/TableSession.js');
  const session = await TableSession.findById(order.session).lean();
  if (!session || session.sessionId !== String(sid || '')) {
    throw new AppError('SESSION_MISMATCH', 'This order belongs to another session', 403);
  }
  return session;
}

/** POST /api/public/requests — waiter/bill/water request. */
export const postRequest = [
  requestLimiter,
  asyncWrap(async (req, res) => {
    const session = await getOrCreateOpenSession(req.table._id);
    const request = await ServiceRequest.create({
      table: req.table._id,
      session: session._id,
      type: req.body.type
    });
    const { emitRequestNew } = await import('../sockets/emitter.js');
    emitRequestNew({
      id: String(request._id),
      table: req.table.number,
      type: request.type
    });
    res.status(201).json({ ok: true, data: { id: request._id, type: request.type, status: request.status } });
  })
];

/** POST /api/public/orders/:id/feedback — rating + comment. */
export const postFeedback = asyncWrap(async (req, res) => {
  const order = await Order.findById(req.params.id).select('session').lean();
  if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  await assertSessionAccess(order, req.body.sid);
  await addFeedback(req.params.id, req.body.rating, req.body.comment);
  res.json({ ok: true, data: null });
});

/** GET /api/public/bill/:sessionId — itemized session bill (customer or print). */
export const getBill = asyncWrap(async (req, res) => {
  const session = await findSessionByPublicId(req.params.sessionId);
  if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found', 404);
  const [table, orders, settings] = await Promise.all([
    Table.findById(session.table).select('number label').lean(),
    Order.find({ session: session._id, status: { $ne: 'cancelled' } }).sort({ createdAt: 1 }).lean(),
    getSettings()
  ]);
  const totals = await refreshSessionTotals(session._id);
  res.json({
    ok: true,
    data: {
      table,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      status: session.status,
      paymentStatus: totals.paymentStatus,
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        items: o.items.map((i) => ({ name: i.nameSnapshot.en, quantity: i.quantity, price: i.priceSnapshot, selectedOptions: i.selectedOptions })),
        total: o.total,
        status: o.status
      })),
      totals: {
        subtotal: orders.reduce((s, o) => s + o.subtotal, 0),
        discount: orders.reduce((s, o) => s + o.discount, 0),
        tax: orders.reduce((s, o) => s + o.tax, 0),
        serviceCharge: orders.reduce((s, o) => s + o.serviceCharge, 0),
        total: totals.totalAmount
      },
      restaurant: {
        name: settings.name,
        location: settings.location,
        currency: settings.currency
      }
    }
  });
});
