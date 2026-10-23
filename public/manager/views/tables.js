import { $, el, delegate } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { openModal, closeModal, field, toast } from '../ui.js';

export const title = 'Tables & QR';

const API_BASE = (window.__API_BASE_URL__ || '').replace(/\/$/, '');

let tables = [];
let filter = 'all'; // 'all' | 'active' | 'inactive'
let search = '';
let loading = false;
let error = null;

const FIELD_ERRORS = new Map(); // field name -> message

export async function render(root) {
  root.innerHTML = '';

  const toolbar = el('div', { class: 'toolbar' },
    el('button', { class: 'btn btn-primary btn-sm', id: 'new-table', text: '+ New table' }),
    el('div', { class: 'filter-group' },
      el('span', { class: 'filter-label', text: 'Filter' }),
      filterChip('all', 'All'),
      filterChip('active', 'Active'),
      filterChip('inactive', 'Inactive')
    ),
    el('div', { class: 'search-group' },
      el('label', { class: 'search-label', text: 'Search' }),
      el('input', {
        class: 'input search-input',
        type: 'search',
        placeholder: 'Table number or label…',
        value: search,
        'aria-label': 'Search tables'
      })
    ),
    el('div', { class: 'bulk-actions' },
      el('a', {
        class: 'btn btn-primary btn-sm',
        href: `${API_BASE}/api/tables/qr-sheet.pdf`,
        target: '_blank',
        text: '📄 Download bulk QR sheet'
      }),
      el('a', {
        class: 'btn btn-ghost btn-sm',
        href: `${API_BASE}/api/tables/qr-table-tents.pdf`,
        target: '_blank',
        text: 'Table tents'
      })
    )
  );

  const stateBox = el('div', { class: 'table-state', id: 'table-state' });
  const grid = el('div', { class: 'qr-grid', id: 'qr-grid' });
  root.append(toolbar, stateBox, grid);

  $('#new-table', root).addEventListener('click', () => tableEditor(null));
  await load();
}

function filterChip(value, label) {
  const active = filter === value;
  return el('button', {
    class: `filter-chip${active ? ' active' : ''}`,
    'data-filter': value,
    text: label,
    'aria-pressed': active
  });
}

async function load() {
  loading = true;
  error = null;
  renderState();
  renderGrid();

  try {
    tables = await api('/api/tables');
    loading = false;
    error = null;
  } catch (err) {
    loading = false;
    error = err.message || 'Failed to load tables.';
  }
  renderState();
  renderGrid();
  wireSearch();
}

function renderState() {
  const box = $('#table-state');
  box.innerHTML = '';

  if (loading) {
    box.append(el('div', { class: 'loading', role: 'status', 'aria-live': 'polite' },
      el('div', { class: 'spinner' }),
      el('p', { class: 'muted', text: 'Loading tables…' })
    ));
    return;
  }

  if (error) {
    box.append(el('div', { class: 'error-state' },
      el('p', { class: 'text-danger', text: error }),
      el('button', { class: 'btn btn-primary btn-sm', onclick: () => load(), text: 'Try again' })
    ));
    return;
  }

  const visible = filteredTables();
  if (!visible.length) {
    const hasAny = tables.length > 0;
    box.append(el('div', { class: 'empty-state' },
      el('p', { class: 'muted', text: hasAny
        ? 'No tables match your current filter or search.'
        : 'No tables have been added yet.' }),
      !hasAny && el('button', { class: 'btn btn-primary btn-sm', onclick: () => tableEditor(null), text: 'Add your first table' })
    ));
    return;
  }
}

function filteredTables() {
  return tables.filter((t) => {
    if (filter === 'active' && !t.isActive) return false;
    if (filter === 'inactive' && t.isActive) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return String(t.number).includes(q)
      || String(t.label || '').toLowerCase().includes(q);
  });
}

function renderGrid() {
  const grid = $('#qr-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (loading || error) return; // state box handles these

  const visible = filteredTables();
  for (const t of visible) {
    grid.append(buildCard(t));
  }
}

function wireSearch() {
  const input = $('.search-input', $('#qr-grid').parentElement) || $('.search-input');
  if (input._wired) return;
  input._wired = true;
  let timer = null;
  input.addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = e.target.value;
      renderGrid();
    }, 150);
  });

  const container = $('#qr-grid').parentElement;
  delegate(container, 'click', '.filter-chip', (e, chip) => {
    filter = chip.dataset.filter;
    $$('.filter-chip', container).forEach((c) => {
      c.classList.toggle('active', c === chip);
      c.setAttribute('aria-pressed', c === chip);
    });
    renderGrid();
    renderState();
  });
}

function statusBadge(t) {
  return el('span', {
    class: `status-badge ${t.isActive ? 's-active' : 's-inactive'}`,
    text: t.isActive ? 'Active' : 'Inactive'
  });
}

