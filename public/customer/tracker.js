/**
 * Live order tracker for the customer.
 * Renders one card per order in the current session:
 *   Received -> Accepted -> Preparing -> Ready -> Served
 * Real-time via Socket.IO (order:updated / order:ready), with a 10s
 * polling fallback while the socket is down.
 */

import { api } from '../shared/api.js';
import { money } from '../shared/format.js';
import { t } from '../shared/i18n.js';
import { el, $ } from '../shared/dom.js';
import { on } from '../shared/socket.js';
import { playStatus, notify } from '../shared/audio.js';
import { addOrder, getOrders, setOrders } from './cart.js';

const STEP_KEYS = ['pending', 'accepted', 'preparing', 'ready', 'served'];
const STEP_PROGRESS = { pending: 10, accepted: 30, preparing: 55, ready: 80, served: 100 };

let tableId = null;
let sessionId = null;
let currency = 'RWF';
let etaMinutes = 15;
let pollTimer = null;
let renderedIds = new Set();
let onFeedback = null; // callback(order) when an order reaches served
let flashTimer = null;

function flashToast(msg) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = msg;
  node.classList.remove('hidden');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => node.classList.add('hidden'), 3200);
}

export function initTracker({ tableId: tid, sessionId: sid, currency: cur, eta, feedbackHandler }) {
  tableId = tid;
  sessionId = sid;
  currency = cur || 'RWF';
  etaMinutes = eta || 15;
  onFeedback = feedbackHandler;

  on('order:updated', (p) => updateLocalOrder(p.id, p.status));
  on('order:ready', (p) => updateLocalOrder(p.id, 'ready'));

  startPolling();
}

export function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    if (document.hidden) return;
    refresh().catch(() => {});
  }, 10000);
}

export function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export async function refresh() {
  if (!tableId || !sessionId) return;
  const data = await api(`/api/public/session/orders?sid=${encodeURIComponent(sessionId)}`);
  const orders = data.orders || [];
  setOrders(tableId, orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, total: o.total, createdAt: o.createdAt })));
  const badge = $('#session-total');
  if (badge) {
    const total = orders.reduce((s, o) => s + (o.status === 'cancelled' ? 0 : o.total || 0), 0);
    badge.textContent = `${t('common.total')}: ${money(total, currency)}`;
  }
  render(orders);
}

function updateLocalOrder(id, status) {
  const orders = getOrders(tableId);
  const local = orders.find((o) => o.id === id);
  if (local) {
    const was = local.status;
    local.status = status;
    addOrder(tableId, local);
    if (status !== was && (status === 'ready' || status === 'served')) {
      playStatus();
      flashToast(t(status === 'ready' ? 'order.readyToast' : 'order.servedToast', { no: local.orderNumber }));
      notify(t('order.tracking'), `${local.orderNumber} — ${t(`status.${status}`)}`);
    }
  }
  const card = $(`[data-order-card="${id}"]`);
  if (card) {
    applyStatusToCard(card, id, status);
  } else {
    render(getOrders(tableId));
  }
}

