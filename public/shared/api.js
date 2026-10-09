/**
 * Fetch wrapper for the Cape Town K Hotel API.
 * Server always answers { ok:true, data } or { ok:false, error:{code,message} }.
 * - timeouts + automatic retry with backoff on network failures
 * - throws ApiError with .code and .status for callers to branch on
 * - on401 hook for staff pages (redirect to login)
 */

const META_API = document.querySelector('meta[name="api-base"]')?.content;
const GLOBAL_API = window.__API_BASE_URL__;
const BASE_URL = (META_API || GLOBAL_API || '').replace(/%.*%/, '').replace(/\/$/, '');
if (!BASE_URL) console.warn('API base URL not configured — falling back to same-origin');
if (!BASE_URL) console.warn('API base URL not configured — falling back to same-origin');

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN';
    this.status = status || 0;
  }
}

let authCookieBased = true; // staff auth uses httpOnly cookies; nothing to attach
let onUnauthorized = null;
const defaultHeaders = {};

/** Register a callback fired on any 401 (e.g. location.href='/login.html'). */
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

/**
 * Attach a header to every subsequent request from this client.
 * The customer app uses this to send its signed table token (x-table-token)
 * on all /api/public/* calls without threading it through each call site.
 */
export function setDefaultHeader(name, value) {
  if (value == null) delete defaultHeaders[name];
  else defaultHeaders[name] = value;
}

async function rawRequest(path, { method = 'GET', body, headers = {}, timeout = 12000, signal } = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeout) : setTimeout(() => {}, 0);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const res = await fetch(BASE_URL + path, {
      method,
      headers: {
        ...defaultHeaders,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: authCookieBased ? 'include' : 'same-origin',
      signal: controller ? controller.signal : undefined
    });
    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      /* non-JSON response */
    }
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    if (json && typeof json.ok === 'boolean') {
      const errObj = json.error || {};
      if (!json.ok) throw new ApiError(errObj.code, errObj.message || 'Request failed', res.status);
      return json.data;
    }
    if (!res.ok) throw new ApiError('HTTP_' + res.status, res.statusText || 'Request failed', res.status);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * api(path, opts) — single attempt.
 * api.retryable(path, opts) — up to 3 attempts with backoff (network errors only).
 */
export async function api(path, opts = {}) {
  return rawRequest(path, opts);
}

export async function apiRetryable(path, opts = {}) {
  const delays = [400, 1200];
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await rawRequest(path, opts);
    } catch (err) {
      lastErr = err;
      // Only retry genuine network failures / timeouts, never API errors.
      const retriable = !(err instanceof ApiError);
      if (!retriable || attempt === delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}
