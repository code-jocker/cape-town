/**
 * Cart model — one cart per table, persisted in localStorage.
 * NOTE: all prices here are display estimates; the server recomputes
 * every total when the order is placed (authoritative).
 */

const keyFor = (tableId) => `ep-cart-${tableId}`;

export function getCart(tableId) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(tableId))) || { lines: [], promo: '' };
  } catch {
    return { lines: [], promo: '' };
  }
}

export function setCart(tableId, cart) {
  localStorage.setItem(keyFor(tableId), JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('ep-cart', { detail: cart }));
}

/** Stable signature so the same item + options merge into one line. */
function signature(line) {
  const opts = (line.selectedOptions || [])
    .map((o) => `${o.name}:${[...o.choices].sort().join('|')}`)
    .sort()
    .join(';');
  return `${line.itemId}::${opts}::${line.note || ''}`;
}

/** Add or merge a line. Returns the updated cart. */
export function addToCart(tableId, line) {
  const cart = getCart(tableId);
  const sig = signature(line);
  const existing = cart.lines.find((l) => l._sig === sig);
  if (existing) {
    existing.quantity = Math.min(50, existing.quantity + line.quantity);
  } else {
    cart.lines.push({ ...line, _sig: sig });
  }
  setCart(tableId, cart);
  return cart;
}

export function changeQuantity(tableId, sig, delta) {
  const cart = getCart(tableId);
  const line = cart.lines.find((l) => l._sig === sig);
  if (!line) return cart;
  line.quantity += delta;
  if (line.quantity <= 0) {
    cart.lines = cart.lines.filter((l) => l !== line);
  }
  setCart(tableId, cart);
  return cart;
}

export function clearCart(tableId) {
  setCart(tableId, { lines: [], promo: '' });
}

export function setPromo(tableId, code) {
  const cart = getCart(tableId);
  cart.promo = code.trim().toUpperCase();
  setCart(tableId, cart);
}

export function cartCount(cart) {
  return cart.lines.reduce((s, l) => s + l.quantity, 0);
}

/** Rough client-side total (base price + option extras). */
export function cartEstimate(cart) {
  return cart.lines.reduce(
    (sum, l) =>
      sum +
      l.quantity *
        (l.price +
          (l.selectedOptions || []).reduce(
            (s, o) => s + (o.extras || []).reduce((x, e) => x + (e.extraPrice || 0), 0),
            0
          )),
    0
  );
}

/** Map cart lines to the API payload shape. */
export function toOrderPayload(tableId) {
  const cart = getCart(tableId);
  return {
    items: cart.lines.map((l) => ({
      menuItemId: l.itemId,
      quantity: l.quantity,
      selectedOptions: (l.selectedOptions || []).map((o) => ({ name: o.name, choices: (o.choices || []).map((c) => c.label) })),
      note: l.note || undefined
    })),
    promoCode: cart.promo || undefined
  };
}

/* ---------- Offline order queue (one pending order per table) ---------- */

const pendingKey = (tableId) => `ep-pending-${tableId}`;

export function savePendingOrder(tableId, payload) {
  localStorage.setItem(pendingKey(tableId), JSON.stringify(payload));
}

export function getPendingOrder(tableId) {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(tableId)));
  } catch {
    return null;
  }
}

export function clearPendingOrder(tableId) {
  localStorage.removeItem(pendingKey(tableId));
}

/* ---------- Active orders of this table session ---------- */

const ordersKey = (tableId) => `ep-orders-${tableId}`;

export function getOrders(tableId) {
  try {
    return JSON.parse(localStorage.getItem(ordersKey(tableId))) || [];
  } catch {
    return [];
  }
}

export function setOrders(tableId, orders) {
  localStorage.setItem(ordersKey(tableId), JSON.stringify(orders));
}

export function addOrder(tableId, order) {
  const orders = getOrders(tableId).filter((o) => o.id !== order.id);
  orders.push(order);
  setOrders(tableId, orders);
}