function buildCard(t) {
  const qrUrl = `${API_BASE}/api/tables/${t._id}/qr.png`;
  const actions = el('div', { style: 'display:flex;gap:4px;justify-content:center;margin-top:8px;flex-wrap:wrap' },
    el('button', { class: 'btn btn-ghost btn-sm', title: 'Edit table', onclick: () => tableEditor(t), text: 'Edit' }),
    el('a', {
      class: 'btn btn-ghost btn-sm',
      href: qrUrl,
      download: `table-${t.number}-qr.png`,
      title: 'Download QR',
      text: '📥 QR'
    }),
    el('a', {
      class: 'btn btn-ghost btn-sm',
      href: `${API_BASE}/api/tables/${t._id}/regenerate-token`,
      target: '_blank',
      title: 'Regenerate QR token',
      text: '🔄 New QR'
    }),
    el('button', {
      class: `btn btn-ghost btn-sm ${t.isActive ? 'text-danger' : 'btn-success'}`,
      title: t.isActive ? 'Deactivate table' : 'Activate table',
      onclick: () => toggleActive(t),
      text: t.isActive ? 'Deactivate' : 'Activate'
    })
  );

  const warn = t.isActive
    ? el('p', { class: 'qr-warn muted', style: 'font-size:0.68rem;margin-top:6px;', text: 'Regenerating invalidates the previous QR code.' })
    : null;

  return el(
    'div',
    { class: `qr-card${t.isActive ? '' : ' inactive'}` },
    el('img', { src: qrUrl, alt: `QR for table ${t.number}`, loading: 'lazy' }),
    el('div', { class: 't', text: t.label || `Table ${t.number}` }),
    el('div', { class: 'meta', style: 'font-size:0.72rem;word-break:break-all;display:flex;gap:8px;align-items:center;justify-content:center;margin:6px 0;' },
      el('span', { text: `${t.capacity || '—'} seats` }),
      statusBadge(t)
    ),
    actions,
    warn
  );
}

async function toggleActive(t) {
  try {
    await api(`/api/tables/${t._id}`, { method: 'PATCH', body: { isActive: !t.isActive } });
    toast(t.isActive ? 'Table deactivated' : 'Table activated');
    await load();
  } catch (err) {
    toast(err.message || 'Could not update table');
  }
}

function fieldError(name, message) {
  FIELD_ERRORS.set(name, message);
}

function clearFieldError(name) {
  FIELD_ERRORS.delete(name);
}

function errorSpan(name) {
  const msg = FIELD_ERRORS.get(name);
  if (!msg) return null;
  return el('p', { class: 'field-error', text: msg });
}

async function validateForm(numberEl, labelEl, capacityEl, existingNumber) {
  FIELD_ERRORS.clear();
  let ok = true;

  const numberVal = Number(numberEl.value);
  if (!numberVal || numberVal < 1) {
    fieldError('number', 'Table number is required.');
    ok = false;
  } else if (numberVal !== existingNumber) {
    // duplicate check against server-side list
    const dup = tables.some((t) => t.number === numberVal);
    if (dup) {
      fieldError('number', `Table ${numberVal} already exists.`);
      ok = false;
    }
  }

  const capacityVal = Number(capacityEl.value);
  if (!capacityVal || capacityVal < 1 || capacityVal > 50) {
    fieldError('capacity', 'Capacity must be between 1 and 50.');
    ok = false;
  }

  return ok;
}

function tableEditor(t) {
  const existingNumber = t ? t.number : null;
  const number = el('input', { class: 'input', type: 'number', min: 1, value: t ? String(t.number) : String(tables.length + 1) });
  const label = el('input', { class: 'input', value: t ? (t.label || '') : '' });
  const capacity = el('input', { class: 'input', type: 'number', min: 1, max: 50, value: t ? String(t.capacity || 4) : '4' });
  const active = el('input', { type: 'checkbox', checked: t ? t.isActive !== false : true });

  function buildBody() {
    return el('div', { class: 'form-grid' },
      field('Number', number, { full: false }), errorSpan('number'),
      field('Label', label, { full: false }),
      field('Capacity', capacity, { full: false }), errorSpan('capacity'),
      el('label', { class: 'form-field' }, el('span', { text: 'Active' }), active)
    );
  }

  const body = buildBody();

  // Clear field errors on input (wired once).
  number.addEventListener('input', () => {
    if (FIELD_ERRORS.has('number')) { clearFieldError('number'); body.replaceWith(buildBody()); }
  });
  capacity.addEventListener('input', () => {
    if (FIELD_ERRORS.has('capacity')) { clearFieldError('capacity'); body.replaceWith(buildBody()); }
  });

  function renderFormBody() {
    body.replaceWith(buildBody());
  }

  openModal({
    title: t ? `Edit table ${t.number}` : 'New table',
    body,
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Save',
        onclick: async () => {
          const valid = await validateForm(number, label, capacity, existingNumber);
          if (!valid) { renderFormBody(); return; }

          const payload = {
            number: Number(number.value),
            label: label.value.trim(),
            capacity: Number(capacity.value) || 1,
            isActive: active.checked
          };
          try {
            if (t) await api(`/api/tables/${t._id}`, { method: 'PATCH', body: payload });
            else await api('/api/tables', { method: 'POST', body: payload });
            closeModal();
            toast('Saved');
            await load();
          } catch (err) {
            // Map server errors to fields where possible
            if (err.code === 'TABLE_EXISTS') {
              fieldError('number', `Table ${payload.number} already exists.`);
            } else if (err.code === 'TABLE_NOT_FOUND') {
              toast('Table not found.');
              closeModal();
            } else {
              toast(err.message || 'Save failed.');
            }
            renderFormBody();
          }
        }
      })
    ]
  });
}
