import { Table } from '../models/Table.js';
import { AppError } from '../utils/AppError.js';
import { asyncWrap } from '../utils/asyncWrap.js';
import { verifyTableToken } from '../utils/token.js';

function extractToken(req) {
  return (
    req.headers['x-table-token'] ||
    req.query?.t ||
    req.body?.tableToken ||
    req.params?.token ||
    null
  );
}

/**
 * Validate a table token (header x-table-token, ?t= or body.tableToken),
 * load the table and check it is active and the token version is current.
 */
export const requireTable = asyncWrap(async (req, _res, next) => {
  const token = extractToken(req);
  const payload = verifyTableToken(token);
  const table = await Table.findById(payload.table).lean();
  if (!table || !table.isActive) {
    throw new AppError('TABLE_INACTIVE', 'This table code is no longer active', 401);
  }
  if (table.tokenVersion !== payload.v) {
    throw new AppError('TABLE_TOKEN_REVOKED', 'This table code has been revoked', 401);
  }
  req.table = table;
  req.tableToken = token;
  next();
});
