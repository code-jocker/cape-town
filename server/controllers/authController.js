import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { authCookieOptions, AUTH_COOKIE } from '../utils/cookies.js';
import { logger } from '../utils/logger.js';
import { audit } from '../models/AuditLog.js';

const LOCK_MINUTES = 15;
const MAX_FAILED = 5;
const MAX_AGE_MS = 7 * 24 * 3600_000;

export const login = asyncWrap(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username: String(username).toLowerCase() }).select('+failedLogins +lockUntil +passwordHash');
  const valid = user && (await bcrypt.compare(password, user.passwordHash));

  if (!user) throw new AppError('BAD_CREDENTIALS', 'Wrong username or password', 401);

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError('ACCOUNT_LOCKED', `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes`, 429);
  }

  if (!valid) {
    const failed = (user.failedLogins || 0) + 1;
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLogins: failed,
          lockUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
        }
      }
    );
    logger.warn({ username, failed }, 'auth.failed');
    throw new AppError('BAD_CREDENTIALS', 'Wrong username or password', 401);
  }

  if (!user.isActive) throw new AppError('ACCOUNT_DISABLED', 'This account has been disabled', 403);

  await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockUntil: null, lastLogin: new Date() } });

  const token = jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpires
  });
  res.cookie(AUTH_COOKIE, token, authCookieOptions(config.isProd, MAX_AGE_MS));
  await audit({ id: user._id, name: user.name }, 'auth.login', 'User', user._id);

  res.json({ ok: true, data: { id: user._id, name: user.name, role: user.role, username: user.username } });
});

export const logout = asyncWrap(async (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(config.isProd, 0), maxAge: 0 });
  res.json({ ok: true, data: null });
});

export const me = asyncWrap(async (req, res) => {
  res.json({ ok: true, data: req.staff });
});
