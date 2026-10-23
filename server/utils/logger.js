import pino from 'pino';
import { config } from '../config/env.js';

// Tests deliberately trigger error paths (RBAC 403, bad tokens, illegal
// transitions); silence the logger so those expected errors don't clutter output.
const level = config.env === 'test' ? 'silent' : config.isProd ? 'info' : 'debug';

export const logger = pino({
  level,
  transport: config.isProd || config.env === 'test' ? undefined : { target: 'pino-pretty', options: { colorize: true } },
  redact: ['req.headers.cookie', 'password', 'passwordHash']
});
