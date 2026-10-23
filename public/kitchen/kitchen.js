/**
 * Kitchen display system (dark board).
 * Columns NEW → PREPARING → READY, live via Socket.IO with a polling safety net.
 * New-order sound / vibration / notification are gated behind "Start shift"
 * (a user gesture) so mobile browsers allow audio.
 */
import { $, $$, el, delegate } from '../shared/dom.js';
import { api } from '../shared/api.js';
import { connectSocket, on, setOnReconnect } from '../shared/socket.js';
import { money, timeHM } from '../shared/format.js';
import { requireStaff } from '../shared/auth.js';
import { unlockAudio, disableAudio, audioEnabled, playNewOrder, vibrate, notify, requestNotificationPermission } from '../shared/audio.js';

const state = {
  orders: new Map(),
  warnMin: 10,
  lateMin: 20,
  currency: 'RWF',
  station: 'all',
  shift: false,
  me: null
};

const COLUMN = { pending: 'new', accepted: 'new', preparing: 'preparing', ready: 'ready' };
const NEXT = { pending: 'accepted', accepted: 'preparing', preparing: 'ready' };
const ACTION_LABEL = { accepted: 'Accept', preparing: 'Start', ready: 'Mark ready', served: 'Served' };

function columnOf(status) {
  return COLUMN[status] || null;
}

function stationMatch(order) {
  if (state.station === 'all') return true;
  return (order.items || []).some((i) => i.station === state.station);
}

/* ---------------- data ---------------- */
async function refresh() {
  try {
    const data = await api('/api/orders?status=active&limit=100');
    state.orders = new Map(data.orders.map((o) => [String(o._id), o]));
    render();
  } catch (e) {
    /* keep the last good board on a transient error */
  }
}

let refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 200);
}

async function loadSettings() {
  try {
    const s = await api('/api/settings');
    state.warnMin = (s.lateThresholds && s.lateThresholds.warnMin != null ? s.lateThresholds.warnMin : 10);
    state.lateMin = (s.lateThresholds && s.lateThresholds.lateMin != null ? s.lateThresholds.lateMin : 20);
    state.currency = s.currency || 'RWF';
  } catch (e) {
    /* defaults are fine */
  }
}

/* ---------------- rendering ---------------- */
function minutesSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

function ticketClass(order) {
  if (order.status === 'ready') return 'ticket ready';
  const m = minutesSince(order.createdAt);
  if (m >= state.lateMin) return 'ticket late';
  if (m >= state.warnMin) return 'ticket warn';
  return 'ticket';
}

function timerText(order) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildTicket(order) {
  const items = (order.items || []).filter((i) => state.station === 'all' || i.station === state.station);
  const lis = items.map((i) => {
    const opts = (i.selectedOptions || []).flatMap((o) => o.choices.map((c) => c.label));
    const li = el('li', {}, el('span', { class: 'qty', text: `${i.quantity}×` }), el('span', { text: (i.nameSnapshot && i.nameSnapshot.en) || 'Item' }));
    if (opts.length) li.append(el('span', { class: 'opts', text: `· ${opts.join(', ')}` }));
    if (i.note) li.append(el('div', { class: 't-note', text: i.note }));
    return li;
  });

  const stations = [...new Set((order.items || []).map((i) => i.station))].join(' · ');
  const actions = el('div', { class: 't-actions' });
  const next = NEXT[order.status];
  if (next) {
    actions.append(el('button', { class: 'btn btn-success', 'data-act': next, 'data-id': String(order._id), text: ACTION_LABEL[next] }));
  }
  if (order.status === 'ready') {
    actions.append(el('button', { class: 'btn btn-primary', 'data-act': 'served', 'data-id': String(order._id), text: ACTION_LABEL.served }));
  }
  if (['pending', 'accepted', 'preparing'].includes(order.status)) {
    actions.append(el('button', { class: 'btn btn-danger btn-sm', 'data-act': 'cancel', 'data-id': String(order._id), text: 'Cancel' }));
  }
  actions.append(el('button', { class: 'btn btn-ghost btn-sm', 'data-act': 'print', 'data-id': String(order._id), text: '🖨' }));

  return el(
    'article',
    { class: ticketClass(order), 'data-id': String(order._id), 'data-created': order.createdAt },
    el(
      'div',
      { class: 't-top' },
      el('span', { class: 't-no', text: order.orderNumber }),
      el('span', { class: 't-table', text: `T${(order.table && order.table.number != null ? order.table.number : '?')}` }),
      el('span', { class: 't-timer', text: timerText(order) })
    ),
    el('ul', { class: 't-items' }, lis),
    order.notes ? el('div', { class: 't-note', text: order.notes }) : null,
    el('div', { class: 't-station', text: stations }),
    actions
  );
}

