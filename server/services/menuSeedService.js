import { Settings } from '../models/Settings.js';
import { logger } from '../utils/logger.js';
import { syncMenu } from '../seed/menu.js';

export const OFFICIAL_MENU_SEED_VERSION = 'cape-town-menu-2026-10-v1';

export async function ensureOfficialMenuSeeded() {
  const settings = await Settings.get();
  if (settings.menuSeedVersion === OFFICIAL_MENU_SEED_VERSION) {
    logger.info({ version: OFFICIAL_MENU_SEED_VERSION }, 'Official menu already seeded');
    return false;
  }

  const result = await syncMenu();
  await Settings.updateOne(
    { key: 'main' },
    { $set: { menuSeedVersion: OFFICIAL_MENU_SEED_VERSION } }
  );
  logger.info({ version: OFFICIAL_MENU_SEED_VERSION, ...result }, 'Official menu seeded');
  return true;
}