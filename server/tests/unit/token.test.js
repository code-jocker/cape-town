import test from 'node:test';
import assert from 'node:assert/strict';
import { signTableToken, verifyTableToken } from '../../utils/token.js';
import { AppError } from '../../utils/AppError.js';

const tableId = '64b7f1d2e4a1c9001234abcd';

test('signTableToken/verifyTableToken: roundtrips the table id and version', () => {
  const token = signTableToken(tableId, 3);
  const payload = verifyTableToken(token);
  assert.equal(payload.table, tableId);
  assert.equal(payload.v, 3);
});

test('verifyTableToken: a bumped version still verifies but carries the new v', () => {
  const token = signTableToken(tableId, 7);
  assert.equal(verifyTableToken(token).v, 7);
});

test('verifyTableToken: rejects a tampered token', () => {
  const token = signTableToken(tableId, 1);
  const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
  assert.throws(() => verifyTableToken(tampered), (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.code, 'TABLE_TOKEN_INVALID');
    assert.equal(err.statusCode, 401);
    return true;
  });
});

test('verifyTableToken: rejects empty / garbage input', () => {
  for (const bad of ['', undefined, null, 'not-a-jwt', 'a.b.c']) {
    assert.throws(() => verifyTableToken(bad), /TABLE_TOKEN_INVALID|Invalid/);
  }
});