function render() {
  for (const col of ['new', 'preparing', 'ready']) {
    const body = $(`[data-body="${col}"]`);
    const list = [...state.orders.values()]
      .filter((o) => columnOf(o.status) === col && stationMatch(o))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    body.innerHTML = '';
    if (!list.length) {
      body.append(el('div', { class: 'col-empty', text: '—' }));
    } else {
      for (const o of list) body.append(buildTicket(o));
    }
    $(`[data-count="${col}"]`).textContent = list.length;
  }
  renderSummary();
}

function renderSummary() {
  const all = [...state.orders.values()];
  const late = all.filter((o) => o.status !== 'ready' && minutesSince(o.createdAt) >= state.lateMin).length;
  const warn = all.filter((o) => o.status !== 'ready' && minutesSince(o.createdAt) >= state.warnMin && minutesSince(o.createdAt) < state.lateMin).length;
  $('#k-summary').innerHTML = '';
  $('#k-summary').append(
    el('span', {}, 'Active: ', el('b', { text: all.length })),
    el('span', {}, 'Warning: ', el('b', { class: 'text-warning', text: warn })),
    el('span', {}, 'Late: ', el('b', { class: 'text-danger', text: late })),
    el('span', {}, 'Warn ≥ ', el('b', { text: `${state.warnMin}m` }), ' · Late ≥ ', el('b', { text: `${state.lateMin}m` }))
  );
}

/* ---------------- actions ---------------- */
async function doStatus(id, status) {
  const card = $(`.ticket[data-id="${id}"]`);
  if (card) card.style.opacity = '0.5';
  try {
    await api(`/api/orders/${id}/status`, { method: 'PATCH', body: { status } });
    await refresh();
  } catch (err) {
    toast(err.message || 'Update failed');
    await refresh();
  }
}

async function doCancel(id) {
  const reason = prompt('Cancel reason?');
  if (!reason || reason.trim().length < 3) return;
  try {
    await api(`/api/orders/${id}/cancel`, { method: 'POST', body: { reason: reason.trim() } });
    await refresh();
  } catch (err) {
    toast(err.message || 'Cancel failed');
  }
}

