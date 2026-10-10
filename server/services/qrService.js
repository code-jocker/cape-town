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

const GOLD = '#D4AF37';
const DARK_BG = '#0A1929';

function drawTableTentPanel(doc, ox, oy, panelW, panelH, tableNumber, qrBuf, label) {
  doc.save();
  doc.rect(ox, oy, panelW, panelH).clip();

  const bgGrad = doc.linearGradient(ox, oy, ox, oy + panelH);
  bgGrad.stop(0, DARK_BG).stop(1, '#1a2a40');
  doc.rect(ox, oy, panelW, panelH).fill(bgGrad);

  // Table Mountain silhouette — 3 peaks at bottom
  const mtnY = oy + panelH - 50;
  doc.beginPath();
  doc.moveTo(ox + 10, oy + panelH - 6);
  doc.lineTo(ox + 50, mtnY);
  doc.lineTo(ox + 110, oy + panelH - 6);
  doc.lineTo(ox + 150, mtnY - 6);
  doc.lineTo(ox + 200, oy + panelH - 6);
  doc.lineTo(ox + panelW - 10, oy + panelH - 6);
  doc.fill(DARK_BG);

  // gold accent stripe + CK monogram
  doc.rect(ox, oy, panelW, 28).fill(GOLD);
  doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('CK', ox + 16, oy + 4, { align: 'center' });

  // table number badge
  const badgeW = 76;
  const bx = ox + (panelW - badgeW) / 2;
  const by = oy + 42;
  doc.roundedRect(bx, by, badgeW, 26, 13).fill('#FFFFFF');
  doc.fill('#0A1929').font('Helvetica-Bold').fontSize(13).text(`Table ${tableNumber}`, bx, by + 5, { width: badgeW, align: 'center' });

  // "SCAN HERE FOR MENU" button
  const btnText = 'SCAN HERE FOR MENU';
  const btnW = 170;
  const btnH = 36;
  const btnX = ox + panelW - 180;
  const btnY = oy + panelH / 2 - 50;
  doc.roundedRect(btnX, btnY, btnW, btnH, 18).fill(GOLD);
  doc.fill('#0A1929').font('Helvetica-Bold').fontSize(11).text(btnText, btnX, btnY + 10, { width: btnW, align: 'center' });

  // gold-accented QR code on the right
  const qrSize = Math.min(110, panelW / 3);
  const qrX = ox + panelW - qrSize - 22;
  const qrY = btnY + btnH + 20;
  doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6).lineWidth(3).strokeColor(GOLD).stroke();
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  // tagline
  doc.fill(GOLD).font('Helvetica-Bold').fontSize(12).text('AI DIGITAL MENU', ox, oy + panelH - 50, { width: panelW, align: 'center' });

  if (label) {
    doc.fill('#B0B8CC').font('Helvetica').fontSize(9).text(label, ox + 10, oy + panelH - 68, { width: panelW - 20, align: 'center' });
  }

  doc.restore();
}

/**
 * Branded QR table-tent cards — one landscape page per table.
 * Each page is split in half: left = front panel, right = back panel.
 * Features: Table Mountain night-silhouette, gold CK monogram,
 * gold-accented QR on the right, "SCAN HERE FOR MENU" button,
 * "AI DIGITAL MENU" at bottom.
 */
export async function qrTableTentPdf(tables) {
  const doc = new PDFDocument({ layout: 'landscape', margin: 0, autoFirstPage: true });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  const pw = doc.page.width;
  const ph = doc.page.height;

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const qrBuf = await qrPng(t.qrToken, 512);
    drawTableTentPanel(doc, 0, 0, pw / 2, ph, t.number, qrBuf, t.label);
    drawTableTentPanel(doc, pw / 2, 0, pw / 2, ph, t.number, qrBuf, t.label);
    if (i < tables.length - 1) doc.addPage();
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
