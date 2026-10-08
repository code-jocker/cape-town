/**
 * Tiny reactive store: get/set/subscribe backed by window CustomEvents,
 * so separate ES modules (and separate tabs via storage events) stay in sync.
 */

const PREFIX = 'ep-store:';

export function storeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function storeSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* storage full/private mode — in-memory only */
  }
  window.dispatchEvent(new CustomEvent(PREFIX + key, { detail: value }));
}

export function storeSubscribe(key, fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(PREFIX + key, handler);
  window.addEventListener('storage', (e) => {
    if (e.key === PREFIX + key) fn(safeParse(e.newValue));
  });
  return () => window.removeEventListener(PREFIX + key, handler);
}

function safeParse(raw) {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
