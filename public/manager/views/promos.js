import { $, el } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { openModal, closeModal, field, toast, confirmAction } from '../ui.js';
import { money, dateShort } from '../../shared/format.js';

export const title = 'Promos';

let promos = [];
let currency = 'RWF';

export async function render(root) {
  try {
    const s = await api('/api/settings');
    currency = s.currency || 'RWF';
  } catch (e) {}
  const toolbar = el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary btn-sm', id: 'new-promo', text: '+ New promo' }));
  const panel = el('div', { class: 'panel' });
  const list = el('div', { id: 'promo-list' });
  panel.append(list);
  root.append(toolbar, panel);
  $('#new-promo', root).addEventListener('click', () => promoEditor(null, list));
  await load(list);
}

async function load(list) {
  list.innerHTML = '';
  list.append(el('div', { class: 'spinner' }));
  try {
    promos = await api('/api/promos');
    draw(list);
  } catch (err) {
    list.innerHTML = '';
    list.append(el('div', { class: 'text-danger', text: err.message }));
  }
}

function draw(list) {
  list.innerHTML = '';
  if (!promos.length) {
    list.append(el('div', { class: 'muted', text: 'No promo codes.' }));
    return;
  }
  const tbl = el('table', { class: 'data-table' });
  tbl.append(el('thead', {}, el('tr', {}, ['Code', 'Discount', 'Valid', 'Uses', 'Status', ''].map((h) => el('th', { text: h })))));
  const tb = el('tbody');
  for (const p of promos) {
    const val = p.type === 'percent' ? `${p.value}%` : money(p.value, currency);
    const validity = `${p.validFrom ? dateShort(new Date(p.validFrom)) : '—'} → ${p.validTo ? dateShort(new Date(p.validTo)) : '∞'}`;
    tb.append(
      el(
        'tr',
        {},
        el('td', {}, el('strong', { text: p.code })),
        el('td', { text: val }),
        el('td', { text: validity }),
        el('td', { text: p.maxUses ? `${p.used || 0}/${p.maxUses}` : `${p.used || 0}/∞` }),
        el('td', {}, el('span', { class: `badge ${p.isActive ? 'badge-success' : 'badge-danger'}`, text: p.isActive ? 'active' : 'off' })),
        el(
          'td',
          { style: 'white-space:nowrap' },
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => promoEditor(p, list), text: 'Edit' }),
          el('button', {
            class: 'btn btn-ghost btn-sm text-danger',
            text: 'Del',
            onclick: async () => {
              if (!confirmAction(`Delete promo ${p.code}?`)) return;
              try {
                await api(`/api/promos/${p._id}`, { method: 'DELETE' });
                toast('Deleted');
                await load(list);
              } catch (err) {
                toast(err.message);
              }
            }
          })
        )
      )
    );
  }
  tbl.append(tb);
  list.append(tbl);
}

function promoEditor(p, list) {
  const code = el('input', { class: 'input', value: (p && p.code) || '', placeholder: 'WELCOME10' });
  const type = el('select', { class: 'input' });
  for (const t of ['percent', 'fixed']) type.append(el('option', { value: t, text: t, selected: ((p && p.type) || 'percent') === t }));
  const value = el('input', { class: 'input', type: 'number', min: 0, value: (p && p.value != null ? p.value : 10 )});
  const from = el('input', { class: 'input', type: 'date', value: (p && p.validFrom) ? new Date(p.validFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) });
  const to = el('input', { class: 'input', type: 'date', value: (p && p.validTo) ? new Date(p.validTo).toISOString().slice(0, 10) : '' });
  const maxUses = el('input', { class: 'input', type: 'number', min: 0, value: (p && p.maxUses != null ? p.maxUses : 0 )});
  const active = el('input', { type: 'checkbox', checked: p ? p.isActive !== false : true });

  openModal({
    title: p ? `Edit ${p.code}` : 'New promo',
    body: el('div', { class: 'form-grid' }, field('Code', code), field('Type', type), field('Value', value), field('Valid from', from), field('Valid to', to), field('Max uses (0 = ∞)', maxUses), el('label', { class: 'form-field' }, el('span', { text: 'Active' }), active)),
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Save',
        onclick: async () => {
          if (code.value.trim().length < 3) return toast('Code must be at least 3 chars');
          const payload = {
            code: code.value.trim().toUpperCase(),
            type: type.value,
            value: Number(value.value) || 0,
            maxUses: Number(maxUses.value) || 0,
            isActive: active.checked
          };
          if (from.value) payload.validFrom = new Date(`${from.value}T00:00:00`).toISOString();
          if (to.value) payload.validTo = new Date(`${to.value}T23:59:59`).toISOString();
          else payload.validTo = null;
          try {
            if (p) await api(`/api/promos/${p._id}`, { method: 'PATCH', body: payload });
            else await api('/api/promos', { method: 'POST', body: payload });
            closeModal();
            toast('Saved');
            await load(list);
          } catch (err) {
            toast(err.message);
          }
        }
      })
    ]
  });
}
