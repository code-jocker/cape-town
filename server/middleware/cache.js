/**
 * Tiny in-memory caches for hot read paths (menu, settings).
 * Invalidated by any write through the cache layer.
 */
const stores = new Map();

function makeCache(name, ttlMs) {
  let data = null;
  let loadedAt = 0;
  return {
    async get(loader) {
      if (data && Date.now() - loadedAt < ttlMs) return data;
      data = await loader();
      loadedAt = Date.now();
      stores.get(name).instances++;
      return data;
    },
    invalidate() {
      data = null;
      loadedAt = 0;
    }
  };
}

export const menuCache = makeCache('menu', 60_000);
export const settingsCache = makeCache('settings', 60_000);

stores.set('menu', { instances: 0 });
stores.set('settings', { instances: 0 });

export function invalidateMenuCache() {
  menuCache.invalidate();
}

export function invalidateSettingsCache() {
  settingsCache.invalidate();
}
