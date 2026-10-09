/**
 * Waiter screen — ready orders to deliver, service requests to handle, and
 * open tables with billing. Light theme, thumb-first, live via Socket.IO.
 */
import { $, $$, el, delegate } from '../shared/dom.js';
import { api } from '../shared/api.js';
import { connectSocket, on, setOnReconnect } from '../shared/socket.js';
import { money, timeHM, elapsed } from '../shared/format.js';
import { requireStaff, logout } from '../shared/auth.js';
import { playStatus, unlockAudio, vibrate, notify, requestNotificationPermission } from '../shared/audio.js';

const state = { ready: [], requests: [], sessions: [], currency: 'RWF', me: null, billSession: null };

/* ---------------- loading ---------------- */
async function loadAll() {
  await Promise.all([loadReady(), loadRequests(), loadSessions()]);
}
async function loadReady() {
  try {
    const d = await api('/api/orders?status=ready&limit=100');
    state.ready = d.orders;
    renderReady();
  } catch (e) {}
}
async function loadRequests() {
  try {
    state.requests = await api('/api/requests?status=open');
    renderRequests();
  } catch (e) {}
}
async function loadSessions() {
  try {
    state.sessions = await api('/api/sessions?status=open');
    renderSessions();
  } catch (e) {}
}

function badges() {
  $('[data-badge="ready"]').textContent = state.ready.length;
  $('[data-badge="requests"]').textContent = state.requests.length;
  $('[data-badge="sessions"]').textContent = state.sessions.length;
}

/* ---------------- ready orders ---------------- */
function orderItems(order) {
  return el(
    'ul',
    { class: 'w-items' },
    (order.items || []).map((i) => {
      const opts = (i.selectedOptions || []).flatMap((o) => o.choices.map((c) => c.label));
      const li = el('li', { text: `${i.quantity}× ${(i.nameSnapshot && i.nameSnapshot.en) || 'Item'}` });
      if (opts.length) li.append(el('span', { class: 'opts', text: ` · ${opts.join(', ')}` }));
      if (i.note) li.append(el('span', { class: 'opts', text: ` · ${i.note}` }));
      return li;
    })
  );
}

function renderReady() {
  const v = $('#view-ready');
  v.innerHTML = '';
  if (!state.ready.length) {
    v.append(el('div', { class: 'empty', text: 'No orders ready right now.' }));
    return badges();
  }
  for (const o of state.ready) {
    v.append(
      el(
        'div',
        { class: 'w-card' },
        el(
          'div',
          { class: 'w-card-top' },
          el('span', { class: 'no', text: o.orderNumber }),
          el('span', { class: 'tbl', text: `Table ${(o.table && o.table.number != null ? o.table.number : '?')}` }),
          el('span', { class: 'amt', text: money(o.total, state.currency) })
        ),
        orderItems(o),
        el('div', { class: 'w-meta', text: `Ready ${elapsed(o.createdAt)} ago` }),
        el(
          'div',
          { class: 'w-actions' },
          el('button', { class: 'btn btn-success', 'data-serve': String(o._id), text: 'Mark served' }),
          el('button', { class: 'btn btn-ghost btn-sm', 'data-print-order': String(o._id), text: 'Print' })
        )
      )
    );
  }
  badges();
}

/* ---------------- requests ---------------- */
function renderRequests() {
  const v = $('#view-requests');
  v.innerHTML = '';
  if (!state.requests.length) {
    v.append(el('div', { class: 'empty', text: 'No open requests.' }));
    return badges();
  }
  for (const r of state.requests) {
    v.append(
      el(
        'div',
        { class: 'w-card' },
        el(
          'div',
          { class: 'w-card-top' },
          el('span', { class: 'req-type', text: r.type }),
          el('span', { class: 'tbl', text: `Table ${(r.table && r.table.number != null ? r.table.number : '?')}` })
        ),
        el('div', { class: 'w-meta', text: `${elapsed(r.createdAt)} ago` }),
        el('div', { class: 'w-actions' }, el('button', { class: 'btn btn-primary', 'data-handle': String(r._id), text: 'Mark handled' }))
      )
    );
  }
  badges();
}

