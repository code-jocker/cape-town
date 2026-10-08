/** Shared manager UI helpers: toast + modal. Imported by the shell and views. */
import { $, el } from '../shared/dom.js';

let toastTimer = null;
export function toast(msg, kind = '') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${kind}`.trim();
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2400);
}

/**
 * Open the shared modal.
 * @param {{title:string, body:Node|Node[], footer?:Node|Node[]|null}} opts
 */
export function openModal({ title, body, footer = null }) {
  $('#modal-title').textContent = title;
  const b = $('#modal-body');
  b.innerHTML = '';
  b.append(...(Array.isArray(body) ? body : [body]));
  const f = $('#modal-foot');
  f.innerHTML = '';
  if (footer) {
    f.hidden = false;
    f.append(...(Array.isArray(footer) ? footer : [footer]));
  } else {
    f.hidden = true;
  }
  $('#modal-backdrop').hidden = false;
  $('#modal').hidden = false;
}

export function closeModal() {
  $('#modal-backdrop').hidden = true;
  $('#modal').hidden = true;
  $('#modal-body').innerHTML = '';
  $('#modal-foot').innerHTML = '';
}

export function initModal() {
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  });
}

/** A labelled form field wrapper. */
export function field(label, input, opts = {}) {
  return el('div', { class: `form-field ${opts.full ? 'full' : ''}` }, el('label', { text: label }), input);
}

/** Colored status pill. */
export function statusBadge(status) {
  return el('span', { class: `status-badge s-${status}`, text: status });
}

/** Simple confirm using the native dialog. */
export function confirmAction(msg) {
  return window.confirm(msg);
}
