import { el } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { money, num } from '../../shared/format.js';
import { toast } from '../ui.js';

export const title = 'Reports';

let currency = 'RWF';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function rangeParams() {
  const to = new Date();
  const from = new Date(Date.now() - 13 * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export async function render(root) {
  try {
    const s = await api('/api/settings');
    currency = s.currency || 'RWF';
  } catch (e) {}

  const { from, to } = rangeParams();
  const fromI = el('input', { class: 'input', type: 'date', value: from });
  const toI = el('input', { class: 'input', type: 'date', value: to });
  const toolbar = el(
    'div',
    { class: 'toolbar' },
    el('span', { class: 'muted', text: 'From' }),
    fromI,
    el('span', { class: 'muted', text: 'To' }),
    toI,
    el('button', { class: 'btn btn-primary btn-sm', id: 'apply', text: 'Apply' })
  );
  const wrap = el('div', { id: 'reports-wrap' });
  root.append(toolbar, wrap);

  const run = () => draw(wrap, fromI.value, toI.value);
  toolbar.querySelector('#apply').addEventListener('click', run);
  await run();
}

async function draw(wrap, from, to) {
  wrap.innerHTML = '';
  wrap.append(el('div', { class: 'spinner' }));
  const q = `from=${from}&to=${to}`;
  try {
    const [sales, top, cats, peak, prep, canc, staffp] = await Promise.all([
      api(`/api/reports/sales?${q}&group=day`),
      api(`/api/reports/top-items?${q}&limit=10`),
      api(`/api/reports/categories?${q}`),
      api(`/api/reports/peak-hours?${q}`),
      api(`/api/reports/prep-time?${q}`),
      api(`/api/reports/cancellations?${q}`),
      api(`/api/reports/staff?${q}`)
    ]);
    wrap.innerHTML = '';

    const totals = sales.reduce((a, r) => ({ revenue: a.revenue + r.revenue, orders: a.orders + r.orders }), { revenue: 0, orders: 0 });
    wrap.append(
      el(
        'div',
        { class: 'kpi-grid' },
        kpi('Revenue', money(totals.revenue, currency)),
        kpi('Orders', num(totals.orders)),
        kpi('Avg order', money(totals.orders ? Math.round(totals.revenue / totals.orders) : 0, currency)),
        kpi('Cancellation', `${canc.rate}%`, `${canc.cancelled}/${canc.total}`)
      )
    );

    wrap.append(panel('Sales trend', lineChart(sales.map((r) => ({ label: r.period.slice(5), value: r.revenue })))));
    wrap.append(panel('Avg prep time (min)', barChart(prep.map((r) => ({ label: r.period.slice(5), value: r.avgPrepMin })))));

    const grid2 = el('div', { class: 'grid-2' });
    grid2.append(panel('Top items', hBars(top.map((t) => ({ label: t.name, value: t.qty })))));
    grid2.append(panel('Revenue by category', hBars(cats.map((c) => ({ label: c.category, value: c.revenue })))));
    wrap.append(grid2);

    wrap.append(panel('Peak hours (orders by day × hour)', heatmap(peak)));
    wrap.append(panel('Staff performance', staffTable(staffp)));

    if (canc.byReason && canc.byReason.length) {
      wrap.append(panel('Cancellations by reason', hBars(canc.byReason.map((r) => ({ label: r.reason || '—', value: r.count })))));
    }
  } catch (err) {
    wrap.innerHTML = '';
    wrap.append(el('div', { class: 'panel text-danger', text: err.message }));
    toast(err.message);
  }
}

const kpi = (label, value, sub = '') => el('div', { class: 'kpi' }, el('div', { class: 'label', text: label }), el('div', { class: 'value', text: value }), sub ? el('div', { class: 'sub', text: sub }) : null);
const panel = (title, node) => el('div', { class: 'panel' }, el('h3', { text: title }), node);

function lineChart(points) {
  if (!points.length) return el('div', { class: 'muted', text: 'No data.' });
  const W = 600,
    H = 200,
    P = 30;
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (W - P * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => [P + i * stepX, H - P - (p.value / max) * (H - P * 2)]);
  const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart');
  svg.innerHTML = `<path d="${path}" fill="none" stroke="#9A5322" stroke-width="2.5"/>` + coords.map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="3" fill="#9A5322"/>`).join('');
  const wrap = el('div', {}, svg);
  wrap.append(el('div', { class: 'muted', style: 'font-size:0.7rem;display:flex;justify-content:space-between' }, el('span', { text: points[0].label }), el('span', { text: points[points.length - 1].label })));
  return wrap;
}

function barChart(points) {
  const bars = el('div', { class: 'bars' });
  if (!points.length) return el('div', { class: 'muted', text: 'No data.' });
  const max = Math.max(...points.map((p) => p.value), 1);
  for (const p of points) {
    const h = Math.max(2, Math.round((p.value / max) * 160));
    bars.append(el('div', { class: 'bar', style: `height:${h}px`, title: `${p.label}: ${p.value}` }, el('span', { text: p.label })));
  }
  return bars;
}

function hBars(points) {
  const wrap = el('div');
  if (!points.length) return el('div', { class: 'muted', text: 'No data.' });
  const max = Math.max(...points.map((p) => p.value), 1);
  for (const p of points) {
    const pct = Math.round((p.value / max) * 100);
    wrap.append(
      el(
        'div',
        { style: 'margin-bottom:8px' },
        el('div', { style: 'display:flex;justify-content:space-between;font-size:0.8rem' }, el('span', { text: p.label }), el('span', { class: 'muted', text: num(p.value) })),
        el('div', { style: 'background:#eee7e1;border-radius:6px;height:10px;overflow:hidden' }, el('div', { style: `width:${pct}%;height:100%;background:var(--color-primary)` }))
      )
    );
  }
  return wrap;
}

function heatmap(rows) {
  const grid = el('div', { class: 'heat' });
  const counts = {};
  let max = 1;
  for (const r of rows) {
    counts[`${r.dow}-${r.hour}`] = r.orders;
    max = Math.max(max, r.orders);
  }
  // header row: blank + 24 hours
  grid.append(el('div', { class: 'lbl', text: '' }));
  for (let h = 0; h < 24; h++) grid.append(el('div', { class: 'lbl', style: 'justify-content:center', text: h % 3 === 0 ? String(h) : '' }));
  for (let d = 1; d <= 7; d++) {
    grid.append(el('div', { class: 'lbl', text: DAYS[(d % 7)] }));
    for (let h = 0; h < 24; h++) {
      const v = counts[`${d}-${h}`] || 0;
      const alpha = v ? 0.15 + (v / max) * 0.85 : 0;
      grid.append(el('div', { class: 'cell', title: `${DAYS[d % 7]} ${h}:00 · ${v}`, style: v ? `background:rgba(154,83,34,${alpha.toFixed(2)})` : '' }));
    }
  }
  return grid;
}

function staffTable(rows) {
  if (!rows.length) return el('div', { class: 'muted', text: 'No data.' });
  const tbl = el('table', { class: 'data-table' });
  tbl.append(el('thead', {}, el('tr', {}, ['Name', 'Role', 'Actions', 'Total'].map((h) => el('th', { text: h })))));
  const tb = el('tbody');
  for (const r of rows) {
    const breakdown = (r.actions || []).map((a) => `${a.action}:${a.count}`).join('  ');
    tb.append(el('tr', {}, el('td', { text: r.name }), el('td', { text: r.role }), el('td', { class: 'muted', text: breakdown }), el('td', { text: num(r.total) })));
  }
  tbl.append(tb);
  return tbl;
}