/* ---------------- sessions ---------------- */
function renderSessions() {
  const v = $('#view-sessions');
  v.innerHTML = '';
  if (!state.sessions.length) {
    v.append(el('div', { class: 'empty', text: 'No open tables.' }));
    return badges();
  }
  for (const s of state.sessions) {
    const paid = s.paymentStatus === 'paid';
    const due = (s.orders || []).filter((o) => o.paymentStatus !== 'paid' && o.status !== 'cancelled').length;
    v.append(
      el(
        'div',
        { class: 'w-card' },
        el(
          'div',
          { class: 'w-card-top' },
          el('span', { class: 'tbl', text: `Table ${(s.table && s.table.number != null ? s.table.number : '?')}` }),
          el('span', { class: `badge ${paid ? 'badge-paid' : 'badge-due'}`, text: paid ? 'Paid' : `${due} due` }),
          el('span', { class: 'amt', text: money(s.totalAmount || 0, state.currency) })
        ),
        el('div', { class: 'sess-orders', text: `${(s.orders || []).length} order(s) · opened ${timeHM(new Date(s.openedAt))}` }),
        el(
          'div',
          { class: 'w-actions' },
          el('button', { class: 'btn btn-primary', 'data-bill': String(s.id), text: 'View bill' }),
          el('button', { class: 'btn btn-ghost btn-sm', 'data-close': String(s.id), text: 'Close table' })
        )
      )
    );
  }
  badges();
}

/* ---------------- bill sheet ---------------- */
async function openBill(sessionId) {
  try {
    const s = await api(`/api/sessions/${sessionId}`);
    state.billSession = s;
    renderBill();
    $('#bill-backdrop').hidden = false;
    $('#bill-sheet').hidden = false;
  } catch (err) {
    toast(err.message || 'Could not load bill');
  }
}

function closeBill() {
  $('#bill-backdrop').hidden = true;
  $('#bill-sheet').hidden = true;
  state.billSession = null;
}

function renderBill() {
  const s = state.billSession;
  if (!s) return;
  $('#bill-title').textContent = `Table ${(s.table && s.table.number != null ? s.table.number : '?')} · ${s.sessionId}`;
  const body = $('#bill-body');
  body.innerHTML = '';

  let subtotal = 0,
    discount = 0,
    tax = 0,
    service = 0,
    total = 0;
  for (const o of s.orders || []) {
    if (o.status === 'cancelled') continue;
    subtotal += o.subtotal || 0;
    discount += o.discount || 0;
    tax += o.tax || 0;
    service += o.serviceCharge || 0;
    total += o.total || 0;
    body.append(
      el(
        'div',
        { class: 'w-card', style: 'margin-bottom:8px' },
        el(
          'div',
          { class: 'w-card-top' },
          el('span', { class: 'no', text: o.orderNumber }),
          el('span', { class: `badge ${o.paymentStatus === 'paid' ? 'badge-paid' : 'badge-due'}`, text: o.paymentStatus === 'paid' ? 'Paid' : o.status }),
          el('span', { class: 'amt', text: money(o.total, state.currency) })
        ),
        orderItems(o)
      )
    );
  }

  const sums = el(
    'div',
    {},
    el('div', { class: 'bill-line' }, el('span', { text: 'Subtotal' }), el('span', { text: money(subtotal, state.currency) })),
    discount ? el('div', { class: 'bill-line' }, el('span', { text: 'Discount' }), el('span', { text: `− ${money(discount, state.currency)}` })) : null,
    tax ? el('div', { class: 'bill-line' }, el('span', { text: 'Tax' }), el('span', { text: money(tax, state.currency) })) : null,
    service ? el('div', { class: 'bill-line' }, el('span', { text: 'Service' }), el('span', { text: money(service, state.currency) })) : null,
    el('div', { class: 'bill-line total' }, el('span', { text: 'Total' }), el('span', { text: money(total, state.currency) }))
  );
  body.append(sums);

  const foot = $('#bill-foot');
  foot.innerHTML = '';
  const paid = (s.totals && s.totals.paymentStatus) === 'paid';
  if (!paid) {
    foot.append(
      el(
        'div',
        { class: 'pay-row' },
        el('button', { class: 'btn btn-success', 'data-pay': 'cash', text: 'Cash' }),
        el('button', { class: 'btn btn-primary', 'data-pay': 'momo', text: 'MoMo' }),
        el('button', { class: 'btn btn-primary', 'data-pay': 'card', text: 'Card' })
      )
    );
  } else {
    foot.append(el('div', { class: 'muted', style: 'text-align:center', text: 'This table is fully paid.' }));
  }
  foot.append(
    el(
      'div',
      { class: 'pay-row' },
      el('button', { class: 'btn btn-ghost', id: 'bill-print', text: 'Print bill' }),
      el('button', { class: 'btn btn-dark', id: 'bill-close-session', text: 'Pay & close' })
    )
  );
}