function printTicket(id) {
  const order = state.orders.get(String(id));
  if (!order) return;
  const area = $('#print-area');
  area.innerHTML = '';
  area.append(
    el('h3', { text: 'Cape Town K Hotel' }),
    el('div', { class: 'p-row' }, el('span', { text: order.orderNumber }), el('span', { text: `Table ${(order.table && order.table.number != null ? order.table.number : '?')}` })),
    el('div', { class: 'p-row' }, el('span', { text: timeHM(new Date(order.createdAt)) }), el('span', { text: new Date().toLocaleTimeString() })),
    el('hr'),
    el(
      'ul',
      {},
      (order.items || []).map((i) => {
        const opts = (i.selectedOptions || []).flatMap((o) => o.choices.map((c) => c.label));
        const li = el('li', { class: 'p-row' }, el('span', { text: `${i.quantity}× ${(i.nameSnapshot && i.nameSnapshot.en) || ''}` }));
        if (opts.length) li.append(el('div', { text: `   ${opts.join(', ')}` }));
        if (i.note) li.append(el('div', { text: `   > ${i.note}` }));
        return li;
      })
    ),
    order.notes ? el('div', { text: `NOTE: ${order.notes}` }) : null,
    el('hr'),
    el('div', { class: 'p-row' }, el('span', { text: 'TOTAL' }), el('span', { text: money(order.total, state.currency) }))
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

delegate($('#board'), 'click', '[data-act]', (e, btn) => {
  const { act, id } = btn.dataset;
  if (act === 'cancel') return doCancel(id);
  if (act === 'print') return printTicket(id);
  doStatus(id, act);
});

/* ---------------- stock panel ---------------- */
let stockItems = [];
async function openStock() {
  $('#stock-panel').hidden = false;
  try {
    stockItems = await api('/api/menu/items');
    renderStock('');
  } catch (err) {
    toast(err.message || 'Could not load menu');
  }
}

function renderStock(filter) {
  const list = $('#stock-list');
  list.innerHTML = '';
  const q = filter.trim().toLowerCase();
  for (const item of stockItems) {
    const name = (item.name && item.name.en) || '';
    if (q && !name.toLowerCase().includes(q)) continue;
    list.append(
      el(
        'div',
        { class: 'stock-row' },
        el('div', {}, el('div', { class: 'name', text: name }), el('div', { class: 'st', text: item.station })),
        el('button', {
          class: `switch ${item.isAvailable ? 'on' : 'off'}`,
          'data-id': String(item._id),
          text: item.isAvailable ? 'In stock' : 'Out'
        })
      )
    );
  }
}

delegate($('#stock-list'), 'click', '.switch', async (e, btn) => {
  const id = btn.dataset.id;
  const item = stockItems.find((i) => String(i._id) === id);
  if (!item) return;
  const next = !item.isAvailable;
  btn.disabled = true;
  try {
    await api(`/api/menu/items/${id}/availability`, { method: 'PATCH', body: { isAvailable: next } });
    item.isAvailable = next;
    btn.className = `switch ${next ? 'on' : 'off'}`;
    btn.textContent = next ? 'In stock' : 'Out';
  } catch (err) {
    toast(err.message || 'Toggle failed');
  } finally {
    btn.disabled = false;
  }
});

$('#stock-search').addEventListener('input', (e) => renderStock(e.target.value));
$('#stock-close').addEventListener('click', () => ($('#stock-panel').hidden = true));
$('#stock-btn').addEventListener('click', openStock);

/* ---------------- station filter ---------------- */
delegate($('#station-filter'), 'click', '.chip', (e, chip) => {
  $$('#station-filter .chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  state.station = chip.dataset.station;
  render();
});

/* ---------------- sound / shift ---------------- */
function setSoundIcon() {
  $('#sound-btn').textContent = audioEnabled() ? '🔊' : '🔇';
}
$('#sound-btn').addEventListener('click', () => {
  if (audioEnabled()) disableAudio();
  else unlockAudio();
  setSoundIcon();
});

async function startShift(withSound) {
  state.shift = true;
  $('#shift-overlay').hidden = true;
  $('#shift-btn').textContent = 'Shift active';
  $('#shift-btn').classList.remove('btn-primary');
  $('#shift-btn').classList.add('btn-success');
  if (withSound) {
    unlockAudio();
    await requestNotificationPermission();
  }
  setSoundIcon();
}
$('#shift-start').addEventListener('click', () => startShift(true));
$('#shift-skip').addEventListener('click', () => startShift(false));
$('#shift-btn').addEventListener('click', () => {
  if (state.shift) {
    $('#stock-panel').hidden = true;
    toast('Shift already active');
  } else {
    $('#shift-overlay').hidden = false;
  }
});

function alertNewOrder(payload) {
  if (!state.shift || !audioEnabled()) return;
  playNewOrder();
  vibrate([200, 100, 200]);
  notify(`New order ${payload.no || ''}`, `Table ${(payload.table != null ? payload.table : '?')}`);
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

/* ---------------- live timers ---------------- */
function tick() {
  $('#clock').textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  for (const card of $$('.ticket')) {
    const order = state.orders.get(card.dataset.id);
    if (!order) continue;
    const timer = card.querySelector('.t-timer');
    if (timer) timer.textContent = timerText(order);
    const cls = ticketClass(order);
    if (card.className !== cls) card.className = cls;
  }
}

/* ---------------- boot ---------------- */
async function boot() {
  state.me = await requireStaff(['chef', 'manager']);
  $('#whoami').textContent = `${state.me.name} (${state.me.role})`;
  await loadSettings();
  await refresh();
  tick();
  setInterval(tick, 1000);
  // Polling safety net in case a socket event is missed.
  setInterval(refresh, 15000);

  on('order:new', (p) => {
    alertNewOrder(p);
    scheduleRefresh();
  });
  on('order:updated', () => scheduleRefresh());
  on('order:ready', () => scheduleRefresh());
  setOnReconnect(refresh);

  await connectSocket({ mode: 'staff', onReady: refresh });
}

boot();
