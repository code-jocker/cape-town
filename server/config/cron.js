import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { autoCloseIdleSessions } from '../services/sessionService.js';
import { refreshPopularTags } from '../services/reportService.js';
import { getSettings } from '../services/settingsService.js';

/** Background jobs: session auto-close + daily "popular" tag refresh. */
export function startCron() {
  // every 15 minutes: close sessions idle beyond the configured hours
  cron.schedule('*/15 * * * *', async () => {
    try {
      const settings = await getSettings();
      const closed = await autoCloseIdleSessions(settings.autoCloseHours || 3);
      if (closed > 0) logger.info({ closed }, 'cron: idle sessions closed');
    } catch (err) {
      logger.error({ err: err.message }, 'cron: auto-close failed');
    }
  });

  // daily 03:05 Kigali: auto "popular" tag from sales
  cron.schedule('5 3 * * *', async () => {
    try {
      const res = await refreshPopularTags();
      logger.info(res, 'cron: popular tags refreshed');
    } catch (err) {
      logger.error({ err: err.message }, 'cron: popular tags failed');
    }
  });

  logger.info('Cron jobs scheduled');
}
