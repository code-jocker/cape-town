/**
 * Integration test: boots the real Express app against a dedicated local test
 * database, seeds a minimal fixture, and exercises the full public + staff API
 * contract (auth, RBAC, table tokens, menu, ordering, idempotency, status
 * transitions, payment, service requests, reports).
 *
 * NOTE: mongodb-memory-server's binary download is unreliable on some machines,
 * so this targets a real mongod at 127.0.0.1:27017 using a throwaway database
 * that is dropped before and after the run.
 *
 * Env vars MUST be set before the dynamic imports below, because config reads
 * process.env at import time (and dotenv never overrides an already-set var).
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/cape-town-k-hotel-test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.TABLE_TOKEN_SECRET = 'test-table-token-secret';
// Keep the whole suite far below every rate limit so it never flakes.
process.env.RATE_LIMIT_MAX = '100000';
process.env.LOGIN_RATE_MAX = '100000';
process.env.ORDER_RATE_MAX = '100000';
process.env.REQUEST_RATE_MAX = '100000';

const test = (await import('node:test')).default;
const assert = (await import('node:assert/strict')).default;
const request = (await import('supertest')).default;
const bcrypt = (await import('bcrypt')).default;
const mongoose = (await import('mongoose')).default;

const { connectDB, disconnectDB } = await import('../../config/db.js');
const { createApp } = await import('../../app.js');
const { signTableToken } = await import('../../utils/token.js');
const { User } = await import('../../models/User.js');
const { Table } = await import('../../models/Table.js');
const { Category } = await import('../../models/Category.js');
const { MenuItem } = await import('../../models/MenuItem.js');
const { Settings } = await import('../../models/Settings.js');

let app;
let tokenA; // table 1 QR token
let tokenB; // table 2 QR token
let simpleItem;
let optionItem;
const cookies = {}; // role -> "ep_token=..."

async function login(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  const setCookie = res.headers['set-cookie'] || [];
  const auth = setCookie.find((c) => c.startsWith('ep_token='));
  return { status: res.status, body: res.body, cookie: auth ? auth.split(';')[0] : null };
}

test('integration: API contract end to end', async (t) => {
  t.before(async () => {
    await connectDB();
    await mongoose.connection.dropDatabase();

    await Settings.create({ key: 'main', taxRate: 0, serviceCharge: 0 });

    for (const [username, role, password, name] of [
      ['manager', 'manager', 'Paradize2026', 'Test Manager'],
      ['chef', 'chef', 'Kitchen2026', 'Test Chef'],
      ['waiter', 'waiter', 'Service2026', 'Test Waiter']
    ]) {
      await User.create({ name, username, role, passwordHash: await bcrypt.hash(password, 10) });
    }

    const tableA = await Table.create({ number: 1, label: 'Table 1', capacity: 4, qrToken: 'pending' });
    tableA.qrToken = signTableToken(tableA._id, tableA.tokenVersion);
    await tableA.save();
    tokenA = tableA.qrToken;

    const tableB = await Table.create({ number: 2, label: 'Table 2', capacity: 4, qrToken: 'pending' });
    tableB.qrToken = signTableToken(tableB._id, tableB.tokenVersion);
    await tableB.save();
    tokenB = tableB.qrToken;

    const cat = await Category.create({ name: { en: 'Mains' }, sortOrder: 0, isActive: true });
    simpleItem = await MenuItem.create({
      name: { en: 'Grilled Tilapia' },
      price: 4000,
      category: cat._id,
      station: 'kitchen',
      isAvailable: true,
      sortOrder: 0
    });
    optionItem = await MenuItem.create({
      name: { en: 'Steak' },
      price: 6000,
      category: cat._id,
      station: 'kitchen',
      isAvailable: true,
      sortOrder: 1,
      options: [
        { name: 'Size', required: true, multiple: false, choices: [{ label: 'Regular', extraPrice: 0 }, { label: 'Large', extraPrice: 1500 }] }
      ]
    });

    app = createApp();

    cookies.manager = (await login('manager', 'Paradize2026')).cookie;
    cookies.chef = (await login('chef', 'Kitchen2026')).cookie;
    cookies.waiter = (await login('waiter', 'Service2026')).cookie;
  });

  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectDB();
  });

  await t.test('health check reports db connected', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.db, 'connected');
  });

  await t.test('staff logins issue cookies; bad password is 401', async () => {
    assert.ok(cookies.manager && cookies.chef && cookies.waiter, 'all three roles logged in');
    const bad = await request(app).post('/api/auth/login').send({ username: 'manager', password: 'nope' });
    assert.equal(bad.status, 401);
  });

  await t.test('GET /api/auth/me returns the caller identity', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', cookies.chef);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, 'chef');
  });

  await t.test('tables are manager-only (RBAC)', async () => {
    const asManager = await request(app).get('/api/tables').set('Cookie', cookies.manager);
    assert.equal(asManager.status, 200);
    assert.equal(asManager.body.data.length, 2);

    const asChef = await request(app).get('/api/tables').set('Cookie', cookies.chef);
    assert.equal(asChef.status, 403);

    const anon = await request(app).get('/api/tables');
    assert.equal(anon.status, 401);
  });

  await t.test('public table token resolves a session; bad token is 401', async () => {
    const ok = await request(app).get(`/api/public/table/${tokenA}`);
    assert.equal(ok.status, 200);
    assert.ok(ok.body.data.sessionId, 'session issued');

    const bad = await request(app).get('/api/public/table/not-a-real-token');
    assert.equal(bad.status, 401);
  });

  await t.test('public menu lists available items', async () => {
    const res = await request(app).get('/api/public/menu').query({ t: tokenA, lang: 'en' });
    assert.equal(res.status, 200);
    const names = res.body.data.items.map((i) => i.name.en);
    assert.ok(names.includes('Grilled Tilapia'));
    assert.ok(names.includes('Steak'));
    // Internal stock counters must never leak to the public menu.
    assert.equal(res.body.data.items[0].stockQty, undefined);
  });

  let orderId;
  let sessionIdA;

  await t.test('place an order, then idempotency returns the same order', async () => {
    sessionIdA = (await request(app).get(`/api/public/table/${tokenA}`)).body.data.sessionId;
    const key = `itest-${Date.now()}`;
    const body = { items: [{ menuItemId: String(simpleItem._id), quantity: 2 }], idempotencyKey: key };

    const first = await request(app).post('/api/public/orders').set('x-table-token', tokenA).send(body);
    assert.equal(first.status, 201);
    assert.match(first.body.data.order.orderNumber, /^EP-\d{4}$/);
    assert.equal(first.body.data.order.total, 8000); // 4000 * 2, no tax/service
    assert.equal(first.body.data.duplicate, false);
    orderId = first.body.data.order.id;

    const dup = await request(app).post('/api/public/orders').set('x-table-token', tokenA).send(body);
    assert.equal(dup.status, 200);
    assert.equal(dup.body.data.duplicate, true);
    assert.equal(dup.body.data.order.id, orderId);
  });

  await t.test('order missing a required option is rejected', async () => {
    const res = await request(app)
      .post('/api/public/orders')
      .set('x-table-token', tokenA)
      .send({ items: [{ menuItemId: String(optionItem._id), quantity: 1 }], idempotencyKey: `itest-opt-${Date.now()}` });
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
  });

  await t.test('order with an unknown item id is rejected', async () => {
    const res = await request(app)
      .post('/api/public/orders')
      .set('x-table-token', tokenA)
      .send({ items: [{ menuItemId: '507f1f77bcf86cd799439011', quantity: 1 }], idempotencyKey: `itest-bogus-${Date.now()}` });
    assert.ok(res.status >= 400 && res.status < 500, `expected 4xx, got ${res.status}`);
  });

  await t.test('customer sees their own session order', async () => {
    const res = await request(app).get('/api/public/session/orders').query({ sid: sessionIdA }).set('x-table-token', tokenA);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.orders.some((o) => o.id === orderId));
  });

  await t.test('chef walks the order to ready; illegal transitions blocked; waiter serves', async () => {
    const patch = (status, cookie) =>
      request(app).patch(`/api/orders/${orderId}/status`).set('Cookie', cookie).send({ status });

    assert.equal((await patch('accepted', cookies.chef)).status, 200);
    assert.equal((await patch('preparing', cookies.chef)).status, 200);
    assert.equal((await patch('ready', cookies.chef)).status, 200);

    // ready -> accepted is not a legal transition.
    const illegal = await patch('accepted', cookies.chef);
    assert.ok(illegal.status >= 400, `expected 4xx, got ${illegal.status}`);

    assert.equal((await patch('served', cookies.waiter)).status, 200);

    const cust = await request(app).get(`/api/public/orders/${orderId}`).query({ sid: sessionIdA }).set('x-table-token', tokenA);
    assert.equal(cust.body.data.status, 'served');
  });

  await t.test('waiter marks the order paid', async () => {
    const res = await request(app).post(`/api/orders/${orderId}/pay`).set('Cookie', cookies.waiter).send({ method: 'cash' });
    assert.equal(res.status, 200);
  });

  await t.test('another table cannot read this order (session isolation)', async () => {
    const sidB = (await request(app).get(`/api/public/table/${tokenB}`)).body.data.sessionId;
    const res = await request(app).get(`/api/public/orders/${orderId}`).query({ sid: sidB }).set('x-table-token', tokenB);
    assert.equal(res.status, 403);
  });

  await t.test('service request flow: customer raises, waiter handles', async () => {
    const raised = await request(app).post('/api/public/requests').set('x-table-token', tokenA).send({ type: 'waiter' });
    assert.equal(raised.status, 201);
    const id = raised.body.data.id;

    const handled = await request(app).patch(`/api/requests/${id}/handle`).set('Cookie', cookies.waiter);
    assert.equal(handled.status, 200);
  });

  await t.test('manager live stats and sales report respond', async () => {
    const stats = await request(app).get('/api/orders/stats/live').set('Cookie', cookies.manager);
    assert.equal(stats.status, 200);
    assert.notEqual(stats.body.data.activeOrders, undefined);

    const sales = await request(app).get('/api/reports/sales').query({ group: 'day' }).set('Cookie', cookies.manager);
    assert.equal(sales.status, 200);
    assert.ok(Array.isArray(sales.body.data.rows ?? sales.body.data));
  });

  await t.test('reports are manager-only', async () => {
    const res = await request(app).get('/api/reports/sales').set('Cookie', cookies.chef);
    assert.equal(res.status, 403);
  });

  await t.test('table QR PNG renders for a manager', async () => {
    const tables = await request(app).get('/api/tables').set('Cookie', cookies.manager);
    const id = tables.body.data[0]._id;
    const png = await request(app).get(`/api/tables/${id}/qr.png`).set('Cookie', cookies.manager);
    assert.equal(png.status, 200);
    assert.match(png.headers['content-type'], /image\/png/);
  });
});