async function paySession(method) {
  const s = state.billSession;
  if (!s) return;
  try {
    await api(`/api/sessions/${s.id}/pay`, { method: 'POST', body: { method } });
    toast(`Payment recorded (${method})`);
    await loadSessions();
    await openBill(String(s.id));
  } catch (err) {
    toast(err.message || 'Payment failed');
  }
}

async function closeSession(id, force = false) {
  if (!force && !confirm('Close this table? Unpaid orders will be flagged.')) return;
  try {
    await api(`/api/sessions/${id}/close`, { method: 'POST', body: { force } });
    toast('Table closed');
    closeBill();
    await loadSessions();
  } catch (err) {
    if (err.code === 'SESSION_HAS_UNPAID' && !force) {
      if (confirm('Table has unpaid orders. Close anyway?')) return closeSession(id, true);
      return;
    }
    toast(err.message || 'Could not close');
  }
}

function printBill() {
  const s = state.billSession;
  if (!s) return;
  const area = $('#print-area');
  area.innerHTML = '';
  let total = 0;
  const lines = [];
  for (const o of s.orders || []) {
    if (o.status === 'cancelled') continue;
    total += o.total || 0;
    lines.push(el('div', { class: 'p-row' }, el('span', { text: o.orderNumber }), el('span', { text: money(o.total, state.currency) })));
    for (const i of o.items || []) lines.push(el('div', { text: `  ${i.quantity}× ${(i.nameSnapshot && i.nameSnapshot.en) || ''}` }));
  }
  area.append(
    el('h3', { text: 'Cape Town K Hotel' }),
    el('div', { class: 'p-row' }, el('span', { text: `Table ${(s.table && s.table.number != null ? s.table.number : '?')}` }), el('span', { text: s.sessionId })),
    el('hr'),
    ...lines,
    el('hr'),
    el('div', { class: 'p-row' }, el('b', { text: 'TOTAL' }), el('b', { text: money(total, state.currency) }))
  );
  document.body.classList.add('printing');
  const done = () => {
    document.body.classList.remove('printing');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}

function printOrder(id) {
  const o = state.ready.find((x) => String(x._id) === String(id));
  if (!o) return;
  const area = $('#print-area');
  area.innerHTML = '';
  area.append(
    el('h3', { text: 'Cape Town K Hotel' }),
    el('div', { class: 'p-row' }, el('span', { text: o.orderNumber }), el('span', { text: `Table ${(o.table && o.table.number != null ? o.table.number : '?')}` })),
    el('hr'),
    el('ul', {}, (o.items || []).map((i) => el('li', { text: `${i.quantity}× ${(i.nameSnapshot && i.nameSnapshot.en) || ''}` }))),
    el('hr'),
    el('div', { class: 'p-row' }, el('span', { text: 'TOTAL' }), el('span', { text: money(o.total, state.currency) }))
  );
  document.body.classList.add('printing');
  const done = () => {
    document.body.classList.remove('printing');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
}

/* ---------------- events ---------------- */
delegate($('.w-main'), 'click', '[data-serve]', async (e, b) => {
  b.disabled = true;
  try {
    await api(`/api/orders/${b.dataset.serve}/status`, { method: 'PATCH', body: { status: 'served' } });
    playStatus();
    await loadReady();
    await loadSessions();
  } catch (err) {
    toast(err.message || 'Failed');
    b.disabled = false;
  }
});
delegate($('.w-main'), 'click', '[data-print-order]', (e, b) => printOrder(b.dataset.printOrder));
delegate($('.w-main'), 'click', '[data-handle]', async (e, b) => {
  b.disabled = true;
  try {
    await api(`/api/requests/${b.dataset.handle}/handle`, { method: 'PATCH' });
    await loadRequests();
  } catch (err) {
    toast(err.message || 'Failed');
    b.disabled = false;
  }
});
delegate($('.w-main'), 'click', '[data-bill]', (e, b) => openBill(b.dataset.bill));
delegate($('.w-main'), 'click', '[data-close]', (e, b) => closeSession(b.dataset.close));

delegate($('#bill-foot'), 'click', '[data-pay]', (e, b) => paySession(b.dataset.pay));
$('#bill-close').addEventListener('click', closeBill);
$('#bill-backdrop').addEventListener('click', closeBill);
$('#bill-foot').addEventListener('click', (e) => {
  if (e.target.id === 'bill-print') printBill();
  if (e.target.id === 'bill-close-session' && state.billSession) {
    const id = String(state.billSession.id);
    paySession('cash').then(() => closeSession(id, true));
  }
});

/* tabs */
function activateTab(tab) {
  $$('.tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  $$('.view').forEach((v) => v.classList.remove('active'));
  $(`[data-view="${tab.dataset.tab}"]`).classList.add('active');
}
delegate($('body'), 'click', '.tab', (e, tab) => {
  activateTab(tab);
});

$('#logout').addEventListener('click', logout);

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { t.hidden = true; }, 300);
  }, 2200);
}

