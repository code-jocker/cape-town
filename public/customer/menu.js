/**
 * Customer menu app — main controller.
 * Boot -> validate table token -> load menu -> render -> cart -> order ->
 * live tracker, all without any framework.
 */

import { api, apiRetryable, ApiError, setDefaultHeader } from '../shared/api.js';
import { el, $, $$, delegate } from '../shared/dom.js';
import { money } from '../shared/format.js';
import { t, getLang, setLang, LANGUAGES } from '../shared/i18n.js';
import { connectSocket, on, joinCustomerOrders } from '../shared/socket.js';
import * as cart from './cart.js';
import { initTracker, refresh as refreshTracker } from './tracker.js';

const state = {
  token: '', tableId: '', tableNumber: 0, sessionId: '', currency: 'RWF',
  items: [], categories: [], announcement: '', openNow: true, eta: 15,
  activeCat: 'all', query: ''
};

const CTX_KEY = () => `ep-ctx-${state.tableId}`;

/* ============================== Boot ============================== */

async function boot() {
  applyI18n();
  const token = new URLSearchParams(location.search).get('t');
  if (!token) return fatal('No table code found. Please scan the QR code on your table.');
  state.token = token;
  setDefaultHeader('x-table-token', token);
  wireOffline();

  try {
    const info = await api(`/api/public/table/${encodeURIComponent(token)}`);
    state.tableId = info.table.id;
    state.tableNumber = info.table.number;
    state.sessionId = info.sessionId;
    state.currency = info.restaurant.currency || 'RWF';
    localStorage.setItem(CTX_KEY(), JSON.stringify({ token, sessionId: info.sessionId, number: info.table.number }));
  } catch (err) {
    return fatal(err instanceof ApiError ? err.message : 'Could not reach the restaurant. Check your connection.');
  }

  showApp();
  await loadMenu();
  initTracker({
    tableId: state.tableId,
    sessionId: state.sessionId,
    currency: state.currency,
    eta: state.eta,
    feedbackHandler: () => {}
  });
  setupChips();
  setupSearch();
  setupFab();
  setupNav();
  setupSocket();
  restoreOfflineOrder();
  refreshCartBar();
  registerSW();
}

function registerSW() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function showApp() {
  $('#boot').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#fab-wrap').classList.remove('hidden');
  const pill = $('#table-pill');
  pill.textContent = `${t('common.table')} ${state.tableNumber}`;
  pill.classList.remove('hidden');
}

function fatal(message) {
  $('#boot-text').textContent = message;
  const retry = $('#boot-retry');
  retry.classList.remove('hidden');
  retry.onclick = () => location.reload();
}

async function loadMenu() {
  const data = await apiRetryable(`/api/public/menu?lang=${getLang()}`);
  state.items = data.items;
  state.categories = data.categories;
  state.announcement = data.announcement || '';
  state.openNow = data.openNow !== false;
  state.eta = data.etaMinutes || 15;
  renderTicker();
  renderClosed();
  renderMenu();
}

/* ============================== Rendering ============================== */

function renderTicker() {
  const ticker = $('#ticker');
  if (!state.announcement) { ticker.classList.add('hidden'); return; }
  $('#ticker-text').textContent = state.announcement;
  ticker.classList.remove('hidden');
}

function renderClosed() {
  const banner = $('#closed-banner');
  if (state.openNow) { banner.classList.add('hidden'); return; }
  banner.textContent = t('menu.closed');
  banner.classList.remove('hidden');
}

