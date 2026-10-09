import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import bcrypt from 'bcrypt';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { startCron } from './config/cron.js';
import { logger } from './utils/logger.js';
import { User } from './models/User.js';
import { Settings } from './models/Settings.js';
import { Category } from './models/Category.js';
import { MenuItem } from './models/MenuItem.js';
import { Table } from './models/Table.js';
import { signTableToken } from './utils/token.js';
import { USERS, CATEGORIES, ITEMS, SETTINGS } from './seed/data.js';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'public', 'uploads', 'src');
const ITEMS_DIR = path.join(ROOT, 'public', 'uploads', 'items');

async function processImage(name) {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const src = path.join(SRC_DIR, name + ext);
    try {
      await fs.access(src);
      const outName = name.toLowerCase().replace(/\s+/g, '-');
      const out = path.join(ITEMS_DIR, `${outName}.webp`);
      const thumb = path.join(ITEMS_DIR, `${outName}-thumb.webp`);
      await fs.mkdir(ITEMS_DIR, { recursive: true });
      await sharp(src).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
      await sharp(src).resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toFile(thumb);
      return { url: `/uploads/items/${outName}.webp`, thumbUrl: `/uploads/items/${outName}-thumb.webp` };
    } catch {
      /* source missing — try next extension */
    }
  }
  return null;
}

async function ensureImages() {
  try {
    const items = await MenuItem.find({ 'image.url': { $ne: '' } }).lean();
    let generated = 0;
    for (const it of items) {
      const filename = (it.image.url || '').replace('/uploads/items/', '');
      if (!filename) continue;
      const filepath = path.join(ITEMS_DIR, filename);
      try {
        await fs.access(filepath);
      } catch {
        generated++;
      }
    }
    if (generated > 0) {
      logger.info(`Found ${generated} missing image files — regenerating from source`);
      for (const it of items) {
        const filename = (it.image.url || '').replace('/uploads/items/', '');
        if (!filename) continue;
        const filepath = path.join(ITEMS_DIR, filename);
        try {
          await fs.access(filepath);
        } catch {
          const name = filename.replace('.webp', '').replace('-thumb', '');
          const image = (await processImage(name)) || (await processImage(it.category?.toString().slice(-4)));
          if (image) {
            await MenuItem.updateOne({ _id: it._id }, { $set: { image } });
            logger.info(`  Regenerated image for "${it.name}"`);
          }
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Image check failed — continuing');
  }
}

async function autoSeed() {
  try {
    const count = await User.countDocuments({});
    if (count > 0) {
      logger.info(`Database has ${count} users — skipping auto-seed`);
      return;
    }
    logger.info('Database empty — auto-seeding default data...');

    await fs.mkdir(path.join(ROOT, 'public', 'uploads', 'items'), { recursive: true });

    await Settings.create({ key: 'main', ...SETTINGS });

    for (const u of USERS) {
      const { password, ...rest } = u;
      await User.create({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
    }
    logger.info(`Created ${USERS.length} staff users`);

    const catByKey = {};
    for (const c of CATEGORIES) {
      const { key, ...doc } = c;
      catByKey[key] = await Category.create({ ...doc, isActive: true });
    }
    logger.info(`Created ${CATEGORIES.length} categories`);

    let withImg = 0;
    for (const [idx, it] of ITEMS.entries()) {
      const { cat, key, ...doc } = it;
      const image = (await processImage(key)) || (await processImage(cat));
      if (image) withImg++;
      await MenuItem.create({ ...doc, category: catByKey[cat]._id, image: image || { url: '', thumbUrl: '' }, sortOrder: idx });
    }
    logger.info(`Created ${ITEMS.length} menu items (${withImg} with images)`);

    for (let n = 1; n <= 10; n++) {
      const t = await Table.create({ number: n, label: `Table ${n}`, capacity: 2 + (n % 5), qrToken: 'pending' });
      t.qrToken = signTableToken(t._id, t.tokenVersion);
      await t.save();
    }
    logger.info('Created 10 tables with QR tokens');
    logger.info('Auto-seed complete ✓');
  } catch (err) {
    logger.error({ err }, 'Auto-seed failed — continuing startup');
  }
}

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  startCron();

  await autoSeed();
  await ensureImages();

  server.listen(config.port, () => {
    logger.info(`Cape Town K Hotel running → ${config.baseUrl} (${config.env})`);
    logger.info(`Customer menu: ${config.baseUrl}/customer/`);
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'shutting down...');
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // force-exit safety net
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'fatal startup error');
  process.exit(1);
});
