import { $, el } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { openModal, closeModal, field, toast, confirmAction } from '../ui.js';

export const title = 'Tables & QR';

let tables = [];

export async function render(root) {
  const toolbar = el(
    'div',
    { class: 'toolbar' },
    el('button', { class: 'btn btn-primary btn-sm', id: 'new-table', text: '+ New table' }),
    el('a', { class: 'btn btn-ghost btn-sm', href: '/api/tables/qr-sheet.pdf', target: '_blank', text: 'Download QR sheet (PDF)' })
  );
  const grid = el('div', { class: 'qr-grid', id: 'qr-grid' });
  root.append(toolbar, el('div', { class: 'panel' }, grid));

  $('#new-table', root).addEventListener('click', () => tableEditor(null, grid));
  await load(grid);
}

async function load(grid) {
  grid.innerHTML = '';
  grid.append(el('div', { class: 'spinner' }));
  try {
    tables = await api('/api/tables');
    draw(grid);
  } catch (err) {
    grid.innerHTML = '';
    grid.append(el('div', { class: 'text-danger', text: err.message }));
  }
}

function draw(grid) {
  grid.innerHTML = '';
  for (const t of tables) {
    grid.append(
      el(
        'div',
        { class: 'qr-card' },
        el('img', { src: `/api/tables/${t._id}/qr.png`, alt: `QR for table ${t.number}` }),
        el('div', { class: 't', text: t.label || `Table ${t.number}` }),
        el('div', { class: 'muted', style: 'font-size:0.72rem;word-break:break-all', text: `${t.capacity || '—'} seats · ${t.isActive ? 'active' : 'inactive'}` }),
        el(
          'div',
          { style: 'display:flex;gap:4px;justify-content:center;margin-top:8px;flex-wrap:wrap' },
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => tableEditor(t, grid), text: 'Edit' }),
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => regen(t, grid), text: 'New QR' }),
          el('a', { class: 'btn btn-ghost btn-sm', href: t.url, target: '_blank', text: 'Open' }),
          el('button', {
            class: 'btn btn-ghost btn-sm text-danger',
            text: 'Del',
            onclick: async () => {
              if (!confirmAction(`Delete table ${t.number}?`)) return;
              try {
                await api(`/api/tables/${t._id}`, { method: 'DELETE' });
                toast('Table deleted');
                await load(grid);
              } catch (err) {
                toast(err.message);
              }
            }
          })
        )
      )
    );
  }
}

async function regen(t, grid) {
  if (!confirmAction(`Regenerate the QR token for table ${t.number}? The old QR code will stop working.`)) return;
  try {
    await api(`/api/tables/${t._id}/regenerate-token`, { method: 'POST' });
    toast('New QR token issued');
    await load(grid);
  } catch (err) {
    toast(err.message);
  }
}

function tableEditor(t, grid) {
  const number = el('input', { class: 'input', type: 'number', min: 1, value: t?.number ?? tables.length + 1 });
  const label = el('input', { class: 'input', value: t?.label || '' });
  const capacity = el('input', { class: 'input', type: 'number', min: 1, value: t?.capacity ?? 4 });
  const active = el('input', { type: 'checkbox', checked: t ? t.isActive !== false : true });
  openModal({
    title: t ? `Edit table ${t.number}` : 'New table',
    body: el('div', { class: 'form-grid' }, field('Number', number), field('Label', label), field('Capacity', capacity), el('label', { class: 'form-field' }, el('span', { text: 'Active' }), active)),
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Save',
        onclick: async () => {
          const payload = { number: Number(number.value), label: label.value.trim(), capacity: Number(capacity.value) || 1, isActive: active.checked };
          if (!payload.number) return toast('Number is required');
          try {
            if (t) await api(`/api/tables/${t._id}`, { method: 'PATCH', body: payload });
            else await api('/api/tables', { method: 'POST', body: payload });
            closeModal();
            toast('Saved');
            await load(grid);
          } catch (err) {
            toast(err.message);
          }
        }
      })
    ]
  });
}
