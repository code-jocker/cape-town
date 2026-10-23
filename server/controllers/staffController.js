import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';

const PUBLIC_FIELDS = 'name username role isActive lastLogin createdAt';

/** GET /api/staff (manager) */
export const listStaff = asyncWrap(async (req, res) => {
  const users = await User.find().select(PUBLIC_FIELDS).sort({ role: 1, name: 1 }).lean();
  res.json({ ok: true, data: users });
});

/** POST /api/staff (manager) */
export const createStaff = asyncWrap(async (req, res) => {
  const { name, username, password, role, email } = req.body;
  const exists = await User.findOne({ username: username.toLowerCase() }).lean();
  if (exists) throw new AppError('USER_EXISTS', 'That username is taken', 409);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, username, email, role, passwordHash });
  await audit(req.staff, 'staff.create', 'User', user._id, null, { name, role });
  res.status(201).json({ ok: true, data: { id: user._id, name: user.name, username: user.username, role: user.role } });
});

/** PATCH /api/staff/:id (manager) — name, role, isActive. */
export const updateStaff = asyncWrap(async (req, res) => {
  const changes = {};
  for (const key of ['name', 'role', 'isActive']) {
    if (key in req.body) changes[key] = req.body[key];
  }
  const before = await User.findById(req.params.id).select(PUBLIC_FIELDS).lean();
  if (!before) throw new AppError('USER_NOT_FOUND', 'Staff member not found', 404);

  // never disable/demote the last active manager
  if ((changes.role && changes.role !== 'manager') || changes.isActive === false) {
    if (before.role === 'manager' && before.isActive) {
      const activeManagers = await User.countDocuments({ role: 'manager', isActive: true, _id: { $ne: before._id } });
      if (activeManagers === 0) {
        throw new AppError('LAST_MANAGER', 'Cannot remove the last active manager', 409);
      }
    }
  }

  const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true })
    .select(PUBLIC_FIELDS)
    .lean();
  await audit(req.staff, 'staff.update', 'User', req.params.id, before, changes);
  res.json({ ok: true, data: user });
});

/** POST /api/staff/:id/reset-password (manager) */
export const resetPassword = asyncWrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('USER_NOT_FOUND', 'Staff member not found', 404);
  user.passwordHash = await bcrypt.hash(req.body.password, 10);
  user.failedLogins = 0;
  user.lockUntil = null;
  await user.save();
  await audit(req.staff, 'staff.reset_password', 'User', req.params.id);
  res.json({ ok: true, data: null });
});
