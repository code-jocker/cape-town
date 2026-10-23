import http from 'node:http';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { startCron } from './config/cron.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  startCron();

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
