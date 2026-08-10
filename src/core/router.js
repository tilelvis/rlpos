// Hash-based router. Keeps the app static-hostable (Vercel/Netlify/Pages)
// without server-side route rewriting.
//
// GUEST MODE:
// The app boots straight to the dashboard — no login screen at startup.
// Guests can browse the dashboard, build a cart, and tap "Complete Sale".
// At that point a login modal pops up as a signature step. After
// successful print, waiters auto-logout (back to guest mode); admin/
// cashier stay logged in so they can manage unpaid orders.
//
// Routes:
//   #/dashboard
//   #/orders/new
//   #/orders
//   #/receipts/:id            (full-screen receipt preview, no shell)
//   #/reports
//   #/menu                    (admin only — redirects to dashboard otherwise)
//   #/settings                (admin only — redirects to dashboard otherwise)
//   #/settings/printer-setup  (admin only)

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
  // Strip query string for route matching, but keep it available
  // via getQuery() for handlers that need it (e.g. /orders/new?cat=xxx).
  return (h || '/').split('?')[0];
}

function getQuery() {
  const h = window.location.hash.replace(/^#/, '');
  const qIndex = h.indexOf('?');
  if (qIndex < 0) return {};
  const params = new URLSearchParams(h.slice(qIndex + 1));
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

export function currentQuery() {
  return getQuery();
}

function handleRouteChange() {
  const path = getPath();
  const user = AuthProvider.currentUser;

  // Routes gated by user role. Guests and waiters can only access
  // /dashboard, /orders/new, and /receipts/:id (the receipt preview
  // after a signature-gated sale). Anything else bounces to /dashboard.
  const financialRoutes = ['/orders', '/reports'];
  if (financialRoutes.includes(path)) {
    if (!user || !user.canViewFinancials) {
      window.location.hash = '/dashboard';
      return;
    }
  }

  // Admin-only routes — guests and non-admins bounce to dashboard.
  const adminOnly = ['/menu', '/settings', '/settings/printer-setup'];
  if (adminOnly.some((p) => path === p || path.startsWith(p + '/'))) {
    if (!user || !user.isAdmin) {
      window.location.hash = '/dashboard';
      return;
    }
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

  // No match — fall back to dashboard (works for guests and logged-in users).
  window.location.hash = '/dashboard';
}

let _booted = false;
export function bootRouter() {
  if (_booted) return;
  _booted = true;
  window.addEventListener('hashchange', handleRouteChange);
  // Fire once for the initial route.
  handleRouteChange();
}
