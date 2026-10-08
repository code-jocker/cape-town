import { Order } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { Category } from '../models/Category.js';
import { kigaliDateKey } from '../utils/orderNumber.js';

const TZ = 'Africa/Kigali';

function range({ from, to }) {
  const start = from ? new Date(`${from}T00:00:00+02:00`) : new Date(Date.now() - 7 * 86400_000);
  const end = to ? new Date(`${to}T23:59:59+02:00`) : new Date();
  return { start, end };
}

/** Sales grouped by day/week/month. */
export async function salesReport({ from, to, group = 'day' }) {
  const { start, end } = range({ from, to });
  const fmts = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m' };
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: fmts[group] || fmts.day, date: '$createdAt', timezone: TZ } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
        tax: { $sum: '$tax' },
        service: { $sum: '$serviceCharge' },
        discounts: { $sum: '$discount' }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: '$_id', orders: 1, revenue: 1, tax: 1, service: 1, discounts: 1 } }
  ]);
  return rows;
}

/** Best and worst sellers by quantity. */
export async function topItemsReport({ from, to, limit = 10 }) {
  const { start, end } = range({ from, to });
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menuItem',
        name: { $first: '$items.nameSnapshot.en' },
        qty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } }
      }
    },
    { $sort: { qty: -1 } },
    { $limit: Math.min(Number(limit) || 10, 50) },
    { $project: { _id: 0, itemId: '$_id', name: 1, qty: 1, revenue: 1 } }
  ]);
  return rows;
}

/** Revenue by category. */
export async function categoryRevenue({ from, to }) {
  const { start, end } = range({ from, to });
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'menuitems',
        localField: 'items.menuItem',
        foreignField: '_id',
        as: 'mi'
      }
    },
    { $unwind: { path: '$mi', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories',
        localField: 'mi.category',
        foreignField: '_id',
        as: 'cat'
      }
    },
    { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$cat.name.en',
        revenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } },
        qty: { $sum: '$items.quantity' }
      }
    },
    { $sort: { revenue: -1 } },
    { $project: { _id: 0, category: { $ifNull: ['$_id', 'Other'] }, revenue: 1, qty: 1 } }
  ]);
  return rows;
}

/** Peak-hours heatmap data: orders by weekday x hour (Kigali time). */
export async function peakHoursReport({ from, to }) {
  const { start, end } = range({ from, to });
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: {
          dow: { $dayOfWeek: { date: '$createdAt', timezone: TZ } },
          hour: { $hour: { date: '$createdAt', timezone: TZ } }
        },
        orders: { $sum: 1 }
      }
    },
    { $project: { _id: 0, dow: '$_id.dow', hour: '$_id.hour', orders: 1 } },
    { $sort: { dow: 1, hour: 1 } }
  ]);
  return rows;
}

/** Average prep time per day (createdAt -> ready). */
export async function prepTimeReport({ from, to }) {
  const { start, end } = range({ from, to });
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $project: {
        createdAt: 1,
        status: 1,
        readyAt: {
          $getField: {
            field: 'at',
            input: {
              $arrayElemAt: [
                { $filter: { input: '$statusHistory', cond: { $eq: ['$$this.status', 'ready'] } } },
                0
              ]
            }
          }
        }
      }
    },
    { $match: { readyAt: { $ne: null } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
        avgPrepMin: { $avg: { $divide: [{ $subtract: ['$readyAt', '$createdAt'] }, 60000] } },
        maxPrepMin: { $max: { $divide: [{ $subtract: ['$readyAt', '$createdAt'] }, 60000] } },
        samples: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: '$_id', avgPrepMin: { $round: ['$avgPrepMin', 1] }, maxPrepMin: { $round: ['$maxPrepMin', 1] }, samples: 1 } }
  ]);
  return rows;
}

/** Cancellation summary. */
export async function cancellationsReport({ from, to }) {
  const { start, end } = range({ from, to });
  const [cancelled, total] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: start, $lte: end }, status: 'cancelled' }),
    Order.countDocuments({ createdAt: { $gte: start, $lte: end } })
  ]);
  const byReason = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: 'cancelled' } },
    { $group: { _id: '$cancelReason', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, reason: '$_id', count: 1 } }
  ]);
  return { cancelled, total, rate: total ? Math.round((cancelled / total) * 1000) / 10 : 0, byReason };
}

/** Status actions per staff member (performance). */
export async function staffPerformance({ from, to }) {
  const { start, end } = range({ from, to });
  return Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $unwind: '$statusHistory' },
    { $match: { 'statusHistory.byRole': { $in: ['chef', 'waiter', 'manager'] } } },
    {
      $group: {
        _id: { by: '$statusHistory.by', role: '$statusHistory.byRole', action: '$statusHistory.status' },
        count: { $sum: 1 }
      }
    },
    { $group: { _id: '$_id.by', role: { $first: '$_id.role' }, actions: { $push: { action: '$_id.action', count: '$count' } }, total: { $sum: '$count' } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, name: '$_id', role: 1, actions: 1, total: 1 } }
  ]);
}

/** CSV export of raw orders. */
export async function ordersCsv({ from, to }) {
  const { start, end } = range({ from, to });
  const orders = await Order.find({ createdAt: { $gte: start, $lte: end } })
    .sort({ createdAt: -1 })
    .limit(5000)
    .select('orderNumber table items subtotal discount tax serviceCharge total status paymentStatus paymentMethod createdAt')
    .populate('table', 'number')
    .lean();

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['order_number,table,date,items_count,subtotal,discount,tax,service_charge,total,status,payment_status,payment_method'];
  for (const o of orders) {
    const count = o.items.reduce((s, i) => s + i.quantity, 0);
    lines.push(
      [
        o.orderNumber,
        o.table?.number ?? '',
        o.createdAt.toISOString(),
        count,
        o.subtotal,
        o.discount,
        o.tax,
        o.serviceCharge,
        o.total,
        o.status,
        o.paymentStatus,
        o.paymentMethod || ''
      ]
        .map(esc)
        .join(',')
    );
  }
  return lines.join('\n');
}

/** Daily cron: refresh the "popular" tag from the last 14 days of sales. */
export async function refreshPopularTags() {
  const since = new Date(Date.now() - 14 * 86400_000);
  const top = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.menuItem', qty: { $sum: '$items.quantity' } } },
    { $sort: { qty: -1 } },
    { $limit: 5 }
  ]);
  const topIds = top.map((t) => t._id).filter(Boolean);
  if (!topIds.length) return { popular: 0 };

  const [r1, r2] = await Promise.all([
    MenuItem.updateMany({ _id: { $in: topIds }, tags: { $ne: 'popular' } }, { $addToSet: { tags: 'popular' } }),
    MenuItem.updateMany({ _id: { $nin: topIds }, tags: 'popular' }, { $pull: { tags: 'popular' } })
  ]);
  return { popular: r1.modifiedCount, removed: r2.modifiedCount };
}

export const todayKey = () => kigaliDateKey();