/* ---------------- socket ---------------- */
function wireSocket() {
on('order:ready', (p) => {
    playStatus();
    vibrate([150, 80, 150]);
    notify(`Order ${p.no || ''} ready`, `Table ${p.table ?? ''}`);
    loadReady();
    loadSessions();
  });
  on('order:updated', () => {
    loadReady();
    loadSessions();
  });
  on('request:new', (p) => {
    vibrate([150, 80, 150]);
    notify('New request', `Table ${(p.table != null ? p.table : '')} · ${p.type || ''}`);
    loadRequests();
  });
  on('request:handled', () => loadRequests());
  on('session:closed', () => loadSessions());
  setOnReconnect(loadAll);
}

/* ---------------- boot ---------------- */
async function boot() {
  state.me = await requireStaff(['waiter', 'manager']);
  $('#whoami').textContent = state.me.name;
  // Arm sound + browser notifications on the first user gesture
  // (browsers block audio/notification permission without one).
  document.addEventListener('pointerdown', () => {
    unlockAudio();
    requestNotificationPermission();
  }, { once: true });
  try {
    const s = await api('/api/settings');
    state.currency = s.currency || 'RWF';
  } catch (e) {}
  wireSocket();
  await loadAll();
  await connectSocket({ mode: 'staff', onReady: loadAll });
  setInterval(loadAll, 20000);

  // Mobile: switch to bottom tab bar on small screens
  if (window.innerWidth <= 768) {
    $('#w-tabs').classList.add('hidden');
    $('#w-tab-bar').classList.remove('hidden');
  }
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      $('#w-tabs').classList.add('hidden');
      $('#w-tab-bar').classList.remove('hidden');
    } else {
      $('#w-tabs').classList.remove('hidden');
      $('#w-tab-bar').classList.add('hidden');
    }
  });
}

boot();
