import { el, delegate } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { money, dateTime } from '../../shared/format.js';
import { openModal, statusBadge, toast } from '../ui.js';

export const title = 'Customer feedback';

let state = { page: 1, pages: 1, feedback: [], currency: 'RWF' };

const STAR = '★';
const EMPTY_STAR = '☆';

function ratingStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating ? STAR : EMPTY_STAR;
  }
  return html;
}

export async function render(root) {
  try {
    const s = await api('/api/settings');
    state.currency = s.currency || 'RWF';
  } catch (e) {}

  const toolbar = el('div', { class: 'toolbar' },
    el('span', { class: 'muted', text: 'Customer feedback submitted after orders are served.' })
  );

  const table = el('div', { class: 'panel' });
  const pager = el('div', { class: 'toolbar' });
  root.append(toolbar, table, pager);

  state.tableEl = table;
  state.pagerEl = pager;
  await load(table, pager);
}

async function load(table, pager) {
  table.innerHTML = '';
  table.append(el('div', { class: 'spinner' }));
  const params = new URLSearchParams({ page: state.page, limit: 25 });
  try {
    const d = await api(`/api/orders/feedback?${params}`);
    state.feedback = d.orders;
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
    table.append(el('div', { class: 'empty muted', text: 'No feedback yet.' }));
    return;
  }
  const tbl = el('table', { class: 'data-table' });
  tbl.append(
    el('thead', {},
      el('tr', {}, ['Order', 'Table', 'Rating', 'Comment', 'Submitted'].map((h) => el('th', { text: h }))))
  );
  const tb = el('tbody');
  for (const o of orders) {
    const fb = o.feedback || {};
    const tableNo = (o.table && o.table.number != null ? o.table.number : '?');
    tb.append(
      el('tr', {},
        el('td', {}, el('strong', { text: o.orderNumber })),
        el('td', { text: `T${tableNo}` }),
        el('td', { class: 'feedback-rating', text: ratingStars(fb.rating || 0) }),
        el('td', { class: 'feedback-comment', text: fb.comment || '—' }),
        el('td', { text: fb.createdAt ? dateTime(new Date(fb.createdAt)) : '—' })
      )
    );
  }
  tbl.append(tb);
  table.append(tbl);
}

function drawPager(pager, d) {
  pager.innerHTML = '';
  pager.append(
    el('button', { class: 'btn btn-ghost btn-sm', disabled: d.page <= 1, onclick: () => (state.page--, load(state.tableEl, pager)), text: '← Prev' }),
    el('span', { class: 'muted', text: `Page ${d.page} of ${d.pages} · ${d.total} feedback` }),
    el('button', { class: 'btn btn-ghost btn-sm', disabled: d.page >= d.pages, onclick: () => (state.page++, load(state.tableEl, pager)), text: 'Next →' })
  );
}
