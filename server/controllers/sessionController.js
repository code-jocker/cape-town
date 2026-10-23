import { TableSession } from '../models/TableSession.js';
import { Order } from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { closeSession, refreshSessionTotals } from '../services/sessionService.js';
import { paySession } from '../services/orderService.js';

/** GET /api/sessions?status=open — active table sessions (waiter view). */
export const listSessions = asyncWrap(async (req, res) => {
  const filter = req.query.status === 'closed' ? { status: 'closed' } : { status: 'open' };
  const sessions = await TableSession.find(filter)
    .sort({ openedAt: -1 })
    .limit(100)
    .populate('table', 'number label')
    .lean();

  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const orders = await Order.find({ session: s._id })
        .select('orderNumber total status paymentStatus createdAt')
        .lean();
      return {
        id: s._id,
        sessionId: s.sessionId,
        table: s.table,
        status: s.status,
        openedAt: s.openedAt,
        paymentStatus: s.paymentStatus,
        totalAmount: s.totalAmount,
        orders
      };
    })
  );
  res.json({ ok: true, data: enriched });
});

/** GET /api/sessions/:id — full bill for a session. */
export const getSession = asyncWrap(async (req, res) => {
  const session = await TableSession.findById(req.params.id).populate('table', 'number label').lean();
  if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found', 404);
  const orders = await Order.find({ session: session._id }).sort({ createdAt: 1 }).lean();
  const totals = await refreshSessionTotals(session._id);
  res.json({
    ok: true,
    data: {
      id: session._id,
      sessionId: session.sessionId,
      table: session.table,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      orders,
      totals
    }
  });
});

/** POST /api/sessions/:id/close — waiter, manager. */
export const close = asyncWrap(async (req, res) => {
  const session = await closeSession(req.params.id, req.staff, { force: req.body.force === true });
  res.json({ ok: true, data: session });
});

/** POST /api/sessions/:id/pay — pay the whole bill (cash/card/momo). */
export const payWholeSession = asyncWrap(async (req, res) => {
  const result = await paySession(req.params.id, req.body.method, req.staff);
  res.json({ ok: true, data: result });
});
