import { Table } from '../models/Table.js';
import { signTableToken } from '../utils/token.js';
import { qrPng, qrSheetPdf, tableUrl } from '../services/qrService.js';
import { audit } from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';

/** GET /api/tables */
export const listTables = asyncWrap(async (req, res) => {
  const tables = await Table.find().sort({ number: 1 }).lean();
  res.json({
    ok: true,
    data: tables.map((t) => ({ ...t, url: tableUrl(t.qrToken) }))
  });
});

/** POST /api/tables */
export const createTable = asyncWrap(async (req, res) => {
  const existing = await Table.findOne({ number: req.body.number }).lean();
  if (existing) throw new AppError('TABLE_EXISTS', `Table ${req.body.number} already exists`, 409);

  let tokenVersion = 0;
  const table = await Table.create({ ...req.body, qrToken: 'pending' });
  table.qrToken = signTableToken(table._id, tokenVersion);
  await table.save();
  await audit(req.staff, 'table.create', 'Table', table._id, null, { number: table.number });
  res.status(201).json({ ok: true, data: { ...table.toObject(), url: tableUrl(table.qrToken) } });
});

/** PATCH /api/tables/:id */
export const updateTable = asyncWrap(async (req, res) => {
  const { qrToken, tokenVersion, _id, ...changes } = req.body;
  const before = await Table.findById(req.params.id).lean();
  const table = await Table.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  if (!table) throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
  await audit(req.staff, 'table.update', 'Table', table._id, before, changes);
  res.json({ ok: true, data: { ...table.toObject(), url: tableUrl(table.qrToken) } });
});

/** DELETE /api/tables/:id */
export const deleteTable = asyncWrap(async (req, res) => {
  const table = await Table.findByIdAndDelete(req.params.id);
  if (!table) throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
  await audit(req.staff, 'table.delete', 'Table', req.params.id, { number: table.number }, null);
  res.json({ ok: true, data: null });
});

/** POST /api/tables/:id/regenerate-token — revoke all printed QRs for the table. */
export const regenerateToken = asyncWrap(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
  table.tokenVersion += 1;
  table.qrToken = signTableToken(table._id, table.tokenVersion);
  await table.save();
  await audit(req.staff, 'table.regen_token', 'Table', table._id, null, { tokenVersion: table.tokenVersion });
  res.json({ ok: true, data: { ...table.toObject(), url: tableUrl(table.qrToken) } });
});

/** GET /api/tables/:id/qr.png */
export const qrPngRoute = asyncWrap(async (req, res) => {
  const table = await Table.findById(req.params.id).lean();
  if (!table) throw new AppError('TABLE_NOT_FOUND', 'Table not found', 404);
  const buf = await qrPng(table.qrToken, 1024);
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', `attachment; filename="cape-town-k-hotel-table-${table.number}.png"`);
  res.send(buf);
});

/** GET /api/tables/qr-sheet.pdf?ids=1,2,3 (optional; default all active) */
export const qrSheet = asyncWrap(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.ids) {
    const numbers = String(req.query.ids)
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter(Number.isFinite);
    if (numbers.length) filter.number = { $in: numbers };
  }
  const tables = await Table.find(filter).sort({ number: 1 }).lean();
  if (!tables.length) throw new AppError('NO_TABLES', 'No tables match the selection', 404);
  const buf = await qrSheetPdf(tables);
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', 'attachment; filename="cape-town-k-hotel-qr-sheets.pdf"');
  res.send(buf);
});
