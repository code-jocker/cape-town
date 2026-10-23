import { newId } from '../utils/cookies.js';

/** Attach a request id for log correlation. */
export function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || newId();
  res.setHeader('X-Request-Id', req.id);
  next();
}
