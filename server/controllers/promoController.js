import { Promo } from '../models/Promo.js';
import { audit } from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';

/** GET /api/promos */
export const listPromos = asyncWrap(async (req, res) => {
  const promos = await Promo.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, data: promos });
});

/** POST /api/promos */
export const createPromo = asyncWrap(async (req, res) => {
  const promo = await Promo.create({ ...req.body, code: req.body.code.toUpperCase() });
  await audit(req.staff, 'promo.create', 'Promo', promo._id, null, req.body);
  res.status(201).json({ ok: true, data: promo });
});

/** PATCH /api/promos/:id */
export const updatePromo = asyncWrap(async (req, res) => {
  if (req.body.code) req.body.code = req.body.code.toUpperCase();
  const promo = await Promo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!promo) throw new AppError('PROMO_NOT_FOUND', 'Promo not found', 404);
  await audit(req.staff, 'promo.update', 'Promo', promo._id, null, req.body);
  res.json({ ok: true, data: promo });
});

/** DELETE /api/promos/:id */
export const deletePromo = asyncWrap(async (req, res) => {
  const promo = await Promo.findByIdAndDelete(req.params.id);
  if (!promo) throw new AppError('PROMO_NOT_FOUND', 'Promo not found', 404);
  await audit(req.staff, 'promo.delete', 'Promo', req.params.id, promo, null);
  res.json({ ok: true, data: null });
});
