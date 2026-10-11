import test from 'node:test';
import assert from 'node:assert/strict';
import { qrTableTentPdf } from '../../services/qrService.js';

test('table-tent PDF renders one portrait page and one QR per table', async () => {
  const pdf = await qrTableTentPdf([
    { number: 1, qrToken: 'test-table-token-1', label: 'Window' },
    { number: 2, qrToken: 'test-table-token-2', label: 'Patio' }
  ]);
  const content = pdf.toString('latin1');

  assert.ok(pdf.length > 1000);
  assert.equal(content.slice(0, 5), '%PDF-');
  assert.match(content, /%%EOF/);
  assert.equal((content.match(/\/Type\s*\/Page\b/g) || []).length, 2);
  assert.match(content, /\/MediaBox\s*\[0\s+0\s+419\.53\s+595\.28\]/);
  // PDFKit stores each PNG QR as an image plus its transparency mask.
  assert.equal((content.match(/\/Subtype\s*\/Image\b/g) || []).length, 4);
});