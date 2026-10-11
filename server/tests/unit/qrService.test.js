import test from 'node:test';
import assert from 'node:assert/strict';
import { qrTableTentPdf } from '../../services/qrService.js';

test('table-tent PDF renders one printable page per table', async () => {
  const pdf = await qrTableTentPdf([
    { number: 1, qrToken: 'test-table-token-1', label: 'Window' },
    { number: 2, qrToken: 'test-table-token-2', label: 'Patio' }
  ]);
  const content = pdf.toString('latin1');

  assert.ok(pdf.length > 1000);
  assert.equal(content.slice(0, 5), '%PDF-');
  assert.match(content, /%%EOF/);
  assert.equal((content.match(/\/Type\s*\/Page\b/g) || []).length, 2);
});