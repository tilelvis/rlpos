// App shell — top app bar + bottom nav.
//
// GUEST MODE: the app starts in guest mode (no logged-in user). The
// shell still renders — the dashboard, orders, and reports tabs are
// visible to guests. Menu and Settings are admin-only and hidden.
//
// Admin/cashier who have logged in via the "Complete Sale" signature
// flow stay signed in; they see Menu/Settings tabs and the floating
// unpaid-orders notif. Waiters are auto-logged-out after their print,
// so they revert to guest mode.
//
// Bottom nav (in order):
//   Dashboard, Orders, Reports, [Menu (admin)], [Settings (admin)]

import { h, clear, mount, toast } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { store, CHANNELS } from '../../core/store.js';
import { navigate } from '../../core/router.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { PrinterService } from '../../core/services/printer_service.js';
import { renderDashboard } from '../dashboard/dashboard.js';
import { renderNewOrder } from '../orders/new-order.js';
import { renderOrderHistory } from '../orders/order-history.js';
import { renderReports } from '../reports/reports.js';
import { renderMenuManagement } from '../menu/menu-management.js';
import { renderSettings } from '../settings/business-settings.js';
import { showPrinterQuickAccessDialog } from '../printer/usb-printer-widget.js';
import { showStaffLoginModal } from '../auth/staff-login-modal.js';
import { renderUnpaidNotif, refreshUnpaidNotif } from '../orders/unpaid-notif.js';

const VIEW_TITLES = {
  'new-order': 'New Sale',
  'dashboard': 'Dashboard',
  'orders': 'Orders',
  'reports': 'Reports',
  'menu': 'Menu',
  'settings': 'Settings',
};

// Bottom-nav items. `requires` filters who sees what:
//   - 'isAdmin'           → admin only
//   - 'canViewFinancials' → admin + cashier (not guests, not waiters)
// Guests and waiters see ONLY Dashboard + New Sale — they have nothing
// to do with order history or financial reports, so the bottom nav is
// stripped down for them.
const NAV_ITEMS = [
  { view: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { view: 'new-order', label: 'New Sale', icon: 'point_of_sale' },
  { view: 'orders', label: 'Orders', icon: 'history', requires: 'canViewFinancials' },
  { view: 'reports', label: 'Reports', icon: 'bar_chart', requires: 'canViewFinancials' },
  { view: 'menu', label: 'Menu', icon: 'restaurant', requires: 'isAdmin' },
  { view: 'settings', label: 'Settings', icon: 'settings', requires: 'isAdmin' },
];

let _state = {
  view: 'dashboard',
};

const _listeners = [];

export function renderAppShell({ initialView = 'dashboard' } = {}) {
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
    refreshUnpaidNotif();
  }

  rerender();

  _listeners.push(store.subscribe(CHANNELS.auth, () => {
    // Skip the heavy dashboard re-render if a modal is open — the
    // modal is the current focus, and re-rendering the dashboard
    // underneath it can wedge the event loop. The unpaid notif and
    // any open modal will refresh themselves independently.
    if (!document.querySelector('.modal')) rerender();
    else refreshUnpaidNotif();
  }));
  _listeners.push(store.subscribe(CHANNELS.menu, () => {
    if (document.querySelector('.modal')) return;
    if (_state.view === 'menu' || _state.view === 'new-order' || _state.view === 'dashboard') drawContent(content);
  }));
  _listeners.push(store.subscribe(CHANNELS.orders, () => {
    refreshUnpaidNotif();
    if (document.querySelector('.modal')) return;
    if (_state.view === 'orders' || _state.view === 'dashboard' || _state.view === 'reports') drawContent(content);
  }));
  _listeners.push(store.subscribe(CHANNELS.receipts, () => {
    if (document.querySelector('.modal')) return;
    if (_state.view === 'reports') drawContent(content);
  }));
  _listeners.push(store.subscribe(CHANNELS.cart, () => {
    if (document.querySelector('.modal')) return;
    if (_state.view === 'new-order') drawContent(content);
  }));

  window.addEventListener('app:navigate', (e) => {
    const { view } = e.detail || {};
    if (view && view !== _state.view) {
      _state.view = view;
      rerender();
    } else if (view) {
      drawContent(content);
    }
  });

  // Render the floating unpaid-orders notif (only shows for admin/cashier
  // when there are unpaid orders).
  renderUnpaidNotif();

  // Try silent USB printer reconnect on first build.
  if (PrinterService.usbSupported) {
    import('../../core/services/printer_service.js').then(({ PrinterService }) => {
      PrinterService.tryReconnectUsb().catch(() => {});
    });
  }
}

