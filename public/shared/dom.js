/**
 * Tiny DOM helpers — no framework, keep it simple.
 */

/** querySelector with optional root */
export function $(sel, root = document) {
  return root.querySelector(sel);
}

/** querySelectorAll returning a real array */
export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

/**
 * Create an element. attrs may include class, text, html-free props and
 * dataset entries prefixed with "data-". Children appended in order;
 * strings are assigned via textContent (XSS-safe by construction).
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'value') node.value = value;
    else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'required') node[key] = !!value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Event delegation: one listener on root handles all matching descendants. */
export function delegate(root, eventType, selector, handler) {
  root.addEventListener(eventType, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

/** Escape-free template: returns a DocumentFragment rendered from a <template>. */
export function renderTemplate(id, data = {}) {
  const tpl = document.getElementById(id);
  if (!tpl) throw new Error(`template#${id} not found`);
  const fragment = tpl.content.cloneNode(true);
  for (const [key, value] of Object.entries(data)) {
    const slot = fragment.querySelector(`[data-slot="${key}"]`);
    if (slot) slot.textContent = String(value);
  }
  return fragment;
}
