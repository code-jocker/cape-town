/**
 * Seed script — wipes the database and rebuilds a complete demo dataset:
 * settings, staff users, 10 tables with signed QR tokens, menu, promos and
 * 14 days of sample orders (so reports have data on day one).
 *
 * Run: npm run seed
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import sharp from 'sharp';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Table } from '../models/Table.js';
import { TableSession } from '../models/TableSession.js';
import { Category } from '../models/Category.js';
import { MenuItem } from '../models/MenuItem.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Promo } from '../models/Promo.js';
import { Settings } from '../models/Settings.js';
import { Counter } from '../models/Counter.js';
import { signTableToken } from '../utils/token.js';
import { kigaliDateKey, formatOrderNumber } from '../utils/orderNumber.js';
import { computeTotals } from '../services/pricingService.js';
import { USERS, CATEGORIES, ITEMS, PROMOS, SETTINGS } from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT, 'public', 'uploads', 'src');
const ITEMS_DIR = path.join(ROOT, 'public', 'uploads', 'items');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');

const TABLE_COUNT = 10;
const HISTORY_DAYS = 14;

/** Deterministic PRNG so repeated seeds produce the same demo data. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function ensureDirs() {
  await fs.mkdir(ITEMS_DIR, { recursive: true });
  await fs.mkdir(ICONS_DIR, { recursive: true });
}

/**
 * Convert public/uploads/src/<name>.(jpg|png|webp) into an 800px WebP + 400px
 * thumbnail under public/uploads/items/. Returns { url, thumbUrl } or null when
 * no source image exists.
 */
