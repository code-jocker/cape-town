/* Cape Town K Hotel service worker.
 * Strategy:
 *   - static assets + icons + uploads: stale-while-revalidate (fast, offline-safe)
 *   - /menu HTML: network-first, fall back to cache (always fresh, works offline)
 *   - /api/public/menu: network-first, cache last good copy (menu browsable offline)
 *   - everything else under /api: network only (never cache orders/requests)
 * Every handler ALWAYS resolves to a Response so respondWith never rejects.
 */
const VERSION = 'ep-v2';
const STATIC = `${VERSION}-static`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = ['/menu', '/shared/base.css', '/customer/style.css', '/customer/menu.js', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
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

  // HTML navigation (/menu): network-first with cache fallback.
  if (req.mode === 'navigate' || url.pathname === '/menu') {
    event.respondWith(networkFirst(req, STATIC));
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req, STATIC));
});

/* Never throw — cache access failures must not break the page. */
async function matchCache(cacheName, key) {
  try {
    return await caches.match(key, { cacheName });
  } catch {
    return undefined;
  }
}
function putCache(cacheName, req, res) {
  try {
    caches.open(cacheName).then((c) => c.put(req, res.clone())).catch(() => {});
  } catch {
    /* ignore */
  }
}
function offlineResponse() {
  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function networkFirst(req, cacheName) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) putCache(cacheName, req, fresh);
    return fresh;
  } catch {
    const cached = (await matchCache(cacheName, req)) || (await matchCache(cacheName, '/menu'));
    return cached || offlineResponse();
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
  } catch {
    return offlineResponse();
  }
}
