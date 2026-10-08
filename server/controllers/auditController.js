import { AuditLog } from '../models/AuditLog.js';
import { asyncWrap } from '../utils/asyncWrap.js';

/** GET /api/audit-logs?entity=&page=&limit= (manager) */
export const listAuditLogs = asyncWrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
  const filter = {};
  if (req.query.entity) filter.entity = req.query.entity;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter)
  ]);
  res.json({ ok: true, data: { logs, page, pages: Math.max(1, Math.ceil(total / limit)), total } });
});
