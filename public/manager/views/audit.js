import { el, $ } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { dateTime } from '../../shared/format.js';
import { toast, openModal, closeModal } from '../ui.js';

export const title = 'Audit log';

const ENTITIES = ['', 'Order', 'User', 'Table', 'MenuItem', 'Category', 'Promo', 'Settings', 'TableSession', 'ServiceRequest'];
let page = 1;

export async function render(root) {
  const toolbar = el('div', { class: 'toolbar' });

  const entitySel = el('select', { class: 'input' });
  for (const e of ENTITIES) entitySel.append(el('option', { value: e, text: e || 'All entities' }));
  entitySel.addEventListener('change', () => {
    page = 1;
    load(list, entitySel.value);
  });

  const deleteBtn = el('button', { class: 'btn btn-danger btn-sm', text: 'Delete old logs', style: 'margin-left:auto' });
  deleteBtn.addEventListener('click', () => openDeleteModal());

  toolbar.append(entitySel, deleteBtn);

  const panel = el('div', { class: 'panel' });
  const list = el('div', { id: 'audit-list' });
  const pager = el('div', { class: 'toolbar' });
  panel.append(list);
  root.append(toolbar, panel, pager);
  await load(list, '', pager);
}

function openDeleteModal() {
  const daysInput = el('input', { class: 'input', type: 'number', min: '1', max: '365', value: '30' });
  const confirmBtn = el('button', { class: 'btn btn-danger', text: 'Delete old logs' });
  const cancelBtn = el('button', { class: 'btn btn-ghost btn-sm', text: 'Delete all logs' });

  const body = el('div', { class: 'modal-body' },
    el('p', { class: 'muted', text: 'Remove audit log entries older than a number of days. This cannot be undone.' }),
    el('div', { class: 'opt-group' },
      el('label', { text: 'Days to keep' }),
      daysInput
    ),
    el('p', { class: 'muted', text: 'Click below to delete ALL audit logs (irreversible).' })
  );

  confirmBtn.onclick = async () => {
    const days = parseInt(daysInput.value, 10);
    if (isNaN(days) || days < 1) { toast('Enter a valid number of days', 'text-danger'); return; }
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting…';
    try {
      const res = await api(`/api/audit-logs?days=${days}`, { method: 'DELETE' });
      toast(`${res.data.deleted} log entries deleted`);
      closeModal();
    } catch (err) {
      toast(err.message || 'Delete failed', 'text-danger');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete old logs';
    }
  };

  cancelBtn.onclick = async () => {
    if (!confirm('Delete ALL audit logs? This cannot be undone.')) return;
    cancelBtn.disabled = true;
    cancelBtn.textContent = 'Deleting all…';
    try {
      const res = await api('/api/audit-logs?confirm=all', { method: 'DELETE' });
      toast(`${res.data.deleted} log entries deleted`);
      closeModal();
    } catch (err) {
      toast(err.message || 'Delete failed', 'text-danger');
    } finally {
      cancelBtn.disabled = false;
      cancelBtn.textContent = 'Delete all logs';
    }
  };

  openModal({ title: 'Delete old logs', body, footer: el('div', { class: 'row' }, confirmBtn, cancelBtn) });
}

async function load(list, entity = '', pager) {
  list.innerHTML = '';
  list.append(el('div', { class: 'spinner' }));
  const params = new URLSearchParams({ page, limit: 30 });
  if (entity) params.set('entity', entity);
  try {
    const d = await api(`/api/audit-logs?${params}`);
    draw(list, d.logs);
    if (pager) drawPager(pager, d, list, entity);
  } catch (err) {
    list.innerHTML = '';
    list.append(el('div', { class: 'text-danger', text: err.message }));
  }
}

function draw(list, logs) {
  list.innerHTML = '';
  if (!logs.length) {
    list.append(el('div', { class: 'muted', text: 'No audit entries.' }));
    return;
  }
  const tbl = el('table', { class: 'data-table' });
  tbl.append(el('thead', {}, el('tr', {}, ['When', 'Actor', 'Action', 'Entity', 'Changes'].map((h) => el('th', { text: h })))));
  const tb = el('tbody');
  for (const l of logs) {
    const changes = summarize(l.before, l.after);
    tb.append(
      el(
        'tr',
        {},
        el('td', { text: dateTime(new Date(l.createdAt)) }),
        el('td', { text: l.actorName }),
        el('td', {}, el('span', { class: 'badge', text: l.action })),
        el('td', { text: l.entity }),
        el('td', { class: 'muted', style: 'font-size:0.78rem', text: changes })
      )
    );
  }
  tbl.append(tb);
  list.append(tbl);
}

function summarize(before, after) {
  if (!before && !after) return '';
  const b = before || {};
  const a = after || {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const parts = [];
  for (const k of keys) {
    const bv = JSON.stringify(b[k]);
    const av = JSON.stringify(a[k]);
    if (bv !== av) parts.push(`${k}: ${(bv != null ? bv : '—')} → ${(av != null ? av : '—')}`);
  }
  const s = parts.join('; ');
  return s.length > 120 ? s.slice(0, 120) + '…' : s;
}

function drawPager(pager, d, list, entity) {
  pager.innerHTML = '';
  pager.append(
    el('button', { class: 'btn btn-ghost btn-sm', disabled: d.page <= 1, text: '← Prev', onclick: () => (page--, load(list, entity, pager)) }),
    el('span', { class: 'muted', text: `Page ${d.page} of ${d.pages} · ${d.total}` }),
    el('button', { class: 'btn btn-ghost btn-sm', disabled: d.page >= d.pages, text: 'Next →', onclick: () => (page++, load(list, entity, pager)) })
  );
}
