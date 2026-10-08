/* Cape Town K Hotel service worker.
 * Strategy:
 *   - precache: every page + all shared/customer modules + icons
 *   - static assets: stale-while-revalidate (fast, offline-safe)
 *   - navigations: network-first, fall back to cache, then /offline.html
 *   - /api/public/menu: network-first, cache last good copy (menu browsable offline)
 *   - everything else under /api: network only (never cache orders/requests)
 * Every handler ALWAYS resolves to a Response so respondWith never rejects.
 */
const VERSION = 'ep-v4';
const STATIC = `${VERSION}-static`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = [
  '/menu',
  '/kitchen/index.html',
  '/waiter/index.html',
  '/manager/index.html',
  '/login.html',
  '/offline.html',
  '/shared/base.css',
  '/shared/browser-check.js',
  '/shared/api.js',
  '/shared/audio.js',
  '/shared/auth.js',
  '/shared/dom.js',
  '/shared/format.js',
  '/shared/i18n.js',
  '/shared/socket.js',
  '/shared/store.js',
  '/shared/theme.js',
  '/shared/haptics.js',
  '/shared/pull-to-refresh.js',
  '/customer/style.css',
  '/customer/menu.js',
  '/customer/cart.js',
  '/customer/tracker.js',
  '/kitchen/kitchen.css',
  '/kitchen/kitchen.js',
  '/waiter/waiter.css',
  '/waiter/waiter.js',
  '/manager/manager.css',
  '/manager/manager.js',
  '/manager/ui.js',
  '/manager/views/audit.js',
  '/manager/views/dashboard.js',
  '/manager/views/menu.js',
  '/manager/views/orders.js',
  '/manager/views/promos.js',
  '/manager/views/reports.js',
  '/manager/views/settings.js',
  '/manager/views/staff.js',
  '/manager/views/tables.js',
  '/login.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) =>
        Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept POST (orders, requests)

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: only cache the public menu; everything else is network-only.
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/public/menu') event.respondWith(networkFirst(req, RUNTIME));
    return;
  }

  // HTML navigation: network-first with offline fallback.
  if (req.mode === 'navigate' || url.pathname === '/menu') {
    event.respondWith(networkFirst(req, STATIC, ['/offline.html']));
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req, STATIC));
});

/* Never throw — cache access failures must not break the page. */
async function matchCache(cacheName, key) {
  try {
    return await caches.match(key, { cacheName });
  } catch (e) {
    return undefined;
  }
}
function putCache(cacheName, req, res) {
  try {
    caches.open(cacheName).then((c) => c.put(req, res.clone())).catch(() => {});
  } catch (e) {
    /* ignore */
  }
}
function offlineResponse() {
  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function networkFirst(req, cacheName, fallbacks = []) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) putCache(cacheName, req, fresh);
    return fresh;
  } catch (e) {
    for (const key of [req, ...fallbacks]) {
      const cached = await matchCache(cacheName, key);
      if (cached) return cached;
    }
    return offlineResponse();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cached = await matchCache(cacheName, req);
  // Revalidate in the background; failures are ignored.
  fetch(req)
    .then((res) => {
      if (res && res.ok) putCache(cacheName, req, res);
    })
    .catch(() => {});
  if (cached) return cached;
  try {
    return await fetch(req);
  } catch (e) {
    return offlineResponse();
  }
}
