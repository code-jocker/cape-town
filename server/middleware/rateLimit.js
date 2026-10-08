import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { verifyTableToken } from '../utils/token.js';

const minutes = (n) => n * 60 * 1000;

/** General API limiter. */
export const apiLimiter = rateLimit({
  windowMs: minutes(config.rateLimit.windowMin),
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' } }
});

/** Strict limiter for login. */
export const loginLimiter = rateLimit({
  windowMs: minutes(config.rateLimit.windowMin),
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts, try again later' } }
});

function tableKeyLimiter(max, windowMin, code, message) {
  return rateLimit({
    windowMs: minutes(windowMin),
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Prefer the verified table id; fall back to token payload or IP.
      if (req.table?._id) return String(req.table._id);
      try {
        const token = req.headers['x-table-token'] || req.body?.tableToken || req.query?.t;
        return 't:' + verifyTableToken(token).table;
      } catch {
        return req.ip;
      }
    },
    message: { ok: false, error: { code, message } }
  });
}

/** Max orders per table per window (spam protection). */
export const orderLimiter = tableKeyLimiter(
  config.rateLimit.orderMax,
  config.rateLimit.orderWindowMin,
  'ORDER_RATE_LIMITED',
  `Max ${config.rateLimit.orderMax} orders per ${config.rateLimit.orderWindowMin} minutes`
);

/** Max service requests per table per window. */
export const requestLimiter = tableKeyLimiter(
  config.rateLimit.requestMax,
  config.rateLimit.requestWindowMin,
  'REQUEST_RATE_LIMITED',
  `Max ${config.rateLimit.requestMax} requests per ${config.rateLimit.requestWindowMin} minutes`
);
