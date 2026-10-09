import { $ } from './shared/dom.js';
import { api, ApiError } from './shared/api.js';
import { homeFor } from './shared/auth.js';

const form = $('#login-form');
const errBox = $('#login-error');
const btn = $('#login-btn');

const params = new URLSearchParams(location.search);
const next = params.get('next');

function goTo(role) {
  if (next && next.startsWith('/') && !next.startsWith('//')) location.href = next;
  else location.href = homeFor(role);
}

// Already signed in? Skip the form.
api('/api/auth/me')
  .then((me) => goTo(me.role))
  .catch(() => {
    /* not logged in — show the form */
  });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  const username = $('#username').value.trim();
  const password = $('#password').value;
  if (!username || !password) {
    errBox.textContent = 'Enter your username and password.';
    errBox.hidden = false;
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const me = await api('/api/auth/login', { method: 'POST', body: { username, password } });
    goTo(me.role);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Sign in';
    if (err instanceof ApiError && err.code === 'ACCOUNT_LOCKED') errBox.textContent = err.message;
    else if (err instanceof ApiError) errBox.textContent = err.message;
    else errBox.textContent = 'Cannot reach the server. Check your connection.';
    errBox.hidden = false;
    $('#password').select();
  }
});