function drawAppbar(appbar) {
  clear(appbar);
  const user = AuthProvider.currentUser;
  appbar.append(
    h('div', { class: 'appbar__title' }, [VIEW_TITLES[_state.view] || 'Raicilabs POS']),
  );

  // Printer quick-access icon — visible to anyone (guests included),
  // since a guest might need to pair a printer before their sale.
  appbar.append(
    h('button', {
      class: 'btn btn--icon',
      title: 'Printer connection',
      'aria-label': 'Printer connection',
      onclick: () => showPrinterQuickAccessDialog(),
    }, [h('span', { class: 'icon material-symbols-outlined' }, ['print'])]),
  );

  if (user) {
    // Logged-in: show user chip + sign-out.
    appbar.append(
      h('div', { class: 'appbar__user-chip' }, [
        `${user.displayName} · ${user.roleLabel}`,
      ]),
      h('button', {
        class: 'btn btn--icon',
        title: 'Sign out',
        'aria-label': 'Sign out',
        onclick: () => {
          AuthProvider.signOut();
          toast('Signed out.', { type: 'info' });
          navigate('/dashboard');
        },
      }, [h('span', { class: 'icon material-symbols-outlined' }, ['logout'])]),
    );
  } else {
    // Guest: show dedicated "Staff Sign In" button (admins/cashiers
    // only — the modal filters the dropdown to admin+cashier users,
    // waiters and other roles can't sign in via this path) AND a
    // "Guest" chip. The button sits to the LEFT of the chip so it's
    // prominent and easy to tap when staff walk up to the terminal.
    appbar.append(
      h('button', {
        class: 'btn btn--outlined appbar__staff-signin',
        title: 'Admin / cashier sign in',
        onclick: () => showStaffLoginModal(),
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '16px' } }, ['lock']),
        'Sign In',
      ]),
      h('div', { class: 'appbar__user-chip' }, ['Guest']),
    );
  }
}

function drawBottomNav(bottomnav) {
  clear(bottomnav);
  const user = AuthProvider.currentUser;

  // Filter nav items by role. Guests and waiters see ONLY Dashboard +
  // New Sale (they have nothing to do with order history or reports).
  // Admin/cashier additionally see Orders + Reports. Admin only
  // additionally sees Menu + Settings.
  const items = NAV_ITEMS.filter((item) => {
    if (!item.requires) return true;
    if (item.requires === 'isAdmin') return user?.isAdmin ?? false;
    if (item.requires === 'canViewFinancials') return user?.canViewFinancials ?? false;
    return true;
  });

  for (const item of items) {
    const btn = h('button', {
      class: `bottomnav__item ${_state.view === item.view ? 'active' : ''}`,
      onclick: () => {
        const path = item.view === 'dashboard' ? '/dashboard'
          : item.view === 'new-order' ? '/orders/new'
          : item.view === 'orders' ? '/orders'
          : item.view === 'reports' ? '/reports'
          : item.view === 'menu' ? '/menu'
          : item.view === 'settings' ? '/settings'
          : '/dashboard';
        // Don't set _state.view or draw here. navigate() runs the
        // router's permission guard first; only once that guard
        // passes does ensureShellThen() dispatch 'app:navigate',
        // which is what actually flips _state.view and repaints.
        // Painting the target view here, before the guard runs,
        // is what caused a visible flash of the target page followed
        // by a bounce back to Dashboard whenever the guard rejected
        // the route.
        navigate(path);
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