async function processImage(name) {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const src = path.join(SRC_DIR, name + ext);
    try {
      await fs.access(src);
      const out = path.join(ITEMS_DIR, `${name}.webp`);
      const thumb = path.join(ITEMS_DIR, `${name}-thumb.webp`);
      await sharp(src).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
      await sharp(src).resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toFile(thumb);
      return { url: `/uploads/items/${name}.webp`, thumbUrl: `/uploads/items/${name}-thumb.webp` };
    } catch {
      /* source missing — try next extension */
    }
  }
  return null;
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="96" fill="#9A5322"/>
<text x="256" y="300" font-family="Arial, sans-serif" font-size="190" font-weight="bold" fill="#FFFFFF" text-anchor="middle">EP</text>
<text x="256" y="380" font-family="Arial, sans-serif" font-size="52" letter-spacing="8" fill="#F0D9C6" text-anchor="middle">PARADIZE</text>
</svg>`;

async function buildIcons() {
  await fs.writeFile(path.join(ICONS_DIR, 'logo.svg'), LOGO_SVG, 'utf8');
  const svg = Buffer.from(LOGO_SVG);
  for (const size of [192, 512, 180]) {
    const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    await sharp(svg).resize(size, size).png().toFile(path.join(ICONS_DIR, name));
  }
}

async function seedHistory(ordersRnd, tables, items, managerId, waiterId, settings) {
  const methods = ['cash', 'momo', 'card'];
  const notesPool = ['', '', '', 'No onions please', 'Extra spicy', 'Serve together'];
  let created = 0;

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const dayOrders = 2 + Math.floor(ordersRnd() * 4); // 2-5 orders/day
    for (let i = 0; i < dayOrders; i++) {
      const table = tables[Math.floor(ordersRnd() * tables.length)];
      const base = new Date();
      base.setUTCDate(base.getUTCDate() - daysAgo);
      base.setUTCHours(11 + Math.floor(ordersRnd() * 10), Math.floor(ordersRnd() * 60), 0, 0);

      // One closed session per (table, day slot)
      const session = await TableSession.create({
        table: table._id,
        status: 'closed',
        openedAt: base,
        closedAt: new Date(base.getTime() + 90 * 60000),
        sessionId: `seed-${daysAgo}-${table.number}-${i}`,
        lastActivityAt: base
      });

      const orderCount = 1 + Math.floor(ordersRnd() * 2);
      let sessionTotal = 0;
      for (let j = 0; j < orderCount; j++) {
        const picked = [];
        const nItems = 1 + Math.floor(ordersRnd() * 3);
        for (let k = 0; k < nItems; k++) {
          const it = items[Math.floor(ordersRnd() * items.length)];
          if (picked.find((p) => String(p.item._id) === String(it._id))) continue;
          picked.push({ item: it, quantity: 1 + Math.floor(ordersRnd() * 2) });
        }
        if (picked.length === 0) continue;

        const snapItems = picked.map((p) => ({
          menuItem: p.item._id,
          nameSnapshot: p.item.name,
          priceSnapshot: p.item.price,
          quantity: p.quantity,
          selectedOptions: [],
          note: notesPool[Math.floor(ordersRnd() * notesPool.length)],
          station: p.item.station
        }));
        const totals = computeTotals(snapItems, settings);

        const key = `orders-${kigaliDateKey(base)}`;
        const counter = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        const at = new Date(base.getTime() + j * 25 * 60000);

        const order = await Order.create({
          orderNumber: formatOrderNumber(counter.seq),
          table: table._id,
          session: session._id,
          items: snapItems,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          serviceCharge: totals.serviceCharge,
          total: totals.total,
          status: 'paid',
          statusHistory: [
            { status: 'pending', at, by: 'customer', byRole: 'customer' },
            { status: 'accepted', at: new Date(at.getTime() + 2 * 60000), by: 'Jean Bosco', byRole: 'chef' },
            { status: 'preparing', at: new Date(at.getTime() + 4 * 60000), by: 'Jean Bosco', byRole: 'chef' },
            { status: 'ready', at: new Date(at.getTime() + (12 + Math.floor(ordersRnd() * 15)) * 60000), by: 'Jean Bosco', byRole: 'chef' },
            { status: 'served', at: new Date(at.getTime() + (14 + Math.floor(ordersRnd() * 15)) * 60000), by: 'Diane Mukamana', byRole: 'waiter' },
            { status: 'paid', at: new Date(at.getTime() + 40 * 60000), by: 'Diane Mukamana', byRole: 'waiter' }
          ],
          notes: notesPool[Math.floor(ordersRnd() * notesPool.length)],
          paymentStatus: 'paid',
          paymentMethod: methods[Math.floor(ordersRnd() * methods.length)],
          createdAt: at,
          updatedAt: at
        });

        await Payment.create({
          session: session._id,
          orders: [order._id],
          amount: totals.total,
          method: order.paymentMethod,
          receivedBy: waiterId
        });

        sessionTotal += totals.total;
        session.orders.push(order._id);
        created++;
      }

      session.totalAmount = sessionTotal;
      session.paymentStatus = 'paid';
      await session.save();
    }
  }
  return created;
}

async function main() {
  console.log('Seeding Cape Town K Hotel…');
  await connectDB();
  await ensureDirs();

  console.log('  dropping database');
  await mongoose.connection.dropDatabase();

  // ---- Settings
  const settings = await Settings.create({ key: 'main', ...SETTINGS });
  console.log(`  settings (announcement: ${settings.announcement ? 'set' : 'none'})`);

  // ---- Staff users
  const users = {};
  for (const u of USERS) {
    const { password, ...rest } = u;
    users[u.username] = await User.create({
      ...rest,
      passwordHash: await bcrypt.hash(password, 10)
    });
  }
  console.log(`  ${USERS.length} staff users`);

  // ---- Tables 1..N with signed QR tokens
  const tables = [];
  for (let n = 1; n <= TABLE_COUNT; n++) {
    const t = await Table.create({ number: n, label: `Table ${n}`, capacity: 2 + (n % 5), qrToken: 'pending' });
    t.qrToken = signTableToken(t._id, t.tokenVersion);
    await t.save();
    tables.push(t);
  }
  console.log(`  ${TABLE_COUNT} tables with signed QR tokens`);

  // ---- Categories
  const catByKey = {};
  for (const c of CATEGORIES) {
    const { key, ...doc } = c;
    catByKey[key] = await Category.create({ ...doc, isActive: true });
  }
  console.log(`  ${CATEGORIES.length} categories`);

  // ---- Menu items (images: per-item source if present, else the category image)
  const items = [];
  for (const [idx, it] of ITEMS.entries()) {
    const { cat, key, ...doc } = it;
    const image = (await processImage(key)) || (await processImage(cat));
    items.push(
      await MenuItem.create({
        ...doc,
        category: catByKey[cat]._id,
        image: image || { url: '', thumbUrl: '' },
        sortOrder: idx
      })
    );
  }
  const withImg = items.filter((i) => i.image.url).length;
  console.log(`  ${items.length} menu items (${withImg} with images)`);

  // ---- Promos
  const now = Date.now();
  for (const p of PROMOS) {
    await Promo.create({ ...p, validFrom: new Date(now - 86400000), validTo: new Date(now + 90 * 86400000), used: 0 });
  }
  console.log(`  ${PROMOS.length} promo codes`);

  // ---- Sample order history (feeds the reports dashboard)
  const ordersRnd = rng(42);
  const count = await seedHistory(ordersRnd, tables, items, users.manager._id, users.waiter._id, settings);
  console.log(`  ${count} sample orders across ${HISTORY_DAYS} days`);

  // ---- PWA icons + logo
  await buildIcons();
  console.log('  PWA icons generated');

  console.log('\nSeed complete. Table URLs (print these QRs from Manager → Tables):');
  for (const t of tables) {
    console.log(`   Table ${String(t.number).padStart(2, '0')}  ${config.baseUrl}/menu?t=${t.qrToken}`);
  }
  console.log('\nStaff logins:  manager/Paradize2026  chef/Kitchen2026  waiter/Service2026');
  console.log('Change these passwords before going live.\n');
}

main()
  .then(() => disconnectDB())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
