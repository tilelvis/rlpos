// Central route registration. Each feature module exports a render
// function that takes (params, fullPath) and mounts itself into #app.

import { registerRoute, navigate } from './core/router.js';
import { AuthProvider } from './core/providers/auth.js';
import { store, CHANNELS } from './core/store.js';

import { renderLogin } from './features/auth/login.js';
import { renderAppShell } from './features/shell/app-shell.js';
import { renderDashboard } from './features/dashboard/dashboard.js';
import { renderNewOrder } from './features/orders/new-order.js';
import { renderOrderHistory } from './features/orders/order-history.js';
import { renderReceiptHistory } from './features/receipts/receipt-history.js';
import { renderReceiptPreview } from './features/receipts/receipt-preview.js';
import { renderReports } from './features/reports/reports.js';
import { renderMenuManagement } from './features/menu/menu-management.js';
import { renderSettings } from './features/settings/business-settings.js';
import { renderPrinterSetup } from './features/printer/zadig-setup.js';

// Each route handler accepts (params, path). The router already
// redirected to /login if no user is signed in, so feature handlers
// can assume AuthProvider.currentUser is non-null.

let _shellMounted = false;

function ensureShellThen(view) {
  // Check if the shell is actually still in the DOM — full-screen
  // pages (printer setup, receipt preview) replace #app's content, so
  // _shellMounted can be stale. Use the DOM as source of truth.
  const app = document.getElementById('app');
  const shellPresent = !!app && app.firstElementChild?.classList.contains('app-shell');

  if (!shellPresent) {
    _shellMounted = true;
    renderAppShell({ initialView: view });
  } else {
    _shellMounted = true;
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view } }));
  }
}

// When user signs out, we need to reset the shell flag.
store.subscribe(CHANNELS.auth, () => {
  if (!AuthProvider.currentUser) {
    _shellMounted = false;
  }
});

export function registerRoutes() {
  // Login — standalone (no shell).
  registerRoute('/login', () => {
    _shellMounted = false;
    renderLogin();
  });

  // Shell-wrapped views.
  registerRoute('/dashboard', () => {
    ensureShellThen('dashboard');
  });
  registerRoute('/orders/new', () => {
    ensureShellThen('new-order');
  });
  registerRoute('/orders', () => {
    ensureShellThen('orders');
  });
  registerRoute('/receipts', () => {
    ensureShellThen('receipts');
  });
  registerRoute('/reports', () => {
    ensureShellThen('reports');
  });
  registerRoute('/menu', () => {
    ensureShellThen('menu');
  });
  registerRoute('/settings', () => {
    ensureShellThen('settings');
  });
  registerRoute('/settings/printer-setup', () => {
    // Printer setup is shown full-screen (no shell tabs).
    renderPrinterSetup();
  });

  // Receipt preview — full-screen modal-style view (no shell).
  registerRoute('/receipts/([^/]+)', (params) => {
    renderReceiptPreview(params[0]);
  });

  // Default landing — redirect happens in router.
  registerRoute('/', () => {
    const user = AuthProvider.currentUser;
    if (user) {
      navigate(user.isAdmin ? '/dashboard' : '/orders/new');
    } else {
      navigate('/login');
    }
  });
}
