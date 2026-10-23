import { ServiceRequest } from '../models/ServiceRequest.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { emitRequestHandled } from '../sockets/emitter.js';

/** GET /api/requests?status=open */
export const listRequests = asyncWrap(async (req, res) => {
  const filter = req.query.status === 'open' ? { status: 'open' } : req.query.status ? { status: req.query.status } : {};
  const requests = await ServiceRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('table', 'number label')
    .lean();
  res.json({ ok: true, data: requests });
});

/** PATCH /api/requests/:id/handle — waiter, manager. */
export const handleRequest = asyncWrap(async (req, res) => {
  const request = await ServiceRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'open' },
    { $set: { status: 'handled', handledBy: req.staff.id } },
    { new: true }
  ).lean();
  if (!request) throw new AppError('REQUEST_NOT_FOUND', 'Request not found or already handled', 404);
  emitRequestHandled({ id: String(request._id), by: req.staff.name });
  res.json({ ok: true, data: request });
});
