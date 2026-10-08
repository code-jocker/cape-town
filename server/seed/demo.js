/**
 * Demo simulator — drives a running Cape Town K Hotel server through its real
 * HTTP API so live (Socket.IO) events actually fire:
 *
 *   every ~20s: a random table places an order
 *   +4s:        chef accepts -> preparing -> ready
 *   +8s:        waiter marks served (and pays some of them)
 *   occasionally: a table taps "Call waiter" and the waiter handles it
 *
 * Prerequisite: server running (npm run dev) and seeded (npm run seed).
 * Run:          npm run demo
 */
import { config } from '../config/env.js';

const BASE = process.env.DEMO_BASE_URL || `http://localhost:${config.port}`;
const INTERVAL_MS = parseInt(process.env.DEMO_INTERVAL_MS || '20000', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function api(path, { method = 'GET', body, cookie, tableToken } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(tableToken ? { 'x-table-token': tableToken } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(`${method} ${path} -> ${res.status} ${json?.error?.code || ''} ${json?.error?.message || ''}`);
  }
  const setCookie = res.headers.getSetCookie?.() || [];
  const auth = setCookie.find((c) => c.startsWith('ep_token='));
  return { data: json.data, cookie: auth ? auth.split(';')[0] : null };
}

async function login(username, password) {
  const { cookie } = await api('/api/auth/login', { method: 'POST', body: { username, password } });
  if (!cookie) throw new Error(`Login for "${username}" returned no auth cookie`);
  return cookie;
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`Server not reachable at ${BASE} — start it first (npm run dev)`);
}

async function main() {
  console.log(`Demo simulator -> ${BASE}`);
  await waitForServer();

  const manager = await login('manager', 'Paradize2026');
  const chef = await login('chef', 'Kitchen2026');
  const waiter = await login('waiter', 'Service2026');

  const { data: tables } = await api('/api/tables', { cookie: manager });
  if (!tables.length) throw new Error('No tables found — run npm run seed first');
  console.log(`Got ${tables.length} tables`);

  const { data: menu } = await api('/api/public/menu', { tableToken: tables[0].qrToken });
  if (!menu.items.length) throw new Error('Menu is empty — run npm run seed first');
  console.log(`Got ${menu.items.length} menu items. Simulating live activity (Ctrl+C to stop)…\n`);

  let tick = 0;
  const openOrders = [];

  // Advance one order one step (chef side: accepted/preparing/ready; waiter: served/paid)
  async function advance() {
    const entry = openOrders.find((o) => o.next.length > 0);
    if (!entry) return;
    const status = entry.next.shift();
    await api(`/api/orders/${entry.id}/status`, { method: 'PATCH', body: { status }, cookie: chef });
    console.log(`   chef/waiter: ${entry.no} -> ${status}`);
    if (status === 'ready') {
      await sleep(4000);
      await api(`/api/orders/${entry.id}/status`, { method: 'PATCH', body: { status: 'served' }, cookie: waiter });
      console.log(`   waiter: ${entry.no} -> served`);
      if (Math.random() < 0.6) {
        await sleep(2000);
        await api(`/api/orders/${entry.id}/pay`, { method: 'POST', body: { method: pick(['cash', 'momo', 'card']) }, cookie: waiter });
        console.log(`   waiter: ${entry.no} -> paid`);
      }
    }
  }

  async function placeOrder() {
    const table = pick(tables);
    const nItems = 1 + Math.floor(Math.random() * 3);
    const chosen = [];
    for (let i = 0; i < nItems; i++) {
      const it = pick(menu.items);
      if (!chosen.find((c) => c.menuItemId === it._id)) {
        const selectedOptions = (it.options || [])
          .filter((o) => o.required)
          .map((o) => ({ name: o.name, choices: [pick(o.choices).label] }));
        chosen.push({
          menuItemId: it._id,
          quantity: 1 + Math.floor(Math.random() * 2),
          selectedOptions,
          note: Math.random() < 0.3 ? pick(['No onions please', 'Extra spicy', 'Serve with the drinks']) : undefined
        });
      }
    }
    const { data } = await api('/api/public/orders', {
      method: 'POST',
      tableToken: table.qrToken,
      body: { items: chosen, idempotencyKey: `demo-${Date.now()}-${Math.floor(Math.random() * 1e6)}` }
    });
    if (data.duplicate) return;
    openOrders.push({
      id: data.order.id,
      no: data.order.orderNumber,
      next: ['accepted', 'preparing', 'ready']
    });
    console.log(`order: ${data.order.orderNumber}  table ${table.number}  ${chosen.length} item(s)  RWF ${data.order.total.toLocaleString('en-US')}`);
  }

  async function serviceRequest() {
    const table = pick(tables);
    const type = pick(['waiter', 'water', 'bill']);
    const { data: req } = await api('/api/public/requests', {
      method: 'POST',
      tableToken: table.qrToken,
      body: { type }
    });
    console.log(`request: table ${table.number} taps "${type}"`);
    await sleep(5000);
    await api(`/api/requests/${req.id}/handle`, { method: 'PATCH', cookie: waiter });
    console.log(`request: handled by waiter`);
  }

  while (true) {
    try {
      await placeOrder();
      await sleep(4000);
      await advance();
      if (tick % 4 === 3) {
        await serviceRequest();
      }
      await sleep(INTERVAL_MS);
      await advance();
    } catch (err) {
      console.error('demo step failed:', err.message);
      await sleep(5000);
    }
    tick++;
  }
}

main().catch((err) => {
  console.error('Demo failed:', err.message);
  process.exit(1);
});