export function render(orders) {
  const panel = $('#orders-panel');
  if (!panel) return;

  if (!orders.length) {
    panel.replaceChildren(
      el('p', { class: 'muted', style: 'padding: 30px 16px; text-align: center;', text: t('order.noOrders') })
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const order of [...orders].reverse()) {
    const existing = $(`[data-order-card="${order.id}"]`);
    if (existing) {
      applyStatusToCard(existing, order.id, order.status);
      fragment.append(existing);
      continue;
    }
    fragment.append(buildCard(order));
  }
  panel.replaceChildren(fragment);
}

function buildCard(order) {
  const card = el('div', { class: 'order-card card', 'data-order-card': order.id });

  const head = el('div', { class: 'order-no' },
    el('span', { text: order.orderNumber }),
    el('span', { class: 'eta', text: order.status === 'pending' || order.status === 'accepted' || order.status === 'preparing' ? `${t('order.eta')}: ~${etaMinutes} ${t('order.etaMin')}` : '' })
  );

  const steps = el('div', { class: 'steps' });
  const currentIndex = STEP_KEYS.indexOf(order.status);
  STEP_KEYS.forEach((key, i) => {
    const cls = i < currentIndex || order.status === 'served' ? 'done' : i === currentIndex ? 'current' : '';
    steps.append(el('div', { class: `step ${cls}`.trim() },
      el('span', { class: 'dot' }),
      el('span', { text: t(`status.${key}`) })
    ));
  });

  const track = el('div', { class: 'progress-track' },
    el('div', { class: 'progress-fill', style: `width:${STEP_PROGRESS[order.status] || 0}%` })
  );

  const itemsLine = el('p', { class: 'order-items-line' },
    order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
  );
  const totalLine = el('p', { class: 'order-items-line' },
    `${t('common.total')}: `, el('strong', { text: money(order.total, currency) })
  );

  card.append(head, steps, track, itemsLine, totalLine);

  if (order.status === 'cancelled') {
    card.append(el('p', { class: 'cancelled-note', text: `${t('status.cancelled')}${order.cancelReason ? ' — ' + order.cancelReason : ''}` }));
  }

  if (order.status === 'served' && onFeedback && !(order.feedback && order.feedback.rating)) {
    card.append(buildFeedback(order));
  }

  applyStatusToCard(card, order.id, order.status);
  renderedIds.add(order.id);
  return card;
}

function applyStatusToCard(card, id, status) {
  const steps = card.querySelectorAll('.step');
  const currentIndex = STEP_KEYS.indexOf(status);
  steps.forEach((stepEl, i) => {
    const cls = i < currentIndex || status === 'served' ? 'done' : i === currentIndex ? 'current' : '';
    stepEl.className = `step ${cls}`.trim();
  });
  const fill = card.querySelector('.progress-fill');
  if (fill) fill.style.width = `${STEP_PROGRESS[status] || 0}%`;
  const etaEl = card.querySelector('.eta');
  if (etaEl) {
    etaEl.textContent = ['pending', 'accepted', 'preparing'].includes(status)
      ? `${t('order.eta')}: ~${etaMinutes} ${t('order.etaMin')}`
      : status === 'paid' ? t('order.paid') : '';
  }
  if (status === 'served') {
    const order = getOrders(tableId).find((o) => o.id === id);
    if (order && onFeedback && !card.querySelector('.feedback-box')) {
      card.append(buildFeedback({ ...order, id }));
    }
  }
}

function buildFeedback(order) {
  let rating = 0;
  const box = el('div', { class: 'feedback-box' });
  const stars = el('div', { class: 'stars', role: 'radiogroup', 'aria-label': t('feedback.title') });
  for (let i = 1; i <= 5; i++) {
    const star = el('button', {
      type: 'button',
      'aria-label': `${i}`,
      text: '★',
      onclick: () => {
        rating = i;
        stars.querySelectorAll('button').forEach((b, idx) => b.classList.toggle('on', idx < i));
      }
    });
    stars.append(star);
  }
  const comment = el('textarea', { class: 'input', placeholder: t('feedback.comment'), maxlength: '500' });
  const send = el('button', {
    class: 'btn btn-primary btn-sm',
    text: t('feedback.send'),
    onclick: async () => {
      if (!rating) return;
      send.disabled = true;
      try {
        await api(`/api/public/orders/${order.id}/feedback`, {
          method: 'POST',
          body: { sid: sessionId, rating, comment: comment.value || undefined }
        });
        box.replaceChildren(el('p', { class: 'badge badge-success', text: t('feedback.thanks') }));
      } catch (e) {
        send.disabled = false;
      }
    }
  });
  box.append(el('p', { style: 'font-weight:600; margin:10px 0 2px;', text: t('feedback.title') }), stars, comment, send);
  return box;
}
