import { $, el, delegate } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { money, dateTime } from '../../shared/format.js';
import { openModal, statusBadge, toast } from '../ui.js';

export const title = 'Orders';

const STATUSES = ['all', 'active', 'pending', 'accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled'];
let state = { status: 'active', from: '', to: '', page: 1, pages: 1, orders: [], currency: 'RWF' };

export async function render(root) {
  try {
    const s = await api('/api/settings');
    state.currency = s.currency || 'RWF';
  } catch {}

  const toolbar = el(
    'div',
    { class: 'toolbar' },
    selectEl(STATUSES, state.status, (v) => {
      state.status = v;
      state.page = 1;
      load(table);
    }),
    dateInput('from', (v) => {
      state.from = v;
      state.page = 1;
      load(table);
    }),
    dateInput('to', (v) => {
      state.to = v;
      state.page = 1;
      load(table);
    }),
    el('button', { class: 'btn btn-ghost btn-sm', onclick: () => exportCsv(), text: 'Export CSV' })
  );

  const table = el('div', { class: 'panel' });
  const pager = el('div', { class: 'toolbar' });
  root.append(toolbar, table, pager);

  state.tableEl = table;
  state.pagerEl = pager;
  await load(table, pager);
}

function selectEl(options, value, onChange) {
  const sel = el('select', { class: 'input' });
  for (const o of options) sel.append(el('option', { value: o, text: o, selected: o === value }));
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
function dateInput(name, onChange) {
  const inp = el('input', { class: 'input', type: 'date' });
  inp.addEventListener('change', () => onChange(inp.value));
  return inp;
}

async function load(table, pager) {
  table.innerHTML = '';
  table.append(el('div', { class: 'spinner' }));
  const params = new URLSearchParams({ status: state.status, page: state.page, limit: 25 });
  if (state.from) params.set('from', state.from);
  if (state.to) params.set('to', state.to);
  try {
    const d = await api(`/api/orders?${params}`);
    state.orders = d.orders;
    state.pages = d.pages;
    drawTable(table, d.orders);
    drawPager(pager || state.pagerEl, d);
  } catch (err) {
    table.innerHTML = '';
    table.append(el('div', { class: 'text-danger', text: err.message }));
  }
}

function drawTable(table, orders) {
  table.innerHTML = '';
  if (!orders.length) {
    table.append(el('div', { class: 'empty muted', text: 'No orders match.' }));
    return;
  }
  const tbl = el('table', { class: 'data-table' });
  tbl.append(
    el(
      'thead',
      {},
      el('tr', {}, ['Order', 'Table', 'Items', 'Total', 'Status', 'Placed', ''].map((h) => el('th', { text: h })))
    )
  );
  const tb = el('tbody');
  for (const o of orders) {
    const count = (o.items || []).reduce((s, i) => s + i.quantity, 0);
    tb.append(
      el(
        'tr',
        {},
        el('td', { text: o.orderNumber }),
        el('td', { text: `T${o.table?.number ?? '?'}` }),
        el('td', { text: count }),
        el('td', { text: money(o.total, state.currency) }),
        el('td', {}, statusBadge(o.status)),
        el('td', { text: dateTime(new Date(o.createdAt)) }),
        el('td', {}, el('button', { class: 'btn btn-ghost btn-sm', 'data-view': String(o._id), text: 'View' }))
      )
    );
  }
  tbl.append(tb);
  table.append(tbl);

  delegate(table, 'click', '[data-view]', (e, b) => viewOrder(b.dataset.view));
}

function drawPager(pager, d) {
  if (!pager) return;
  pager.innerHTML = '';
  pager.append(
    el('button', { class: 'btn btn-ghost btn-sm', disabled: d.page <= 1, onclick: () => (state.page--, load(state.tableEl, pager)), text: '← Prev' }),
    el('span', { class: 'muted', text: `Page ${d.page} of ${d.pages} · ${d.total} orders` }),
    el('button', { class: 'btn btn-ghost btn-sm', disabled: d.page >= d.pages, onclick: () => (state.page++, load(state.tableEl, pager)), text: 'Next →' })
  );
}

async function viewOrder(id) {
  try {
    const o = await api(`/api/orders/${id}`);
    const body = el(
      'div',
      {},
      el('div', { class: 'row-between', style: 'margin-bottom:10px' }, el('strong', { text: `${o.orderNumber} · Table ${o.table?.number ?? '?'}` }), statusBadge(o.status)),
      el(
        'ul',
        { class: 'w-items' },
        (o.items || []).map((i) => {
          const opts = (i.selectedOptions || []).flatMap((x) => x.choices.map((c) => c.label));
          return el('li', { text: `${i.quantity}× ${i.nameSnapshot?.en || ''}${opts.length ? ' · ' + opts.join(', ') : ''}${i.note ? ' · ' + i.note : ''}` });
        })
      ),
      el('hr'),
      el('div', { class: 'bill-line' }, el('span', { text: 'Subtotal' }), el('span', { text: money(o.subtotal, state.currency) })),
      o.discount ? el('div', { class: 'bill-line' }, el('span', { text: 'Discount' }), el('span', { text: `− ${money(o.discount, state.currency)}` })) : null,
      el('div', { class: 'bill-line' }, el('span', { text: 'Tax' }), el('span', { text: money(o.tax, state.currency) })),
      el('div', { class: 'bill-line' }, el('span', { text: 'Service' }), el('span', { text: money(o.serviceCharge, state.currency) })),
      el('div', { class: 'bill-line total' }, el('span', { text: 'Total' }), el('span', { text: money(o.total, state.currency) })),
      el('h4', { text: 'History', style: 'margin:14px 0 6px' }),
      el(
        'ul',
        { class: 'muted', style: 'font-size:0.82rem' },
        (o.statusHistory || []).map((h) => el('li', { text: `${h.status} · ${dateTime(new Date(h.at))} · ${h.by} (${h.byRole})` }))
      ),
      o.cancelReason ? el('p', { class: 'text-danger', text: `Cancelled: ${o.cancelReason}` }) : null
    );
    openModal({ title: 'Order detail', body, footer: null });
  } catch (err) {
    toast(err.message || 'Could not load order');
  }
}

function exportCsv() {
  const params = new URLSearchParams({});
  if (state.from) params.set('from', state.from);
  if (state.to) params.set('to', state.to);
  window.location.href = `/api/reports/export.csv?${params}`;
}