function setupChips() {
  const chips = $('#chips');
  chips.replaceChildren();
  const all = chip('all', t('common.all'));
  chips.append(all);
  for (const c of state.categories) {
    chips.append(chip(c._id, locName(c.name)));
  }
  delegate(chips, 'click', '.chip', (e, target) => {
    state.activeCat = target.dataset.cat;
    $$('.chip', chips).forEach((ch) => ch.classList.toggle('active', ch === target));
    const section = document.getElementById(`sec-${target.dataset.cat}`);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  setupScrollSpy();
}

function chip(catId, label) {
  return el('button', { class: `chip${catId === state.activeCat ? ' active' : ''}`, role: 'tab', 'data-cat': catId, text: label });
}

function renderMenu() {
  const list = $('#menu-list');
  list.replaceChildren();
  const byCat = new Map();
  for (const item of state.items) {
    if (!byCat.has(String(item.category))) byCat.set(String(item.category), []);
    byCat.get(String(item.category)).push(item);
  }
  for (const c of state.categories) {
    const items = byCat.get(String(c._id)) || [];
    if (!items.length) continue;
    const section = el('section', { id: `sec-${c._id}`, 'data-cat': c._id });
    section.append(el('h2', { class: 'section-title', text: locName(c.name) }));
    for (const item of items) section.append(itemRow(item));
    list.append(section);
  }
}

function itemRow(item) {
  const inCart = cartLineQty(item);
  const soldOut = item.isAvailable === false;
  const row = el('div', { class: `item-row${soldOut ? ' soldout' : ''}`, 'data-item': item._id });

  const img = el('img', {
    class: 'item-photo', src: item.image?.thumbUrl || item.image?.url || '/icons/logo.svg',
    alt: '', width: '64', height: '80', loading: 'lazy', decoding: 'async'
  });

  const tags = el('div', { class: 'item-tags' });
  for (const tag of item.tags || []) tags.append(el('span', { class: 'tag', text: t(`menu.tags.${tag}`) }));

  const body = el('div', { class: 'item-body' },
    el('p', { class: 'item-name', text: locName(item.name) }),
    el('p', { class: 'item-desc', text: locDesc(item) }),
    tags,
    el('p', { class: 'item-price', style: 'margin:6px 0 0;', text: money(item.price, state.currency) })
  );

  const action = el('div', { class: 'item-action' });
  if (soldOut) {
    action.append(el('span', { class: 'badge badge-danger', text: t('common.soldOut') }));
  } else if (inCart > 0) {
    action.append(stepper(item._id, inCart));
  } else {
    action.append(el('button', { class: 'add-btn', 'data-add': item._id, text: `+ ${t('common.add')}` }));
  }

  row.append(img, body, action);
  if (!soldOut) {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]') || e.target.closest('.stepper')) return;
      openItemSheet(item);
    });
  }
  return row;
}

function stepper(itemId, qty) {
  return el('div', { class: 'stepper', 'data-stepper': itemId },
    el('button', { 'data-dec': itemId, 'aria-label': '-', text: '−' }),
    el('span', { class: 'qty', text: String(qty) }),
    el('button', { 'data-inc': itemId, 'aria-label': '+', text: '+' })
  );
}

/* ============================== Scroll spy ============================== */

function setupScrollSpy() {
  const sections = $$('section[data-cat]');
  if (!sections.length || !('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      const cat = visible.target.dataset.cat;
      const chipEl = $(`#chips .chip[data-cat="${cat}"]`);
      if (chipEl && state.activeCat !== cat) {
        state.activeCat = cat;
        $$('#chips .chip').forEach((c) => c.classList.toggle('active', c === chipEl));
        chipEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    },
    { rootMargin: '-70px 0px -70% 0px', threshold: 0 }
  );
  sections.forEach((s) => obs.observe(s));
}

/* ============================== Search ============================== */

function setupSearch() {
  const btn = $('#search-btn');
  const row = $('#search-row');
  const input = $('#search-input');
  let timer = null;
  btn.addEventListener('click', () => {
    const hidden = row.classList.toggle('hidden');
    if (!hidden) { input.placeholder = t('menu.searchPlaceholder'); input.focus(); }
    else { input.value = ''; state.query = ''; renderFiltered(); }
  });
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.query = input.value.trim().toLowerCase(); renderFiltered(); }, 150);
  });
}

function renderFiltered() {
  const q = state.query;
  for (const row of $$('#menu-list .item-row')) {
    const item = state.items.find((i) => i._id === row.dataset.item);
    const match = !q || !item || matches(item, q);
    row.classList.toggle('hidden', !match);
  }
  for (const sec of $$('#menu-list section')) {
    const anyVisible = $$('.item-row:not(.hidden)', sec).length > 0;
    sec.classList.toggle('hidden', !anyVisible);
  }
  if (q && !$$('#menu-list .item-row:not(.hidden)').length) {
    if (!$('#empty-search')) $('#menu-list').append(el('p', { id: 'empty-search', class: 'muted', style: 'text-align:center;padding:30px;', text: t('menu.empty') }));
  } else {
    $('#empty-search')?.remove();
  }
}

