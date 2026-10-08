/**
 * Staff auth helpers shared by the kitchen, waiter and manager apps.
 * Auth is a httpOnly cookie, so the browser attaches it automatically;
 * these helpers only resolve "who am I" and gate pages by role.
 */
import { api, setOnUnauthorized } from './api.js';

let me = null;

/** Redirect unauthenticated staff to the login page (once). */
export function installAuthRedirect() {
  setOnUnauthorized(() => {
    const back = encodeURIComponent(location.pathname + location.search);
    if (!location.pathname.endsWith('/login.html')) location.href = `/login.html?next=${back}`;
  });
}

/**
 * Resolve the current staff member. Redirects to /login.html when the cookie
 * is missing/expired, or when the role is not allowed on this page.
 * @param {string[]} [roles] allowed roles; omit to allow any staff
 * @returns {Promise<{id,name,role}>}
 */
export async function requireStaff(roles) {
  installAuthRedirect();
  try {
    me = await api('/api/auth/me');
  } catch {
    const back = encodeURIComponent(location.pathname + location.search);
    location.href = `/login.html?next=${back}`;
    return new Promise(() => {}); // never resolves; page is navigating away
  }
  if (roles && roles.length && !roles.includes(me.role)) {
    document.body.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'guard-message';
    box.textContent = `Your role (${me.role}) cannot open this page.`;
    const link = document.createElement('a');
    link.href = homeFor(me.role);
    link.className = 'btn btn-primary';
    link.textContent = 'Go to my screen';
    box.append(document.createElement('br'), link);
    document.body.append(box);
    return new Promise(() => {});
  }
  return me;
}

export function currentStaff() {
  return me;
}

/** Default landing page per role. */
export function homeFor(role) {
  if (role === 'chef') return '/kitchen/';
  if (role === 'waiter') return '/waiter/';
  return '/manager/';
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  location.href = '/login.html';
}
