// Tiny DOM helpers used across all feature components.
//
// `h()` is a hyperscript-style helper that builds an element from a
// virtual-DOM-like spec. `mount()` swaps the contents of #app.
// `toast()` shows a transient snackbar. `modal()` shows a dialog.

import { icon } from './icons.js';

export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;

    if (k === 'class' || k === 'className') {
      el.className = typeof v === 'string' ? v : Array.isArray(v) ? v.filter(Boolean).join(' ') : '';
    } else if (k === 'style') {
      if (typeof v === 'string') {
        el.setAttribute('style', v);
      } else if (typeof v === 'object') {
        Object.assign(el.style, v);
      }
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') {
      el.innerHTML = v;
    } else if (k === 'text') {
      el.textContent = v;
    } else if (k in el && typeof v !== 'object') {
      try {
        el[k] = v;
      } catch {
        el.setAttribute(k, String(v));
      }
    } else {
      el.setAttribute(k, String(v));
    }
  }

  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number') {
      // If this is an icon span (class contains "material-symbols-outlined"),
      // replace the text content with an inline SVG icon of the same name.
      // This avoids depending on the Material Symbols variable font, which
      // uses COLRv1 color tables that don't render reliably in headless
      // Chromium (and some older browser versions).
      if (
        typeof c === 'string' &&
        (el.classList.contains('icon') ||
          el.classList.contains('material-symbols-outlined')) &&
        c.trim().length > 0
      ) {
        // Pick a reasonable default size from inline style or fall back to 20.
        const sizeMatch = (el.getAttribute('style') || '').match(/font-size:\s*(\d+)px/);
        const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 20;
        // Use the first whitespace-stripped token as the icon name.
        const name = c.trim().split(/\s+/)[0];
        el.appendChild(icon(name, size));
      } else {
        el.appendChild(document.createTextNode(String(c)));
      }
    } else if (c instanceof Node) {
      el.appendChild(c);
    } else if (Array.isArray(c)) {
      for (const cc of c) {
        if (cc == null || cc === false) continue;
        if (cc instanceof Node) {
          el.appendChild(cc);
        } else {
          el.appendChild(document.createTextNode(String(cc)));
        }
      }
    }
  }

  return el;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(node) {
  const app = document.getElementById('app');
  clear(app);
  app.appendChild(node);
}

// ---- Toast ----
let _toastEl = null;
let _toastTimer = null;

export function toast(message, { type = 'info', duration = 3500 } = {}) {
  if (!_toastEl) {
    _toastEl = h('div', { class: 'toast-stack' });
    document.body.appendChild(_toastEl);
  }

  const item = h(
    'div',
    { class: `toast toast--${type}` },
    [
      h('div', { class: 'toast__msg' }, [message]),
      h('button', {
        class: 'toast__close',
        'aria-label': 'Close',
        onclick: () => item.remove(),
      }, ['×']),
    ],
  );

  _toastEl.appendChild(item);

  // Animate in
  requestAnimationFrame(() => item.classList.add('toast--visible'));

  const remove = () => {
    item.classList.remove('toast--visible');
    setTimeout(() => item.remove(), 250);
  };

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(remove, duration);

  return remove;
}

// ---- Modal ----
export function showModal({ title, content, actions = [], size = 'md' }) {
  const overlay = h('div', { class: `modal modal--${size}` });
  const actionsEl = h('div', { class: 'modal__actions' }, actions.map((a) => a));
  const card = h('div', { class: 'modal__card' }, [
    h('div', { class: 'modal__head' }, [h('h2', { class: 'modal__title' }, [title])]),
    h('div', { class: 'modal__body' }, [content]),
    actionsEl,
  ]);
  overlay.appendChild(card);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (overlay.dataset.dismissable !== 'false') {
        close();
      }
    }
  });

  const close = () => overlay.remove();

  // Wrap an action button so it also closes by default.
  const action = (label, opts = {}) =>
    h(
      'button',
      {
        class: `btn ${opts.variant ? `btn--${opts.variant}` : 'btn--text'}`,
        onclick: () => {
          if (opts.onClick) opts.onClick();
          if (opts.keepOpen !== true) close();
        },
      },
      [label],
    );

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal--visible'));

  return { close, action, root: overlay };
}

// ---- Money / date formatting ----
export function formatMoney(v, { symbol = 'KES', decimals = 2 } = {}) {
  const s = Math.abs(v).toFixed(decimals);
  const parts = s.split('.');
  const intPart = parts[0];
  const frac = parts.length > 1 ? parts[1] : '';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = v < 0 ? '-' : '';
  return decimals === 0
    ? `${symbol} ${sign}${grouped}`
    : `${symbol} ${sign}${grouped}.${frac}`;
}

export function formatMoney0(v, { symbol = 'KES' } = {}) {
  const s = Math.abs(v).toFixed(0);
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol} ${(v < 0 ? '-' : '') + grouped}`;
}

export function formatDate(d, pattern = 'dd/MM hh:mm a') {
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const HH = String(dt.getHours()).padStart(2, '0');
  const MM = String(dt.getMinutes()).padStart(2, '0');
  let h = dt.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  if (pattern === 'dd/MM hh:mm a') return `${dd}/${mm} ${String(h).padStart(2, '0')}:${MM} ${ampm}`;
  if (pattern === 'dd/MM/yyyy hh:mm a') return `${dd}/${mm}/${yyyy} ${String(h).padStart(2, '0')}:${MM} ${ampm}`;
  if (pattern === 'dd/MM/yyyy') return `${dd}/${mm}/${yyyy}`;
  if (pattern === 'HH:mm') return `${HH}:${MM}`;
  return dt.toLocaleString();
}