function matches(item, q) {
  const hay = [item.name?.en, item.name?.fr, item.name?.rw, item.description?.en].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

/* ============================== Item sheet ============================== */

function openItemSheet(item) {
  const selections = new Map(); // option name -> Set(labels)
  const hasRequired = (item.options || []).some((o) => o.required);

  const body = el('div', { class: 'sheet-body' });
  body.append(el('p', { class: 'muted', style: 'margin:0 0 8px;', text: locDesc(item) }));

  for (const opt of item.options || []) {
    selections.set(opt.name, new Set());
    const group = el('div', { class: 'opt-group' });
    group.append(el('h4', {}, opt.name, ' ', el('span', { class: 'req', text: opt.required ? `(${t('common.required')})` : `(${t('common.optional')})` })));
    for (const choice of opt.choices) {
      const pill = el('div', { class: 'opt-choice', role: 'button', tabindex: '0' },
        el('span', { text: choice.label }),
        choice.extraPrice ? el('span', { class: 'extra', text: `+ ${money(choice.extraPrice, state.currency)}` }) : null
      );
      const toggle = () => {
        const set = selections.get(opt.name);
        if (opt.multiple) { set.has(choice.label) ? set.delete(choice.label) : set.add(choice.label); }
        else { set.clear(); set.add(choice.label); group.querySelectorAll('.opt-choice').forEach((o) => o.classList.remove('selected')); }
        pill.classList.toggle('selected', set.has(choice.label));
        updatePrice();
      };
      pill.addEventListener('click', toggle);
      pill.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      group.append(pill);
    }
    body.append(group);
  }

  const note = el('input', { class: 'input', placeholder: t('common.notesPlaceholder'), maxlength: '200' });
  body.append(el('div', { class: 'opt-group' }, el('h4', { text: t('common.notes') }), note));

  let qty = 1;
  const qtyLabel = el('span', { class: 'qty', style: 'min-width:28px;text-align:center;font-weight:700;', text: '1' });
  const dec = el('button', { text: '−', onclick: () => { qty = Math.max(1, qty - 1); qtyLabel.textContent = qty; updatePrice(); } });
  const inc = el('button', { text: '+', onclick: () => { qty = Math.min(50, qty + 1); qtyLabel.textContent = qty; updatePrice(); } });
  dec.style.cssText = inc.style.cssText = 'width:38px;height:38px;border:1.5px solid var(--color-divider);border-radius:50%;background:var(--color-bg);font-size:18px;cursor:pointer;';
  const qtyRow = el('div', { class: 'row', style: 'gap:12px;margin:6px 0 4px;' },
    el('span', { style: 'font-weight:600;', text: t('common.quantity') }), dec, qtyLabel, inc);
  body.append(qtyRow);

  const priceLabel = el('span', { text: '' });
  function updatePrice() {
    priceLabel.textContent = money(linePrice(item, selections) * qty, state.currency);
  }
  updatePrice();

  const addBtn = el('button', { class: 'btn btn-primary', style: 'flex:1;', text: t('common.add') });
  addBtn.addEventListener('click', () => {
    for (const opt of item.options || []) {
      if (opt.required && selections.get(opt.name).size === 0) {
        toast(`${opt.name} — ${t('common.required')}`); return;
      }
    }
    const selectedOptions = [...selections.entries()]
      .filter(([, set]) => set.size)
      .map(([name, set]) => {
        const choices = [...set].map((label) => {
          const c = (item.options.find((o) => o.name === name)?.choices || []).find((x) => x.label === label);
          return { label, extraPrice: c?.extraPrice || 0 };
        });
        return { name, choices };
      });
    cart.addToCart(state.tableId, {
      itemId: item._id, name: locName(item.name), price: item.price, quantity: qty,
      selectedOptions, note: note.value.trim()
    });
    closeSheet();
    refreshCartBar();
    updateRowActions();
    toast(t('order.placed').replace('!', ''));
  });

  const sheet = openSheet(t('common.add'), body, el('div', { class: 'sheet-foot' }, el('div', { class: 'total-label' }, priceLabel), addBtn));
  return sheet;
}

function linePrice(item, selections) {
  let price = item.price;
  for (const [, set] of selections) {
    for (const label of set) {
      const c = (item.options || []).flatMap((o) => o.choices).find((x) => x.label === label);
      if (c?.extraPrice) price += c.extraPrice;
    }
  }
  return price;
}

/* ============================== Cart sheet ============================== */

function openCartSheet() {
  const body = el('div', { class: 'sheet-body' });
  const c = cart.getCart(state.tableId);
  if (!c.lines.length) {
    body.append(el('p', { class: 'muted', style: 'text-align:center;padding:30px;', text: t('cart.empty') }));
    openSheet(t('cart.title'), body, null);
    return;
  }
  for (const line of c.lines) {
    const opts = (line.selectedOptions || []).map((o) => `${o.name}: ${o.choices.map((x) => x.label).join(', ')}`).join(' · ');
    const decB = el('button', { 'aria-label': '-', text: '−' });
    const incB = el('button', { 'aria-label': '+', text: '+' });
    const qtyEl = el('span', { text: String(line.quantity), style: 'min-width:20px;text-align:center;' });
    decB.onclick = () => { cart.changeQuantity(state.tableId, line._sig, -1); closeSheet(); refreshCartBar(); updateRowActions(); if (cart.getCart(state.tableId).lines.length) openCartSheet(); };
    incB.onclick = () => { cart.changeQuantity(state.tableId, line._sig, +1); qtyEl.textContent = line.quantity + 1; };
    const unit = line.price + (line.selectedOptions || []).reduce((s, o) => s + (o.extras || o.choices || []).reduce((x, e) => x + (e.extraPrice || 0), 0), 0);
    body.append(el('div', { class: 'cart-line' },
      el('div', { class: 'cart-line-info' },
        el('div', { class: 'cart-line-name', text: line.name }),
        opts ? el('div', { class: 'cart-line-opts', text: opts }) : null,
        line.note ? el('div', { class: 'cart-line-opts', text: '“' + line.note + '”' }) : null,
        el('div', { class: 'qty-inline' }, decB, qtyEl, incB)),
      el('div', { class: 'cart-line-price', text: money(unit * line.quantity, state.currency) })
    ));
  }

  const promoInput = el('input', { class: 'input', placeholder: t('cart.promo'), value: c.promo || '', maxlength: '40' });
  const applyBtn = el('button', { class: 'btn btn-ghost btn-sm', text: t('cart.promoApply') });
  applyBtn.onclick = () => { cart.setPromo(state.tableId, promoInput.value); toast(promoInput.value ? t('cart.promoApply') : ''); };
  body.append(el('div', { class: 'opt-group' }, el('h4', { text: t('cart.promo') }), el('div', { class: 'row' }, promoInput, applyBtn)));

  const estimate = el('div', { class: 'total-label', text: money(cart.cartEstimate(c), state.currency) });
  const checkout = el('button', { class: 'btn btn-primary', style: 'flex:1;', text: t('cart.checkout') });
  checkout.onclick = () => placeOrder();
  const foot = el('div', { class: 'sheet-foot' }, estimate, checkout);
  openSheet(t('cart.title'), body, foot);
}

/* ============================== Place order ============================== */

async function placeOrder() {
  const payload = cart.toOrderPayload(state.tableId);
  if (!payload.items.length) return;
  const idempotencyKey = `ep-${state.tableId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const body = { ...payload, idempotencyKey };

  if (!state.openNow) { toast(t('menu.closed')); return; }

  // Persist for offline retry BEFORE attempting the network call.
  cart.savePendingOrder(state.tableId, body);
  closeSheet();
  toast(t('order.placing'));

  try {
    const data = await apiRetryable('/api/public/orders', { method: 'POST', body });
    onOrderPlaced(data);
  } catch (err) {
    if (err instanceof ApiError) {
      // Server rejected it (validation, sold out, closed). Do not retry blindly.
      cart.clearPendingOrder(state.tableId);
      toast(err.message);
    } else {
      // Network failure — keep pending, tell the user it was NOT sent.
      toast(t('order.notSent'));
    }
  }
}

function onOrderPlaced(data) {
  cart.clearPendingOrder(state.tableId);
  cart.clearCart(state.tableId);
  const order = data.order;
  cart.addOrder(state.tableId, { id: order.id, orderNumber: order.orderNumber, status: order.status, total: order.total, createdAt: order.createdAt });
  if (data.sessionId) state.sessionId = data.sessionId;
  if (data.etaMinutes) state.eta = data.etaMinutes;
  refreshCartBar();
  updateRowActions();
  joinCustomerOrders(cart.getOrders(state.tableId).map((o) => o.id));
  switchView('tracker');
  refreshTracker().catch(() => {});
  toast(t('order.placed'));
}

function restoreOfflineOrder() {
  const pending = cart.getPendingOrder(state.tableId);
  if (!pending) return;
  toast(t('order.retrying'));
  apiRetryable('/api/public/orders', { method: 'POST', body: pending })
    .then(onOrderPlaced)
    .catch(() => toast(t('order.notSent')));
}

/* ============================== Cart bar + row actions ============================== */

function cartLineQty(item) {
  return cart.getCart(state.tableId).lines
    .filter((l) => l.itemId === item._id)
    .reduce((s, l) => s + l.quantity, 0);
}

function refreshCartBar() {
  const c = cart.getCart(state.tableId);
  const bar = $('#cart-bar');
  const count = cart.cartCount(c);
  if (!count) { bar.classList.add('hidden'); bar.textContent = ''; return; }
  bar.classList.remove('hidden');
  bar.textContent = `${t('cart.view')} · ${count} ${t('cart.items')} · ${money(cart.cartEstimate(c), state.currency)}`;
}

function updateRowActions() {
  for (const row of $$('#menu-list .item-row')) {
    const item = state.items.find((i) => i._id === row.dataset.item);
    if (!item || item.isAvailable === false) continue;
    const action = $('.item-action', row);
    const qty = cartLineQty(item);
    action.replaceChildren(qty > 0 ? stepper(item._id, qty) : el('button', { class: 'add-btn', 'data-add': item._id, text: `+ ${t('common.add')}` }));
  }
  refreshCartBar();
}

// delegated handlers for add / stepper (works after re-render)
delegate(document, 'click', '[data-add]', (e, target) => {
  const item = state.items.find((i) => i._id === target.dataset.add);
  if (!item) return;
  const hasOpts = (item.options || []).some((o) => o.required || o.choices.length);
  if (hasOpts) { openItemSheet(item); return; }
  cart.addToCart(state.tableId, { itemId: item._id, name: locName(item.name), price: item.price, quantity: 1, selectedOptions: [], note: '' });
  updateRowActions();
});
delegate(document, 'click', '[data-inc]', (e, target) => {
  const item = state.items.find((i) => i._id === target.dataset.inc);
  const line = cart.getCart(state.tableId).lines.find((l) => l.itemId === item._id && !(l.selectedOptions || []).length);
  if (line) cart.changeQuantity(state.tableId, line._sig, +1);
  updateRowActions();
});
delegate(document, 'click', '[data-dec]', (e, target) => {
  const item = state.items.find((i) => i._id === target.dataset.dec);
  const line = cart.getCart(state.tableId).lines.find((l) => l.itemId === item._id && !(l.selectedOptions || []).length);
  if (line) cart.changeQuantity(state.tableId, line._sig, -1);
  updateRowActions();
});

/* ============================== FAB (requests) ============================== */

function setupFab() {
  const fab = $('#fab');
  const menu = $('#fab-menu');
  fab.addEventListener('click', () => {
    const open = menu.classList.toggle('hidden');
    fab.setAttribute('aria-expanded', String(!open));
  });
  delegate(menu, 'click', '.fab-item', (e, target) => sendRequest(target.dataset.request));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#fab-wrap')) { menu.classList.add('hidden'); fab.setAttribute('aria-expanded', 'false'); }
  });
}

async function sendRequest(type) {
  const key = `ep-req-${type}-${state.tableId}`;
  const last = Number(localStorage.getItem(key) || 0);
  if (Date.now() - last < 30000) { toast(t('fab.cooldown')); return; }
  localStorage.setItem(key, String(Date.now()));
  $('#fab-menu').classList.add('hidden');
  try {
    await api('/api/public/requests', { method: 'POST', body: { type, tableToken: state.token } });
    toast(type === 'bill' ? t('order.billRequested') : t('fab.done'));
  } catch {
    localStorage.removeItem(key);
    toast(t('order.failed'));
  }
}

/* ============================== Nav / views ============================== */

function setupNav() {
  $('#cart-bar').addEventListener('click', openCartSheet);
  $('#back-to-menu').addEventListener('click', () => switchView('menu'));
  $('#lang-btn').addEventListener('click', cycleLang);
}

function switchView(view) {
  $('#view-menu').classList.toggle('hidden', view !== 'menu');
  $('#view-tracker').classList.toggle('hidden', view !== 'tracker');
  $('#cart-bar').classList.toggle('hidden', view !== 'menu' || !cart.cartCount(cart.getCart(state.tableId)));
  if (view === 'tracker') refreshTracker().catch(() => {});
}

function cycleLang() {
  const codes = LANGUAGES.map((l) => l.code);
  const next = codes[(codes.indexOf(getLang()) + 1) % codes.length];
  setLang(next);
  applyI18n();
  loadMenu().then(() => { setupChips(); renderFiltered(); updateRowActions(); });
}

/* ============================== Socket ============================== */

function setupSocket() {
  connectSocket({
    mode: 'customer',
    tableToken: state.token,
    orderIds: cart.getOrders(state.tableId).map((o) => o.id),
    onReady: () => { if (!$('#view-tracker').classList.contains('hidden')) refreshTracker().catch(() => {}); }
  }).catch(() => {});

  on('menu:availability', (p) => {
    const item = state.items.find((i) => i._id === p.itemId);
    if (item) { item.isAvailable = p.isAvailable; }
    // Re-render the affected row action + sold-out state
    const row = $(`.item-row[data-item="${p.itemId}"]`);
    if (row) row.replaceWith(itemRow(item));
  });
  // order:updated / order:ready are handled in-place by tracker.js
}

/* ============================== Sheets + toast + helpers ============================== */

function openSheet(title, bodyNode, footNode) {
  const root = $('#sheet-root');
  const backdrop = el('div', { class: 'sheet-backdrop' });
  const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    el('div', { class: 'sheet-grab' }),
    el('div', { class: 'sheet-head' }, el('h3', { class: 'sheet-title', text: title }), el('button', { class: 'sheet-close', 'aria-label': t('common.close'), text: '×' })),
    bodyNode, footNode);
  root.append(backdrop, sheet);
  requestAnimationFrame(() => { backdrop.classList.add('open'); sheet.classList.add('open'); });
  const close = () => { backdrop.classList.remove('open'); sheet.classList.remove('open'); setTimeout(() => { backdrop.remove(); sheet.remove(); }, 250); };
  backdrop.onclick = close;
  $('.sheet-close', sheet).onclick = close;
  sheet._close = close;
  return sheet;
}

function closeSheet() {
  const sheet = $('#sheet-root .sheet');
  if (sheet?._close) sheet._close();
}

let toastTimer = null;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.add('hidden'), 2600);
}

function locName(name) { return name?.[getLang()] || name?.en || ''; }
function locDesc(item) { return item.description?.[getLang()] || item.description?.en || ''; }

function applyI18n() {
  $('#lang-btn').textContent = getLang().toUpperCase();
  $$('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
}

function wireOffline() {
  const banner = $('#offline-banner');
  const update = () => { banner.classList.toggle('show', !navigator.onLine); };
  window.addEventListener('online', () => { update(); restoreOfflineOrder(); });
  window.addEventListener('offline', update);
  update();
}

// Expose nothing else at module level — boot() drives everything.
boot().catch((err) => { console.error(err); fatal('Something went wrong loading the menu.'); });
