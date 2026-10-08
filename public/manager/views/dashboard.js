import { el } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { money, num } from '../../shared/format.js';
import { onLiveStats } from '../manager.js';

export const title = 'Dashboard';

let currency = 'RWF';

function kpi(label, value, sub = '') {
  return el('div', { class: 'kpi' }, el('div', { class: 'label', text: label }), el('div', { class: 'value', text: value }), sub ? el('div', { class: 'sub', text: sub }) : null);
}

export async function render(root) {
  let stats = { activeOrders: 0, tablesInUse: 0, salesToday: 0, ordersToday: 0, avgPrepMin: 0, openRequests: 0 };
  try {
    const s = await api('/api/settings');
    currency = s.currency || 'RWF';
  } catch {}
  try {
    stats = await api('/api/orders/stats/live');
  } catch {}

  const grid = el('div', { class: 'kpi-grid' });
  const cards = {
    active: kpi('Active orders', num(stats.activeOrders)),
    tables: kpi('Tables in use', num(stats.tablesInUse)),
    sales: kpi('Sales today', money(stats.salesToday, currency)),
    orders: kpi('Orders today', num(stats.ordersToday)),
    prep: kpi('Avg prep', `${num(stats.avgPrepMin)} min`),
    requests: kpi('Open requests', num(stats.openRequests))
  };
  grid.append(cards.active, cards.tables, cards.sales, cards.orders, cards.prep, cards.requests);
  root.append(grid);

  // Sales trend (last 7 days)
  const panel = el('div', { class: 'panel' }, el('h3', { text: 'Sales — last 7 days' }));
  const bars = el('div', { class: 'bars' });
  panel.append(bars);
  root.append(panel);

  try {
    const to = new Date();
    const from = new Date(Date.now() - 6 * 86400000);
    const rows = await api(`/api/reports/sales?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&group=day`);
    drawBars(bars, rows);
  } catch {
    bars.append(el('div', { class: 'muted', text: 'No sales data yet.' }));
  }

  // Live KPI updates from the socket
  const unsub = onLiveStats((s) => {
    cards.active.querySelector('.value').textContent = num(s.activeOrders);
    cards.tables.querySelector('.value').textContent = num(s.tablesInUse);
    cards.sales.querySelector('.value').textContent = money(s.salesToday, currency);
    cards.orders.querySelector('.value').textContent = num(s.ordersToday);
    cards.prep.querySelector('.value').textContent = `${num(s.avgPrepMin)} min`;
    cards.requests.querySelector('.value').textContent = num(s.openRequests);
  });
  // Cleanup when navigating away
  root.addEventListener('view:unload', unsub, { once: true });
}

function drawBars(container, rows) {
  container.innerHTML = '';
  if (!rows.length) {
    container.append(el('div', { class: 'muted', text: 'No sales data yet.' }));
    return;
  }
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  for (const r of rows) {
    const h = Math.max(2, Math.round((r.revenue / max) * 160));
    container.append(
      el('div', { class: 'bar', style: `height:${h}px`, title: `${r.period}: ${money(r.revenue, currency)} · ${r.orders} orders` }, el('span', { text: r.period.slice(5) }))
    );
  }
}
