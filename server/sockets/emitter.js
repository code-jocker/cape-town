/**
 * Socket.IO emit helpers. Kept separate from socket setup so services can
 * emit events without circular imports. io is injected once at startup.
 */
let io = null;

export function setEmitter(server) {
  io = server;
}

function toRoom(room, event, payload) {
  if (!io) return;
  io.to(room).emit(event, { ...payload, at: payload.at || Date.now() });
}

export const emitOrderNew = (data) =>
  ['kitchen', 'waiters', 'managers'].forEach((r) => toRoom(r, 'order:new', data));

export const emitOrderUpdated = (data) => {
  ['kitchen', 'waiters', 'managers'].forEach((r) => toRoom(r, 'order:updated', data));
  if (data.orderId) toRoom(`order:${data.orderId}`, 'order:updated', data);
};

export const emitOrderReady = (data) => {
  toRoom('waiters', 'order:ready', data);
  if (data.orderId) toRoom(`order:${data.orderId}`, 'order:updated', { ...data, status: 'ready' });
};

export const emitMenuAvailability = (data) => {
  if (io) io.emit('menu:availability', { ...data, at: Date.now() });
};

export const emitRequestNew = (data) =>
  ['waiters', 'managers'].forEach((r) => toRoom(r, 'request:new', data));

export const emitRequestHandled = (data) =>
  ['waiters', 'managers'].forEach((r) => toRoom(r, 'request:handled', data));

export const emitSessionClosed = (data) =>
  ['waiters', 'managers'].forEach((r) => toRoom(r, 'session:closed', data));

/** Compact board/stats snapshot for managers, throttled to max 1/sec. */
let lastStats = { payload: null, at: 0 };
export function emitStats(payload) {
  if (!io) return;
  const now = Date.now();
  if (now - lastStats.at < 1000) return;
  lastStats = { payload, at: now };
  toRoom('managers', 'stats:update', payload);
}
