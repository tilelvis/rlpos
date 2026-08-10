// Hash-based router. Keeps the app static-hostable (Vercel/Netlify/Pages)
// without server-side route rewriting.
//
// Routes:
//   #/login
//   #/dashboard
//   #/orders/new
//   #/orders
//   #/receipts
//   #/receipts/:id
//   #/reports
//   #/menu
//   #/settings
//   #/settings/printer-setup    (WinUSB / Zadig walkthrough)

import { AuthProvider } from './providers/auth.js';

const ROUTES = [];

export function registerRoute(pattern, handler) {
  ROUTES.push({ pattern: new RegExp(`^${pattern}$`), handler });
}

export function navigate(path) {
  if (window.location.hash !== `#${path}`) {
    window.location.hash = path;
  } else {
    // Same hash — re-run the handler so navigation taps work.
    handleRouteChange();
  }
}

export function back() {
  window.history.back();
}

function getPath() {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

function handleRouteChange() {
  const path = getPath();
  const user = AuthProvider.currentUser;

  // Auth gate: anything except #/login requires a signed-in user.
  if (!user && path !== '/login') {
    window.location.hash = '/login';
    return;
  }
  if (user && path === '/login') {
    // Already signed in — bounce to the default landing.
    window.location.hash = user.isAdmin ? '/dashboard' : '/orders/new';
    return;
  }

  for (const r of ROUTES) {
    if (r.pattern.test(path)) {
      const params = r.pattern.exec(path).slice(1);
      try {
        r.handler(params, path);
      } catch (e) {
        console.error('[router] handler threw for', path, e);
      }
      return;
    }
  }

  // No match — fall back to home.
  if (user) {
    window.location.hash = user.isAdmin ? '/dashboard' : '/orders/new';
  } else {
    window.location.hash = '/login';
  }
}

let _booted = false;
export function bootRouter() {
  if (_booted) return;
  _booted = true;
  window.addEventListener('hashchange', handleRouteChange);
  // Fire once for the initial route.
  handleRouteChange();
}
