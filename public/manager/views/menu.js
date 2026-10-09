import { $, el, delegate } from '../../shared/dom.js';
import { api, imgUrl } from '../../shared/api.js';
import { money } from '../../shared/format.js';
import { openModal, closeModal, field, toast, confirmAction } from '../ui.js';

export const title = 'Menu';

let categories = [];
let items = [];
let currency = 'RWF';

export async function render(root) {
  try {
    const s = await api('/api/settings');
    currency = s.currency || 'RWF';
  } catch (e) {}
  await reload();

  const toolbar = el(
    'div',
    { class: 'toolbar' },
    el('button', { class: 'btn btn-primary btn-sm', id: 'new-item', text: '+ New item' }),
    el('button', { class: 'btn btn-ghost btn-sm', id: 'new-cat', text: '+ New category' })
  );
  const catPanel = el('div', { class: 'panel' }, el('h3', { text: 'Categories' }));
  const catList = el('div', { id: 'cat-list' });
  catPanel.append(catList);
  const itemPanel = el('div', { class: 'panel' }, el('h3', { text: 'Items' }));
  const itemList = el('div', { id: 'item-list' });
  itemPanel.append(itemList);
  root.append(toolbar, catPanel, itemPanel);

  $('#new-item', root).addEventListener('click', () => itemEditor(null));
  $('#new-cat', root).addEventListener('click', () => categoryEditor(null));

  drawCats(catList);
  drawItems(itemList);

  delegate(itemList, 'click', '[data-edit-item]', (e, b) => itemEditor(items.find((i) => String(i._id) === b.dataset.editItem)));
  delegate(itemList, 'click', '[data-del-item]', async (e, b) => {
    if (!confirmAction('Delete this item?')) return;
    try {
      await api(`/api/menu/items/${b.dataset.delItem}`, { method: 'DELETE' });
      toast('Item deleted');
      await reload();
      drawItems(itemList);
    } catch (err) {
      toast(err.message);
    }
  });
  delegate(itemList, 'click', '[data-avail]', async (e, b) => {
    const id = b.dataset.avail;
    const item = items.find((i) => String(i._id) === id);
    try {
      await api(`/api/menu/items/${id}/availability`, { method: 'PATCH', body: { isAvailable: !item.isAvailable } });
      item.isAvailable = !item.isAvailable;
      drawItems(itemList);
    } catch (err) {
      toast(err.message);
    }
  });
}

async function reload() {
  const [c, i] = await Promise.all([api('/api/menu/categories'), api('/api/menu/items')]);
  categories = c;
  items = i;
}

function drawCats(list) {
  list.innerHTML = '';
  if (!categories.length) list.append(el('div', { class: 'muted', text: 'No categories.' }));
  for (const c of categories) {
    const count = items.filter((i) => String(i.category) === String(c._id)).length;
    list.append(
      el(
        'div',
        { class: 'stock-row', style: 'margin-bottom:6px' },
        el('div', {}, el('div', { class: 'name', text: (c.name && c.name.en) || '' }), el('div', { class: 'st', text: `${count} items · ${c.isActive ? 'active' : 'hidden'}` })),
        el(
          'div',
          { style: 'display:flex;gap:6px' },
          el('button', { class: 'btn btn-ghost btn-sm', 'data-cat-edit': String(c._id), text: 'Edit' }),
          el('button', {
            class: 'btn btn-ghost btn-sm',
            'data-cat-del': String(c._id),
            text: 'Delete',
            onclick: async () => {
              if (!confirmAction('Delete this category? Items must be moved first.')) return;
              try {
                await api(`/api/menu/categories/${c._id}`, { method: 'DELETE' });
                toast('Category deleted');
                await reload();
                drawCats(list);
              } catch (err) {
                toast(err.message);
              }
            }
          })
        )
      )
    );
  }
  delegate(list, 'click', '[data-cat-edit]', (e, b) => categoryEditor(categories.find((c) => String(c._id) === b.dataset.catEdit)));
}

