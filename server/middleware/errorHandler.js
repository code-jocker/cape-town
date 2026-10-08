import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const MONGO_ERR = {
  11000: { code: 'DUPLICATE', message: 'This record already exists', status: 409 }
};

/** Central error handler — the ONLY place errors are finalized. */
export function errorHandler(err, req, res, _next) {
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let status = 500;

  if (err instanceof AppError) {
    code = err.code;
    message = err.message;
    status = err.statusCode;
  } else if (err instanceof ZodError) {
    code = 'VALIDATION_ERROR';
    const issue = err.issues[0];
    message = `${issue.path.join('.')}: ${issue.message}`;
    status = 422;
  } else if (err instanceof mongoose.Error.ValidationError) {
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors)[0]?.message || 'Invalid data';
    status = 422;
  } else if (err instanceof mongoose.Error.CastError) {
    code = 'INVALID_ID';
    message = 'Invalid identifier';
    status = 400;
  } else if (err.code && MONGO_ERR[err.code]) {
    ({ code, message, status } = MONGO_ERR[err.code]);
  } else if (err.type === 'entity.too.large') {
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request too large';
    status = 413;
  }

  const log = status >= 500 ? 'error' : 'warn';
  logger[log]({ reqId: req.id, err: err.message, stack: err.stack, code, status, path: req.originalUrl }, 'request error');

  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      ...(config.isProd ? {} : { detail: err.message })
    }
  });
}

/** 404 for unknown API routes. */
export function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
  });
}
