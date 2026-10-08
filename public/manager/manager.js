/**
 * Manager dashboard shell + hash router.
 * Each view is a lazy-loaded module exporting { title, render(root) }.
 */
import { $, $$, el } from '../shared/dom.js';
import { connectSocket, on, setOnReconnect } from '../shared/socket.js';
import { requireStaff, logout } from '../shared/auth.js';
import { initModal, toast } from './ui.js';

const NAV = [
  { route: 'dashboard', label: 'Dashboard', ico: '📊', load: () => import('./views/dashboard.js') },
  { route: 'orders', label: 'Orders', ico: '🧾', load: () => import('./views/orders.js') },
  { route: 'menu', label: 'Menu', ico: '🍽️', load: () => import('./views/menu.js') },
  { route: 'tables', label: 'Tables & QR', ico: '🔳', load: () => import('./views/tables.js') },
  { route: 'staff', label: 'Staff', ico: '👥', load: () => import('./views/staff.js') },
  { route: 'promos', label: 'Promos', ico: '🏷️', load: () => import('./views/promos.js') },
  { route: 'reports', label: 'Reports', ico: '📈', load: () => import('./views/reports.js') },
  { route: 'settings', label: 'Settings', ico: '⚙️', load: () => import('./views/settings.js') },
  { route: 'audit', label: 'Audit log', ico: '📜', load: () => import('./views/audit.js') }
];

let current = null;
const liveListeners = new Set();

/** Views can subscribe to live stats pushes. Returns an unsubscribe fn. */
export function onLiveStats(fn) {
  liveListeners.add(fn);
  return () => liveListeners.delete(fn);
}

function buildNav() {
  const nav = $('#side-nav');
  nav.innerHTML = '';
  for (const item of NAV) {
    nav.append(
      el('a', { href: `#/${item.route}`, 'data-route': item.route }, el('span', { class: 'ico', text: item.ico }), el('span', { text: item.label }))
    );
  }
}

async function router() {
  const route = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0];
  const item = NAV.find((n) => n.route === route) || NAV[0];

  $$('#side-nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === item.route));
  $('#page-title').textContent = item.label;
  $('#sidebar').classList.remove('open');

  const root = $('#content');
  root.innerHTML = '';
  root.append(el('div', { class: 'spinner' }));

  try {
    const mod = await item.load();
    root.innerHTML = '';
    current = mod;
    await mod.render(root);
  } catch (err) {
    root.innerHTML = '';
    root.append(el('div', { class: 'panel text-danger', text: `Could not load ${item.label}: ${err.message}` }));
  }
}

function clock() {
  $('#clock').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function boot() {
  const me = await requireStaff(['manager']);
  $('#whoami').textContent = `${me.name}`;
  initModal();
  buildNav();
  clock();
  setInterval(clock, 30000);

  $('#logout').addEventListener('click', logout);
  $('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  window.addEventListener('hashchange', router);

  on('stats:update', (payload) => {
    for (const fn of liveListeners) {
      try {
        fn(payload);
      } catch {}
    }
  });
  on('order:new', () => toast('New order received'));
  setOnReconnect(() => $('#live-dot').classList.remove('off'));

  await connectSocket({
    mode: 'staff',
    onReady: () => $('#live-dot').classList.remove('off')
  });

  await router();
}

boot();
