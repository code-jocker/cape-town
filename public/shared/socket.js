/**
 * Socket.IO connection manager (client side).
 * Socket.IO ships as a UMD bundle, so we inject <script src="/socket.io/socket.io.js">
 * and use window.io. Wraps connect/disconnect/reconnect events and exposes a
 * small on()/emit() API plus a status banner callback.
 */

import { el } from './dom.js';

let socket = null;
const handlers = new Map();
let onReconnect = null;
let banner = null;
let bannerMode = 'none'; // none | staff | customer
let customerCtx = { tableToken: null, orderIds: [] };

/**
 * connect({ mode: 'staff' | 'customer', tableToken?, orderIds?, onReady? })
 * Staff clients authenticate via the httpOnly cookie automatically.
 * Customers join rooms with their signed table token.
 */
export async function connectSocket({ mode = 'staff', tableToken = null, orderIds = [], onReady } = {}) {
  bannerMode = mode;
  if (mode === 'customer') customerCtx = { tableToken, orderIds: [...orderIds] };
  ensureBanner();

  await loadIoScript();

  socket = window.io({
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    hideBanner();
    const payload = mode === 'customer' ? { tableToken: customerCtx.tableToken, orderIds: customerCtx.orderIds } : {};
    socket.emit('join', payload);
    // After every reconnect the caller re-fetches authoritative state.
    if (onReconnect && socket.recovered !== true) onReconnect();
    if (onReady) onReady();
  });

  socket.on('disconnect', () => showBanner('reconnecting'));
  socket.io.on('reconnect_attempt', () => showBanner('reconnecting'));

  for (const [event, fns] of handlers) {
    for (const fn of fns) socket.on(event, fn);
  }
}

/**
 * Customers: update the set of order rooms to join (e.g. after placing a new
 * order) and re-emit join so the server subscribes this socket immediately.
 */
export function joinCustomerOrders(orderIds) {
  customerCtx.orderIds = [...orderIds];
  if (socket && socket.connected && customerCtx.tableToken) {
    socket.emit('join', { tableToken: customerCtx.tableToken, orderIds: customerCtx.orderIds });
  }
}

/** Called when the socket (re)connects — clients use this to re-fetch state. */
export function setOnReconnect(fn) {
  onReconnect = fn;
  if (socket && socket.connected) fn();
}

export function on(event, fn) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  if (socket) socket.on(event, fn);
  return () => {
    const set = handlers.get(event);
    if (set) set.delete(fn);
  };
}

export function emit(event, payload) {
  if (socket && socket.connected) socket.emit(event, payload);
}

export function is_connected() {
  return !!(socket && socket.connected);
}

function loadIoScript() {
  if (window.io) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('socket.io script failed to load'));
    document.head.appendChild(script);
  });
}

/* ---------- connection banner ---------- */
function ensureBanner() {
  if (banner) return;
  banner = el('div', { class: 'conn-banner', role: 'status', 'aria-live': 'polite', text: 'Connection lost — reconnecting…' });
  document.body.appendChild(banner);
}

function showBanner(kind) {
  if (!banner || bannerMode === 'none') return;
  banner.classList.add('show');
  banner.classList.toggle('reconnecting', kind === 'reconnecting');
  banner.textContent = kind === 'reconnecting' ? 'Reconnecting…' : 'You are offline — orders may not send';
}

function hideBanner() {
  if (banner) banner.classList.remove('show');
}
