import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { parseCookies, AUTH_COOKIE } from '../utils/cookies.js';

function readToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE] || null;
}

/** Require a valid staff JWT (httpOnly cookie) and load the user. */
export const requireAuth = asyncWrap(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw new AppError('UNAUTHENTICATED', 'Please log in', 401);

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError('SESSION_EXPIRED', 'Session expired, please log in again', 401);
  }

  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) throw new AppError('ACCOUNT_DISABLED', 'Account is disabled', 401);

  req.staff = { id: user._id, name: user.name, role: user.role };
  next();
});

/** Restrict a route to the given roles. Use after requireAuth. */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.staff || !roles.includes(req.staff.role)) {
    return next(new AppError('FORBIDDEN', 'You do not have permission for this action', 403));
  }
  next();
};
