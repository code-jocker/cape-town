import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { config } from '../config/env.js';

/** Full customer URL for a table QR token. */
export function tableUrl(qrToken) {
  return `${config.baseUrl}/customer/?t=${qrToken}`;
}

/** QR code PNG buffer for a table token.
 *  Optimised for accessibility: large quiet zone (margin 4), high error
 *  correction (level H — recovers up to 30% damage), pure black on white
 *  for maximum contrast, and a larger default pixel size so older phone
 *  cameras and users with camera errors can still scan reliably.
 */
export async function qrPng(qrToken, size = 1024) {
  return QRCode.toBuffer(tableUrl(qrToken), {
    width: size,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

/**
 * Printable A4 sheet with several table QR codes per page
 * (2 columns x 4 rows). Brown header band per card, "Table X" in large
 * type, "Scan to order" in EN/FR/RW, QR centered.
 */
export async function qrSheetPdf(tables) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  const colW = (doc.page.width - 72) / 2;
  const rowH = (doc.page.height - 72) / 4;
  const brown = '#9A5322';
  const dark = '#7F4318';

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const col = i % 2;
    const row = Math.floor(i / 2) % 4;
    if (i > 0 && i % 8 === 0) doc.addPage();

    const x = 36 + col * colW;
    const y = 36 + row * rowH;

    // card border
    doc.roundedRect(x + 8, y + 8, colW - 16, rowH - 16, 12).lineWidth(1).strokeColor('#E6D5C7').stroke();

    // header band
    doc.roundedRect(x + 8, y + 8, colW - 16, 34, 12).fill(brown);
    doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(13).text('CAPE TOWN K HOTEL', x + 8, y + 15, {
      width: colW - 16,
      align: 'center'
    });
    doc.font('Helvetica').fontSize(7).fill('#F0D9C6').text('RESTAURANT', x + 8, y + 31, {
      width: colW - 16,
      align: 'center',
      lineBreak: false
    });

    // table label
    doc.fill('#111111').font('Helvetica-Bold').fontSize(26).text(`Table ${t.number}`, x + 8, y + 50, {
      width: colW - 16,
      align: 'center'
    });
    if (t.label) {
      doc.font('Helvetica').fontSize(9).fill('#6B6B6B').text(t.label, x + 8, y + 82, {
        width: colW - 16,
        align: 'center'
      });
    }

    // QR code — large and high-contrast for reliable scanning
    const qrSize = Math.min(rowH - 120, colW - 40);
    const qrBuf = await qrPng(t.qrToken, 720);
    const qx = x + (colW - qrSize) / 2;
    doc.image(qrBuf, qx, y + 80, { width: qrSize, height: qrSize });

    // multilingual caption
    const cy = y + 96 + qrSize + 8;
    doc.font('Helvetica-Bold').fontSize(9).fill(dark)
      .text('Scan to order', x + 8, cy, { width: colW - 16, align: 'center', lineBreak: false })
      .text('Scannez pour commander', x + 8, cy + 12, { width: colW - 16, align: 'center', lineBreak: false })
      .text('Kanda ugorebe urutonde', x + 8, cy + 24, { width: colW - 16, align: 'center' });
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
