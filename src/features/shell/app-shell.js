// App shell — top app bar + bottom nav (port of
// lib/features/shell/app_shell.dart).
//
// Renders the chrome (header, nav) and swaps the inner content based on
// the active view. Listens to store channels so it rebuilds when
// auth / orders change.

import { h, clear, mount, toast } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { store, CHANNELS } from '../../core/store.js';
import { navigate } from '../../core/router.js';
import { PrinterService } from '../../core/services/printer_service.js';
import { renderDashboard } from '../dashboard/dashboard.js';
import { renderNewOrder } from '../orders/new-order.js';
import { renderOrderHistory } from '../orders/order-history.js';
import { renderReceiptHistory } from '../receipts/receipt-history.js';
import { renderReports } from '../reports/reports.js';
import { renderMenuManagement } from '../menu/menu-management.js';
import { renderSettings } from '../settings/business-settings.js';
import { showPrinterQuickAccessDialog } from '../printer/usb-printer-widget.js';

const VIEW_TITLES = {
  'new-order': 'New Sale',
  'dashboard': 'Dashboard',
  'receipts': 'Receipts',
  'orders': 'Order Log',
  'reports': 'Reports',
  'menu': 'Menu',
  'settings': 'Settings',
};

const NAV_ITEMS = [
  { view: 'new-order', label: 'New Sale', icon: 'point_of_sale' },
  { view: 'dashboard', label: 'Dashboard', icon: 'dashboard', requires: 'canViewFinancials' },
  { view: 'receipts', label: 'Receipts', icon: 'receipt_long', requires: 'canViewFinancials' },
  { view: 'orders', label: 'Order Log', icon: 'history' },
  { view: 'reports', label: 'Reports', icon: 'bar_chart', requires: 'canViewFinancials' },
  { view: 'menu', label: 'Menu', icon: 'restaurant', requires: 'isAdmin' },
  { view: 'settings', label: 'Settings', icon: 'settings', requires: 'isAdmin' },
];

let _state = {
  view: 'new-order',
};

const _listeners = [];

export function renderAppShell({ initialView = 'new-order' } = {}) {
  _state.view = initialView;

  const root = h('div', { class: 'app-shell' }, []);
  const appbar = h('header', { class: 'appbar' }, []);
  const content = h('main', { class: 'app-shell__content', style: { flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0' } }, []);
  const bottomnav = h('nav', { class: 'bottomnav' }, []);

  root.append(appbar, content, bottomnav);
  mount(root);

  function rerender() {
    drawAppbar(appbar);
    drawBottomNav(bottomnav);
    drawContent(content);
  }

  rerender();

  // Re-render on relevant state changes.
  _listeners.push(store.subscribe(CHANNELS.auth, rerender));
  _listeners.push(store.subscribe(CHANNELS.menu, () => {
    // Only re-render content if we're on the menu view.
    if (_state.view === 'menu' || _state.view === 'new-order') drawContent(content);
  }));
  _listeners.push(store.subscribe(CHANNELS.orders, () => {
    if (_state.view === 'orders' || _state.view === 'dashboard' || _state.view === 'reports') drawContent(content);
  }));
  _listeners.push(store.subscribe(CHANNELS.receipts, () => {
    if (_state.view === 'receipts' || _state.view === 'dashboard') drawContent(content);
  }));
  _listeners.push(store.subscribe(CHANNELS.cart, () => {
    if (_state.view === 'new-order') drawContent(content);
  }));

  // External navigation requests (e.g. from the router when navigating
  // between tabs).
  window.addEventListener('app:navigate', (e) => {
    const { view } = e.detail || {};
    if (view && view !== _state.view) {
      _state.view = view;
      rerender();
    } else if (view) {
      drawContent(content);
    }
  });

  // Try silent USB printer reconnect on first build.
  if (PrinterService.usbSupported) {
    PrinterService.tryReconnectUsb().catch(() => {});
  }
}

function drawAppbar(appbar) {
  clear(appbar);
  const user = AuthProvider.currentUser;
  if (!user) return;

  appbar.append(
    h('div', { class: 'appbar__title' }, [VIEW_TITLES[_state.view] || 'Raicilabs POS']),
    // Printer quick-access icon
    h('button', {
      class: 'btn btn--icon',
      title: 'Printer connection',
      'aria-label': 'Printer connection',
      onclick: () => showPrinterQuickAccessDialog(),
    }, [h('span', { class: 'icon material-symbols-outlined' }, ['print'])]),
    // User chip
    h('div', { class: 'appbar__user-chip' }, [
      `${user.displayName} · ${user.roleLabel}`,
    ]),
    // Sign out
    h('button', {
      class: 'btn btn--icon',
      title: 'Sign out',
      'aria-label': 'Sign out',
      onclick: () => {
        AuthProvider.signOut();
        navigate('/login');
      },
    }, [h('span', { class: 'icon material-symbols-outlined' }, ['logout'])]),
  );
}

function drawBottomNav(bottomnav) {
  clear(bottomnav);
  const user = AuthProvider.currentUser;
  if (!user) return;

  // Waiters see "My Orders" instead of "Order Log".
  const items = NAV_ITEMS.filter((item) => {
    if (!item.requires) return true;
    if (item.requires === 'isAdmin') return user.isAdmin;
    if (item.requires === 'canViewFinancials') return user.canViewFinancials;
    return true;
  }).map((item) => {
    if (item.view === 'orders' && !user.canViewFinancials) {
      return { ...item, label: 'My Orders' };
    }
    return item;
  });

  for (const item of items) {
    const btn = h('button', {
      class: `bottomnav__item ${_state.view === item.view ? 'active' : ''}`,
      onclick: () => {
        _state.view = item.view;
        // Update URL hash so refresh keeps the view.
        const path = item.view === 'new-order' ? '/orders/new'
          : item.view === 'dashboard' ? '/dashboard'
          : item.view === 'orders' ? '/orders'
          : item.view === 'receipts' ? '/receipts'
          : item.view === 'reports' ? '/reports'
          : item.view === 'menu' ? '/menu'
          : item.view === 'settings' ? '/settings'
          : '/dashboard';
        navigate(path);
        drawAppbar(document.querySelector('.appbar'));
        drawBottomNav(document.querySelector('.bottomnav'));
        drawContent(document.querySelector('.app-shell__content'));
      },
    }, [
      h('span', { class: 'icon material-symbols-outlined' }, [item.icon]),
      h('span', {}, [item.label]),
    ]);
    bottomnav.appendChild(btn);
  }
}

function drawContent(content) {
  clear(content);
  switch (_state.view) {
    case 'dashboard':
      renderDashboard(content);
      break;
    case 'new-order':
      renderNewOrder(content);
      break;
    case 'orders':
      renderOrderHistory(content);
      break;
    case 'receipts':
      renderReceiptHistory(content);
      break;
    case 'reports':
      renderReports(content);
      break;
    case 'menu':
      renderMenuManagement(content);
      break;
    case 'settings':
      renderSettings(content);
      break;
    default:
      content.appendChild(h('div', { class: 'empty-state' }, ['Unknown view']));
  }
}