function drawItems(list) {
  list.innerHTML = '';
  if (!items.length) {
    list.append(el('div', { class: 'muted', text: 'No items.' }));
    return;
  }
  const tbl = el('table', { class: 'data-table' });
  tbl.append(el('thead', {}, el('tr', {}, ['', 'Name', 'Category', 'Price', 'Station', 'Available', ''].map((h) => el('th', { text: h })))));
  const tb = el('tbody');
    const catName = (id) => {
      const cat = categories.find((c) => String(c._id) === String(id));
      return (cat && cat.name && cat.name.en) || '—';
    };
  for (const i of items) {
    tb.append(
      el(
        'tr',
        {},
        el('td', {}, (i.image && i.image.thumbUrl) ? el('img', { class: 'thumb', src: imgUrl(i.image.thumbUrl), alt: '' }) : el('div', { class: 'thumb' })),
        el('td', { text: (i.name && i.name.en) || '' }),
        el('td', { text: catName(i.category) }),
        el('td', { text: money(i.price, currency) }),
        el('td', { text: i.station }),
        el('td', {}, el('button', { class: `switch ${i.isAvailable ? 'on' : 'off'}`, 'data-avail': String(i._id), text: i.isAvailable ? 'Yes' : 'No' })),
        el(
          'td',
          { style: 'white-space:nowrap' },
          el('button', { class: 'btn btn-ghost btn-sm', 'data-edit-item': String(i._id), text: 'Edit' }),
          el('button', { class: 'btn btn-ghost btn-sm text-danger', 'data-del-item': String(i._id), text: 'Del' })
        )
      )
    );
  }
  tbl.append(tb);
  list.append(tbl);
}

/* ---------------- category editor ---------------- */
function categoryEditor(cat) {
  const en = el('input', { class: 'input', value: (cat && cat.name && cat.name.en) || '' });
  const fr = el('input', { class: 'input', value: (cat && cat.name && cat.name.fr) || '' });
  const rw = el('input', { class: 'input', value: (cat && cat.name && cat.name.rw) || '' });
  const sort = el('input', { class: 'input', type: 'number', value: (cat && cat.sortOrder != null ? cat.sortOrder : categories.length )});
  const active = el('input', { type: 'checkbox', checked: cat ? cat.isActive !== false : true });
  const body = el(
    'div',
    { class: 'form-grid' },
    field('Name (EN)', en),
    field('Name (FR)', fr),
    field('Name (RW)', rw),
    field('Sort order', sort),
    el('label', { class: 'form-field' }, el('span', { text: 'Active' }), active)
  );
  openModal({
    title: cat ? 'Edit category' : 'New category',
    body,
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Save',
        onclick: async () => {
          if (!en.value.trim()) return toast('Name (EN) is required');
          const payload = { name: { en: en.value.trim(), fr: fr.value.trim(), rw: rw.value.trim() }, sortOrder: Number(sort.value) || 0, isActive: active.checked };
          try {
            if (cat) await api(`/api/menu/categories/${cat._id}`, { method: 'PATCH', body: payload });
            else await api('/api/menu/categories', { method: 'POST', body: payload });
            closeModal();
            toast('Saved');
            await reload();
            drawCats(document.querySelector('#cat-list'));
            drawItems(document.querySelector('#item-list'));
          } catch (err) {
            toast(err.message);
          }
        }
      })
    ]
  });
}

