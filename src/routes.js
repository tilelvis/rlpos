// Central route registration. Each feature module exports a render
// function that takes (params, fullPath) and mounts itself into #app.

import { registerRoute, navigate } from './core/router.js';
import { AuthProvider } from './core/providers/auth.js';
import { store, CHANNELS } from './core/store.js';

import { renderAppShell } from './features/shell/app-shell.js';
import { renderDashboard } from './features/dashboard/dashboard.js';
import { renderNewOrder } from './features/orders/new-order.js';
import { renderOrderHistory } from './features/orders/order-history.js';
import { renderReceiptPreview } from './features/receipts/receipt-preview.js';
import { renderReports } from './features/reports/reports.js';
import { renderMenuManagement } from './features/menu/menu-management.js';
import { renderSettings } from './features/settings/business-settings.js';
import { renderPrinterSetup } from './features/printer/zadig-setup.js';

// Each route handler accepts (params, path). The router already
// redirected to /dashboard if a guest tries an admin-only route.

function ensureShellThen(view) {
  const app = document.getElementById('app');
  const shellPresent = !!app && app.firstElementChild?.classList.contains('app-shell');

  if (!shellPresent) {
    renderAppShell({ initialView: view });
  } else {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view } }));
  }
}

// When user signs out, force a shell remount on next navigate.
store.subscribe(CHANNELS.auth, () => {
  // No-op here — the shell listens to auth changes itself.
});

export function registerRoutes() {
  // Shell-wrapped views (all accessible in guest mode except admin-only).
  registerRoute('/dashboard', () => {
    ensureShellThen('dashboard');
  });
  registerRoute('/orders/new', () => {
    ensureShellThen('new-order');
  });
  registerRoute('/orders', () => {
    ensureShellThen('orders');
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

  // Default landing — always dashboard, regardless of role.
  registerRoute('/', () => {
    navigate('/dashboard');
  });
}
