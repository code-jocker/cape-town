import { $, el } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { openModal, closeModal, field, toast } from '../ui.js';
import { dateTime } from '../../shared/format.js';

export const title = 'Staff';

let staff = [];

export async function render(root) {
  const toolbar = el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary btn-sm', id: 'new-staff', text: '+ New staff' }));
  const panel = el('div', { class: 'panel' });
  const list = el('div', { id: 'staff-list' });
  panel.append(list);
  root.append(toolbar, panel);
  $('#new-staff', root).addEventListener('click', () => staffEditor(null, list));
  await load(list);
}

async function load(list) {
  list.innerHTML = '';
  list.append(el('div', { class: 'spinner' }));
  try {
    staff = await api('/api/staff');
    draw(list);
  } catch (err) {
    list.innerHTML = '';
    list.append(el('div', { class: 'text-danger', text: err.message }));
  }
}

function draw(list) {
  list.innerHTML = '';
  const tbl = el('table', { class: 'data-table' });
  tbl.append(el('thead', {}, el('tr', {}, ['Name', 'Username', 'Role', 'Status', 'Last login', ''].map((h) => el('th', { text: h })))));
  const tb = el('tbody');
  for (const u of staff) {
    tb.append(
      el(
        'tr',
        {},
        el('td', { text: u.name }),
        el('td', { text: u.username }),
        el('td', {}, el('span', { class: 'badge', text: u.role })),
        el('td', {}, el('span', { class: `badge ${u.isActive ? 'badge-success' : 'badge-danger'}`, text: u.isActive ? 'active' : 'disabled' })),
        el('td', { text: u.lastLogin ? dateTime(new Date(u.lastLogin)) : '—' }),
        el(
          'td',
          { style: 'white-space:nowrap' },
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => staffEditor(u, list), text: 'Edit' }),
          el('button', { class: 'btn btn-ghost btn-sm', onclick: () => resetPw(u), text: 'Password' })
        )
      )
    );
  }
  tbl.append(tb);
  list.append(tbl);
}

function staffEditor(u, list) {
  const name = el('input', { class: 'input', value: (u && u.name) || '' });
  const username = el('input', { class: 'input', value: (u && u.username) || '', disabled: !!u });
  const role = el('select', { class: 'input' });
  for (const r of ['manager', 'chef', 'waiter']) role.append(el('option', { value: r, text: r, selected: ((u && u.role) || 'waiter') === r }));
  const active = el('input', { type: 'checkbox', checked: u ? u.isActive !== false : true });
  const password = el('input', { class: 'input', type: 'password', placeholder: u ? '(unchanged)' : 'min 6 chars' });

  const fields = [field('Name', name), field('Username', username), field('Role', role)];
  if (!u) fields.push(field('Password', password));
  fields.push(el('label', { class: 'form-field' }, el('span', { text: 'Active' }), active));

  openModal({
    title: u ? `Edit ${u.name}` : 'New staff',
    body: el('div', { class: 'form-grid' }, ...fields),
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Save',
        onclick: async () => {
          try {
            if (u) {
              await api(`/api/staff/${u._id}`, { method: 'PATCH', body: { name: name.value.trim(), role: role.value, isActive: active.checked } });
            } else {
              if (!name.value.trim() || !username.value.trim()) return toast('Name and username are required');
              if (password.value.length < 6) return toast('Password must be at least 6 characters');
              await api('/api/staff', { method: 'POST', body: { name: name.value.trim(), username: username.value.trim(), password: password.value, role: role.value } });
            }
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

function resetPw(u) {
  const pw = el('input', { class: 'input', type: 'password', placeholder: 'new password (min 6)' });
  openModal({
    title: `Reset password — ${u.name}`,
    body: field('New password', pw, { full: true }),
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Reset',
        onclick: async () => {
          if (pw.value.length < 6) return toast('Min 6 characters');
          try {
            await api(`/api/staff/${u._id}/reset-password`, { method: 'POST', body: { password: pw.value } });
            closeModal();
            toast('Password updated');
          } catch (err) {
            toast(err.message);
          }
        }
      })
    ]
  });
}