/* ---------------- item editor ---------------- */
function itemEditor(item) {
  const f = {
    en: el('input', { class: 'input', value: (item && item.name && item.name.en) || '' }),
    fr: el('input', { class: 'input', value: (item && item.name && item.name.fr) || '' }),
    rw: el('input', { class: 'input', value: (item && item.name && item.name.rw) || '' }),
    descEn: el('textarea', { class: 'input', rows: 2 }, (item && item.description && item.description.en) || ''),
    descFr: el('textarea', { class: 'input', rows: 2 }, (item && item.description && item.description.fr) || ''),
    descRw: el('textarea', { class: 'input', rows: 2 }, (item && item.description && item.description.rw) || ''),
    price: el('input', { class: 'input', type: 'number', min: 0, value: (item && item.price != null ? item.price : 0 )}),
    category: el('select', { class: 'input' }),
    station: el('select', { class: 'input' }),
    prep: el('input', { class: 'input', type: 'number', min: 0, max: 180, value: (item && item.prepTimeMinutes != null ? item.prepTimeMinutes : 10 )}),
    from: el('input', { class: 'input', type: 'time', value: (item && item.availableFrom) || '' }),
    to: el('input', { class: 'input', type: 'time', value: (item && item.availableTo) || '' }),
    available: el('input', { type: 'checkbox', checked: item ? item.isAvailable !== false : true }),
    trackStock: el('input', { type: 'checkbox', checked: (item && item.trackStock) || false }),
    stockQty: el('input', { class: 'input', type: 'number', min: 0, value: (item && item.stockQty != null ? item.stockQty : 0 )}),
    lowStock: el('input', { class: 'input', type: 'number', min: 0, value: (item && item.lowStockThreshold != null ? item.lowStockThreshold : 3 )}),
    tags: el('input', { class: 'input', value: ((item && item.tags) || []).join(', '), placeholder: 'vegetarian, spicy, popular, new' })
  };
  for (const c of categories) f.category.append(el('option', { value: String(c._id), text: (c.name && c.name.en) || '', selected: item && String(item.category) === String(c._id) }));
  for (const s of ['kitchen', 'bar', 'dessert']) f.station.append(el('option', { value: s, text: s, selected: ((item && item.station) || 'kitchen') === s }));

  // image
  let image = (item && item.image) ? { ...item.image } : { url: '', thumbUrl: '' };
  const preview = image.thumbUrl ? el('img', { class: 'thumb', src: imgUrl(image.thumbUrl), style: 'width:80px;height:80px', alt: '' }) : el('div', { class: 'thumb', style: 'width:80px;height:80px' });
  const file = el('input', { type: 'file', accept: 'image/*' });
  file.addEventListener('change', async () => {
    if (!file.files[0]) return;
    const fd = new FormData();
    fd.append('image', file.files[0]);
    try {
      const res = await fetch('/api/upload/image', { method: 'POST', body: fd, credentials: 'include' });
      const json = await res.json();
      if (!json.ok) throw new Error((json.error && json.error.message) || 'Upload failed');
      image = json.data;
      preview.src = imgUrl(image.thumbUrl);
      toast('Image uploaded');
    } catch (err) {
      toast(err.message);
    }
  });

  // options editor
  let options = ((item && item.options) || []).map((o) => ({ ...o, choices: o.choices.map((c) => ({ ...c })) }));
  const optWrap = el('div', { class: 'full' });
  function drawOptions() {
    optWrap.innerHTML = '';
    optWrap.append(el('label', { text: 'Option groups' }));
    options.forEach((opt, oi) => {
      const choicesWrap = el('div');
      opt.choices.forEach((ch, ci) => {
        const lbl = el('input', { class: 'input', value: ch.label, placeholder: 'Choice', style: 'flex:1' });
        const price = el('input', { class: 'input', type: 'number', value: (ch.extraPrice != null ? ch.extraPrice : 0), style: 'width:90px' });
        lbl.addEventListener('input', () => (ch.label = lbl.value));
        price.addEventListener('input', () => (ch.extraPrice = Number(price.value)));
        choicesWrap.append(
          el('div', { style: 'display:flex;gap:6px;margin-bottom:4px' }, lbl, price, el('button', { class: 'btn btn-ghost btn-sm', text: '✕', onclick: () => (opt.choices.splice(ci, 1), drawOptions()) }))
        );
      });
      const nameI = el('input', { class: 'input', value: opt.name, placeholder: 'Group name (e.g. Size)' });
      nameI.addEventListener('input', () => (opt.name = nameI.value));
      const reqC = el('input', { type: 'checkbox', checked: opt.required });
      reqC.addEventListener('change', () => (opt.required = reqC.checked));
      const mulC = el('input', { type: 'checkbox', checked: opt.multiple });
      mulC.addEventListener('change', () => (opt.multiple = mulC.checked));
      optWrap.append(
        el(
          'div',
          { class: 'panel', style: 'padding:10px;margin-bottom:8px' },
          el('div', { style: 'display:flex;gap:6px;margin-bottom:6px' }, nameI, el('label', { style: 'font-size:0.75rem' }, reqC, 'Required'), el('label', { style: 'font-size:0.75rem' }, mulC, 'Multiple'), el('button', { class: 'btn btn-ghost btn-sm', text: 'Remove', onclick: () => (options.splice(oi, 1), drawOptions()) })),
          choicesWrap,
          el('button', { class: 'btn btn-ghost btn-sm', text: '+ Add choice', onclick: () => (opt.choices.push({ label: '', extraPrice: 0 }), drawOptions()) })
        )
      );
    });
    optWrap.append(el('button', { class: 'btn btn-ghost btn-sm', text: '+ Add option group', onclick: () => (options.push({ name: '', required: false, multiple: false, choices: [] }), drawOptions()) }));
  }
  drawOptions();

  const body = el(
    'div',
    { class: 'form-grid' },
    field('Name (EN)', f.en),
    field('Name (FR)', f.fr),
    field('Name (RW)', f.rw),
    field('Description (EN)', f.descEn, { full: true }),
    field('Description (FR)', f.descFr),
    field('Description (RW)', f.descRw),
    field('Price', f.price),
    field('Category', f.category),
    field('Station', f.station),
    field('Prep minutes', f.prep),
    field('Available from', f.from),
    field('Available to', f.to),
    field('Tags (comma sep)', f.tags, { full: true }),
    el('div', { class: 'full', style: 'display:flex;gap:16px;align-items:center' }, preview, file),
    el('label', { class: 'form-field' }, el('span', { text: 'Is available' }), f.available),
    el('label', { class: 'form-field' }, el('span', { text: 'Track stock' }), f.trackStock),
    field('Stock qty', f.stockQty),
    field('Low-stock threshold', f.lowStock),
    optWrap
  );

  openModal({
    title: item ? 'Edit item' : 'New item',
    body,
    footer: [
      el('button', { class: 'btn btn-ghost', onclick: closeModal, text: 'Cancel' }),
      el('button', {
        class: 'btn btn-primary',
        text: 'Save',
        onclick: async () => {
          if (!f.en.value.trim()) return toast('Name (EN) is required');
          if (!f.category.value) return toast('Pick a category');
          const payload = {
            name: { en: f.en.value.trim(), fr: f.fr.value.trim(), rw: f.rw.value.trim() },
            description: { en: f.descEn.value.trim(), fr: f.descFr.value.trim(), rw: f.descRw.value.trim() },
            price: Number(f.price.value) || 0,
            category: f.category.value,
            station: f.station.value,
            prepTimeMinutes: Number(f.prep.value) || 0,
            availableFrom: f.from.value || '',
            availableTo: f.to.value || '',
            isAvailable: f.available.checked,
            trackStock: f.trackStock.checked,
            stockQty: Number(f.stockQty.value) || 0,
            lowStockThreshold: Number(f.lowStock.value) || 0,
            tags: f.tags.value.split(',').map((t) => t.trim()).filter((t) => ['vegetarian', 'spicy', 'popular', 'new'].includes(t)),
            image,
            options: options.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), required: !!o.required, multiple: !!o.multiple, choices: o.choices.filter((c) => c.label.trim()).map((c) => ({ label: c.label.trim(), extraPrice: Number(c.extraPrice) || 0 })) }))
          };
          try {
            if (item) await api(`/api/menu/items/${item._id}`, { method: 'PATCH', body: payload });
            else await api('/api/menu/items', { method: 'POST', body: payload });
            closeModal();
            toast('Saved');
            await reload();
            drawItems(document.querySelector('#item-list'));
            drawCats(document.querySelector('#cat-list'));
          } catch (err) {
            toast(err.message);
          }
        }
      })
    ]
  });
}
