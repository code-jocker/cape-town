import crypto from 'node:crypto';

/** Parse a Cookie header into an object. No deps needed. */
export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export const AUTH_COOKIE = 'ep_token';

export function authCookieOptions(isProd, maxAgeMs) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs
  };
}

export const newId = () => crypto.randomUUID();
