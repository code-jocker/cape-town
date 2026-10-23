import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './AppError.js';

/**
 * Signed, revocable table tokens.
 * Payload: { table: <tableId>, v: <tokenVersion> } — bumping tokenVersion
 * (or regenerating qrToken) instantly revokes every printed QR for a table.
 */
export function signTableToken(tableId, tokenVersion) {
  return jwt.sign({ table: String(tableId), v: tokenVersion }, config.tableTokenSecret, {
    expiresIn: '1y'
  });
}

export function verifyTableToken(token) {
  let payload;
  try {
    payload = jwt.verify(String(token || ''), config.tableTokenSecret);
  } catch {
    throw new AppError('TABLE_TOKEN_INVALID', 'Invalid or expired table code', 401);
  }
  if (!payload?.table) {
    throw new AppError('TABLE_TOKEN_INVALID', 'Invalid table code', 401);
  }
  return payload;
}
