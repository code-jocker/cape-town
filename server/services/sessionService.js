import { nanoid } from 'nanoid';
import { TableSession } from '../models/TableSession.js';
import { Order } from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { emitSessionClosed } from '../sockets/emitter.js';

/**
 * Get the open session for a table or create one (first order opens it).
 * The random sessionId is what customer devices keep in localStorage.
 */
export async function getOrCreateOpenSession(tableId) {
  let session = await TableSession.findOne({ table: tableId, status: 'open' }).lean();
  if (session) return session;

  try {
    session = await TableSession.create({
      table: tableId,
      sessionId: nanoid(21),
      openedAt: new Date()
    });
    return session.toObject();
  } catch (err) {
    // Two concurrent first orders: loser joins the winner's session.
    if (err.code === 11000) {
      const s = await TableSession.findOne({ table: tableId, status: 'open' }).lean();
      if (s) return s;
    }
    throw err;
  }
}

export async function touchSession(sessionId) {
  await TableSession.updateOne({ _id: sessionId }, { $set: { lastActivityAt: new Date() } });
}

/** Recompute session total + payment status from its orders. */
export async function refreshSessionTotals(sessionId) {
  const orders = await Order.find({ session: sessionId }).select('total paymentStatus').lean();
  const totalAmount = orders.reduce((s, o) => s + (o.paymentStatus === 'refunded' ? 0 : o.total), 0);
  const paidCount = orders.filter((o) => o.paymentStatus === 'paid').length;
  const paymentStatus =
    orders.length === 0 ? 'unpaid' : paidCount === orders.length ? 'paid' : paidCount > 0 ? 'partial' : 'unpaid';
  await TableSession.updateOne({ _id: sessionId }, { $set: { totalAmount, paymentStatus } });
  return { totalAmount, paymentStatus };
}

export async function closeSession(sessionId, staff, { force = false } = {}) {
  const session = await TableSession.findOne({ _id: sessionId }).lean();
  if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found', 404);
  if (session.status === 'closed') return session;

  if (!force) {
    const unpaid = await Order.countDocuments({
      session: sessionId,
      status: { $nin: ['paid', 'cancelled'] },
      $or: [{ paymentStatus: { $ne: 'paid' } }]
    });
    if (unpaid > 0) {
      throw new AppError(
        'SESSION_HAS_UNPAID',
        'All orders must be paid (or cancelled) before closing the session',
        409
      );
    }
  }

  const updated = await TableSession.findOneAndUpdate(
    { _id: sessionId, status: 'open' },
    { $set: { status: 'closed', closedAt: new Date() } },
    { new: true }
  ).lean();

  emitSessionClosed({ sessionId: session.sessionId, tableId: String(session.table), by: staff?.name || 'system' });
  return updated;
}

/** Auto-close sessions idle for more than N hours (cron). */
export async function autoCloseIdleSessions(hours) {
  const cutoff = new Date(Date.now() - hours * 3600_000);
  const idle = await TableSession.find({ status: 'open', lastActivityAt: { $lt: cutoff } })
    .select('_id')
    .lean();
  let closed = 0;
  for (const s of idle) {
    try {
      await closeSession(s._id, { name: 'auto-close' }, { force: true });
      closed++;
    } catch {
      /* keep closing the rest */
    }
  }
  return closed;
}

/** Resolve a session by its public sessionId (what customers hold). */
export async function findSessionByPublicId(publicSessionId) {
  if (!publicSessionId) return null;
  return TableSession.findOne({ sessionId: String(publicSessionId) }).lean();
}
