import http from 'node:http';
import bcrypt from 'bcrypt';
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

async function autoSeed() {
  try {
    const count = await User.countDocuments({});
    if (count > 0) {
      logger.info(`Database has ${count} users — skipping auto-seed`);
      return;
    }
    logger.info('Database empty — auto-seeding default data...');

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

    for (const [idx, it] of ITEMS.entries()) {
      const { cat, key, ...doc } = it;
      await MenuItem.create({ ...doc, category: catByKey[cat]._id, sortOrder: idx });
    }
    logger.info(`Created ${ITEMS.length} menu items`);

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

  server.listen(config.port, () => {
    logger.info(`Cape Town K Hotel running → ${config.baseUrl} (${config.env})`);
    logger.info(`Customer menu: ${config.baseUrl}/menu?t=<table-token>`);
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
