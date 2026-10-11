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
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.once('end', resolve);
    doc.once('error', reject);
  });

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
  bgGrad.stop(0, '#07121F').stop(0.58, '#172A40').stop(1, '#392A31');
  doc.rect(ox, oy, panelW, panelH).fill(bgGrad);

  const centerX = ox + panelW / 2;
  const scale = Math.min(panelW / 420, panelH / 595);
  const s = (value) => value * scale;

  const horizon = doc.linearGradient(ox, oy + s(300), ox, oy + s(500));
  horizon.stop(0, '#C66B48').stop(1, '#172A40');
  doc.rect(ox, oy + s(300), panelW, s(200)).fill(horizon);
  doc.moveTo(ox, oy + s(456)).lineTo(ox + s(58), oy + s(421)).lineTo(ox + s(128), oy + s(430))
    .lineTo(ox + s(211), oy + s(365)).lineTo(ox + s(296), oy + s(429))
    .lineTo(ox + panelW, oy + s(399)).lineTo(ox + panelW, oy + panelH).lineTo(ox, oy + panelH)
    .closePath().fillColor('#101E2D').fill();
  doc.moveTo(ox, oy + s(488)).lineTo(ox + s(94), oy + s(454)).lineTo(ox + s(170), oy + s(467))
    .lineTo(ox + s(274), oy + s(424)).lineTo(ox + panelW, oy + s(466))
    .lineTo(ox + panelW, oy + panelH).lineTo(ox, oy + panelH)
    .closePath().fillColor('#081522').fill();

  const buildings = [[12, 476, 22, 52], [39, 462, 18, 66], [65, 482, 24, 46], [95, 469, 17, 59], [310, 474, 18, 54], [333, 459, 25, 69], [364, 480, 20, 48], [389, 468, 22, 60]];
  for (const [x, y, width, height] of buildings) {
    doc.rect(ox + s(x), oy + s(y), s(width), s(height)).fillColor('#0C1926').fill();
    for (let row = 0; row < 3; row++) {
      doc.rect(ox + s(x + 5), oy + s(y + 8 + row * 12), s(3), s(4)).fillColor('#E0AD62').fill();
      doc.rect(ox + s(x + 13), oy + s(y + 8 + row * 12), s(3), s(4)).fillColor('#E0AD62').fill();
    }
  }

  for (const [x, y] of [[30, 88], [388, 117]]) {
    doc.moveTo(ox + s(x), oy).lineTo(ox + s(x), oy + s(y - 16)).lineWidth(s(1)).strokeColor('#B98D4A').stroke();
    doc.roundedRect(ox + s(x - 10), oy + s(y - 16), s(20), s(28), s(5)).lineWidth(s(1)).strokeColor(GOLD).stroke();
    doc.ellipse(ox + s(x), oy + s(y - 2), s(4), s(9)).fillColor('#F3B46D').fill();
  }
  for (const [x, y, color] of [[22, 154, '#B23B6B'], [43, 176, '#D15A7C'], [18, 204, '#8F315C'], [47, 225, '#C64E70'], [25, 252, '#A43C68']]) {
    doc.circle(ox + s(x), oy + s(y), s(7)).fillColor(color).fill();
    doc.ellipse(ox + s(x + 10), oy + s(y + 5), s(7), s(3)).fillColor('#356A53').fill();
  }

  const logoY = oy + s(34);
  doc.circle(centerX, logoY + s(29), s(29)).fillColor('#F8F6EF').fill();
  doc.circle(centerX, logoY + s(29), s(26)).lineWidth(s(1.5)).strokeColor(GOLD).stroke();
  doc.moveTo(centerX - s(14), logoY + s(36)).lineTo(centerX, logoY + s(20)).lineTo(centerX + s(14), logoY + s(36))
    .lineWidth(s(1.2)).strokeColor(GOLD).stroke();
  doc.font('Times-Bold').fontSize(s(17)).fillColor('#102134').text('CK', centerX - s(20), logoY + s(27), { width: s(40), align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(s(15)).fillColor('#FFFFFF').text('CAPE TOWN HOTEL', ox + s(50), oy + s(102), { width: panelW - s(100), align: 'center', lineBreak: false });
  doc.font('Times-Italic').fontSize(s(10)).fillColor('#E9C77A').text('Good Food  |  Great Vibes  |  Unforgettable Moments', ox + s(35), oy + s(124), {
    width: panelW - s(70), align: 'center', lineBreak: false
  });
  doc.font('Helvetica-Bold').fontSize(s(8)).fillColor(GOLD).text('*', centerX - s(5), oy + s(142), { width: s(10), align: 'center' });

  const badgeW = s(104);
  const badgeX = centerX - badgeW / 2;
  const badgeY = oy + s(165);
  doc.roundedRect(badgeX, badgeY, badgeW, s(22), s(11)).fillColor('#F8F6EF').fill();
  doc.font('Helvetica-Bold').fontSize(s(10)).fillColor(DARK_BG).text(`TABLE ${tableNumber}`, badgeX, badgeY + s(6), {
    width: badgeW, align: 'center', lineBreak: false
  });

  const qrSize = s(174);
  const qrX = centerX - qrSize / 2;
  const qrY = oy + s(206);
  doc.roundedRect(qrX - s(12), qrY - s(12), qrSize + s(24), qrSize + s(24), s(7)).fillColor('#FFFFFF').fill();
  doc.roundedRect(qrX - s(12), qrY - s(12), qrSize + s(24), qrSize + s(24), s(7))
    .lineWidth(s(1.5)).strokeColor(GOLD).stroke();
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });
  doc.circle(centerX, qrY + qrSize / 2, s(17)).fillColor('#FFFFFF').fill();
  doc.circle(centerX, qrY + qrSize / 2, s(15)).lineWidth(s(1)).strokeColor(GOLD).stroke();
  doc.font('Times-Bold').fontSize(s(10)).fillColor(DARK_BG).text('CK', centerX - s(12), qrY + qrSize / 2 - s(5), {
    width: s(24), align: 'center', lineBreak: false
  });

  const btnW = s(218);
  const btnH = s(36);
  const btnX = centerX - btnW / 2;
  const btnY = qrY + qrSize + s(25);
  doc.roundedRect(btnX, btnY, btnW, btnH, s(18)).lineWidth(s(1.5)).strokeColor(GOLD).stroke();
  doc.roundedRect(btnX + s(15), btnY + s(8), s(13), s(20), s(2)).lineWidth(s(1)).strokeColor(GOLD).stroke();
  doc.moveTo(btnX + s(19), btnY + s(24)).lineTo(btnX + s(24), btnY + s(24)).lineWidth(s(1)).strokeColor(GOLD).stroke();
  doc.font('Helvetica-Bold').fontSize(s(10)).fillColor('#FFFFFF').text('SCAN HERE FOR MENU', btnX + s(36), btnY + s(13), {
    width: btnW - s(44), align: 'center', lineBreak: false
  });

  doc.font('Helvetica-Bold').fontSize(s(12)).fillColor(GOLD).text('AI DIGITAL MENU', ox, oy + s(525), {
    width: panelW, align: 'center', lineBreak: false
  });
  if (label) {
    doc.font('Helvetica').fontSize(s(8)).fillColor('#D7DCE4').text(label, ox + s(20), oy + s(548), {
      width: panelW - s(40), align: 'center', lineBreak: false
    });
  }

  doc.restore();
}

/**
 * Branded QR table-tent cards — one portrait page and one QR code per table.
 */
export async function qrTableTentPdf(tables) {
  const doc = new PDFDocument({ size: 'A5', margin: 0, autoFirstPage: true });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.once('end', resolve);
    doc.once('error', reject);
  });

  const pageW = doc.page.width;
  const pageH = doc.page.height;

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const qrBuf = await qrPng(t.qrToken, 512);
    drawTableTentPanel(doc, 0, 0, pageW, pageH, t.number, qrBuf, t.label);
    if (i < tables.length - 1) doc.addPage();
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
