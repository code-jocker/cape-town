import { el } from '../../shared/dom.js';
import { api } from '../../shared/api.js';
import { field, toast } from '../ui.js';

export const title = 'Settings';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function render(root) {
  let s;
  try {
    s = await api('/api/settings');
  } catch (err) {
    root.append(el('div', { class: 'panel text-danger', text: err.message }));
    return;
  }

  const f = {
    name: el('input', { class: 'input', value: s.name || '' }),
    tagline: el('input', { class: 'input', value: s.tagline || '' }),
    location: el('input', { class: 'input', value: s.location || '' }),
    currency: el('input', { class: 'input', value: s.currency || 'RWF' }),
    taxRate: el('input', { class: 'input', type: 'number', min: 0, max: 100, step: '0.1', value: (s.taxRate != null ? s.taxRate : 0 )}),
    serviceCharge: el('input', { class: 'input', type: 'number', min: 0, max: 100, step: '0.1', value: (s.serviceCharge != null ? s.serviceCharge : 0 )}),
    announcement: el('textarea', { class: 'input', rows: 2, maxlength: 200 }, s.announcement || ''),
    warnMin: el('input', { class: 'input', type: 'number', min: 1, max: 120, value: (s.lateThresholds && s.lateThresholds.warnMin != null ? s.lateThresholds.warnMin : 10 )}),
    lateMin: el('input', { class: 'input', type: 'number', min: 2, max: 240, value: (s.lateThresholds && s.lateThresholds.lateMin != null ? s.lateThresholds.lateMin : 20 )}),
    autoCloseHours: el('input', { class: 'input', type: 'number', min: 1, max: 48, value: (s.autoCloseHours != null ? s.autoCloseHours : 3 )})
  };

  const langs = {};
  for (const code of ['en', 'fr', 'rw']) {
    langs[code] = el('input', { type: 'checkbox', checked: (s.languages || ['en']).includes(code) });
  }

  // opening hours
  const hours = (s.openingHours && s.openingHours.length === 7 ? s.openingHours : DAY_LABELS.map((label, day) => ({ day, label, open: '10:00', close: '23:00', closed: false }))).map((h) => ({
    open: el('input', { class: 'input', type: 'time', value: h.open || '10:00' }),
    close: el('input', { class: 'input', type: 'time', value: h.close || '23:00' }),
    closed: el('input', { type: 'checkbox', checked: !!h.closed })
  }));

  const hoursTable = el('table', { class: 'data-table' });
  hoursTable.append(el('thead', {}, el('tr', {}, ['Day', 'Open', 'Close', 'Closed'].map((h) => el('th', { text: h })))));
  const htb = el('tbody');
  DAY_LABELS.forEach((label, i) => {
    htb.append(el('tr', {}, el('td', { text: label }), el('td', {}, hours[i].open), el('td', {}, hours[i].close), el('td', {}, hours[i].closed)));
  });
  hoursTable.append(htb);

  root.append(
    el(
      'div',
      { class: 'panel' },
      el('h3', { text: 'Restaurant' }),
      el(
        'div',
        { class: 'form-grid' },
        field('Name', f.name),
        field('Tagline', f.tagline),
        field('Location', f.location),
        field('Currency', f.currency),
        field('Tax rate %', f.taxRate),
        field('Service charge %', f.serviceCharge),
        field('Announcement', f.announcement, { full: true }),
        el('div', { class: 'form-field full' }, el('label', { text: 'Languages' }), el('div', { style: 'display:flex;gap:16px' }, el('label', {}, langs.en, ' EN'), el('label', {}, langs.fr, ' FR'), el('label', {}, langs.rw, ' RW')))
      )
    ),
    el(
      'div',
      { class: 'panel' },
      el('h3', { text: 'Operations' }),
      el('div', { class: 'form-grid' }, field('Warn after (min)', f.warnMin), field('Late after (min)', f.lateMin), field('Auto-close idle sessions (hours)', f.autoCloseHours))
    ),
    el('div', { class: 'panel' }, el('h3', { text: 'Opening hours' }), hoursTable),
    el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary', id: 'save', text: 'Save settings' }))
  );

  root.querySelector('#save').addEventListener('click', async () => {
    const payload = {
      name: f.name.value.trim(),
      tagline: f.tagline.value.trim(),
      location: f.location.value.trim(),
      currency: f.currency.value.trim() || 'RWF',
      taxRate: Number(f.taxRate.value) || 0,
      serviceCharge: Number(f.serviceCharge.value) || 0,
      announcement: f.announcement.value.trim(),
      languages: ['en', 'fr', 'rw'].filter((c) => langs[c].checked),
      lateThresholds: { warnMin: Number(f.warnMin.value) || 10, lateMin: Number(f.lateMin.value) || 20 },
      autoCloseHours: Number(f.autoCloseHours.value) || 3,
      openingHours: DAY_LABELS.map((label, day) => ({ day, label, open: hours[day].open.value || '10:00', close: hours[day].close.value || '23:00', closed: hours[day].closed.checked }))
    };
    if (!payload.languages.length) return toast('Select at least one language');
    try {
      await api('/api/settings', { method: 'PUT', body: payload });
      toast('Settings saved');
    } catch (err) {
      toast(err.message);
    }
  });
}
