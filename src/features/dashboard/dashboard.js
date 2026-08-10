// Dashboard — 3×n grid of category cards.
//
// Each card shows the category name, item count, and (if any item in
// the category has a photo) a thumbnail. Tapping a card navigates to
// the New Order page pre-filtered to that category via URL hash:
//   #/orders/new?cat=<id>
//
// Above the grid is a slim summary bar showing today's KPIs (sales,
// order count) so admin/cashier still get the at-a-glance numbers.
// Guests see the same bar but with zero values (no financial data
// is exposed since guests can't view financials).

import { h, clear, formatMoney, formatMoney0, formatDate } from '../../core/ui.js';
import { MenuProvider } from '../../core/providers/menu.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { store, CHANNELS } from '../../core/store.js';
import { navigate } from '../../core/router.js';

export function renderDashboard(content) {
  clear(content);

  const user = AuthProvider.currentUser;
  const canSeeFinancials = !!user && user.canViewFinancials;

  const completed = OrdersProvider.completedOrders;
  const now = new Date();
  const todayCompleted = completed.filter((o) => {
    if (!o.completedAt) return false;
    const c = new Date(o.completedAt);
    return c.getFullYear() === now.getFullYear() &&
           c.getMonth() === now.getMonth() &&
           c.getDate() === now.getDate();
  });

  const salesToday = todayCompleted.reduce((s, o) => s + o.total, 0);
  const ordersToday = todayCompleted.length;

  const root = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' } }, []);

  // --- Summary bar ---
  const summary = h('div', { class: 'dashboard-summary' }, []);
  summary.append(
    summaryStat('CATEGORIES', String(MenuProvider.categories.length)),
    h('div', { class: 'dashboard-summary__divider' }, []),
    summaryStat('MENU ITEMS', String(MenuProvider.items.length)),
    h('div', { class: 'dashboard-summary__divider' }, []),
    summaryStat('ORDERS TODAY', String(ordersToday)),
  );
  if (canSeeFinancials) {
    summary.append(
      h('div', { class: 'dashboard-summary__divider' }, []),
      summaryStat('SALES TODAY', formatMoney0(salesToday)),
    );
  }
  root.append(summary);

  // --- Category grid header ---
  root.append(
    h('div', { style: { padding: '16px 16px 0', maxWidth: '1100px', margin: '0 auto', width: '100%' } }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Categories']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', margin: '0' } }, [
        'Tap a category to start a new sale with that category pre-selected.',
      ]),
    ]),
  );

  // --- Category grid (3 × n) ---
  const grid = h('div', { class: 'category-grid' }, []);
  const cats = MenuProvider.categories;

  if (cats.length === 0) {
    grid.append(
      h('div', { class: 'empty-state', style: { gridColumn: '1 / -1' } }, [
        'No categories yet.',
        h('br'),
        canSeeFinancials && user?.isAdmin
          ? 'Go to Menu → Categories to create your first category.'
          : 'Ask an admin to set up the menu.',
      ]),
    );
  } else {
    for (const c of cats) {
      const items = MenuProvider.items.filter((m) => m.categoryId === c.id);
      const availableCount = items.filter((m) => m.available).length;
      const firstPhoto = items.find((m) => m.hasPhoto)?.photoBase64;

      const card = h('div', {
        class: 'category-card',
        onclick: () => navigate(`/orders/new?cat=${c.id}`),
      }, []);

      const photo = h('div', { class: 'category-card__photo' }, []);
      if (firstPhoto) {
        clear(photo);
        photo.appendChild(h('img', { src: firstPhoto, alt: c.name }));
      } else {
        // Show first letter as a placeholder, styled with the category colour.
        const hex = '#' + (c.colorValue & 0xffffff).toString(16).padStart(6, '0');
        photo.style.background = `${hex}1f`;
        photo.style.color = hex;
        photo.textContent = (c.name.charAt(0) || '?').toUpperCase();
      }

      card.append(
        photo,
        h('div', { class: 'category-card__body' }, [
          h('div', { class: 'category-card__name' }, [c.name]),
          h('div', { class: 'category-card__meta' }, [
            h('span', {}, [`${availableCount} available`]),
            '·',
            h('span', {}, [`${items.length} total`]),
          ]),
        ]),
      );
      grid.appendChild(card);
    }
  }
  root.append(grid);

  // --- Recent orders (compact, for admin/cashier only) ---
  if (canSeeFinancials) {
    const recentSection = h('div', { style: { padding: '16px', maxWidth: '1100px', margin: '0 auto', width: '100%' } }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 8px' } }, ['Recent Orders']),
    ]);

    if (completed.length === 0) {
      recentSection.append(
        h('div', { class: 'card' }, [
          h('div', { class: 'list-item' }, [
            h('div', { class: 'list-item__avatar' }, [
              h('span', { class: 'icon material-symbols-outlined' }, ['info']),
            ]),
            h('div', { class: 'list-item__main' }, [
              h('div', { class: 'list-item__title' }, ['No sales yet']),
              h('div', { class: 'list-item__subtitle' }, ['Tap a category above to ring up your first order.']),
            ]),
          ]),
        ]),
      );
    } else {
      const card = h('div', { class: 'card', style: { padding: '0' } }, []);
      for (const o of completed.slice(0, 5)) {
        const receipt = ReceiptsProvider.findByOrderId(o.id);
        card.append(
          h('div', {
            class: 'list-item',
            onclick: () => receipt && navigate(`/receipts/${receipt.id}`),
          }, [
            h('div', { class: 'list-item__avatar' }, [
              h('span', { class: 'icon material-symbols-outlined' }, ['receipt']),
            ]),
            h('div', { class: 'list-item__main' }, [
              h('div', { class: 'list-item__title' }, [
                h('strong', {}, [o.orderNumber]),
                h('span', {
                  class: `tag ${o.paid ? 'tag--paid' : 'tag--unpaid'}`,
                  style: { marginLeft: '8px' },
                }, [o.paid ? 'Paid' : 'Unpaid']),
              ]),
              h('div', { class: 'list-item__subtitle' }, [
                `${formatDate(o.completedAt)} · ${o.cashierName} · ${o.itemCount} items`,
              ]),
            ]),
            h('div', { class: 'list-item__trailing' }, [formatMoney(o.total)]),
          ]),
        );
      }
      recentSection.append(card);
    }

    root.append(recentSection);
  }

  content.append(root);

  // Re-render when menu or orders change.
  const unsubMenu = store.subscribe(CHANNELS.menu, () => renderDashboard(content));
  const unsubOrders = store.subscribe(CHANNELS.orders, () => renderDashboard(content));
  const unsubAuth = store.subscribe(CHANNELS.auth, () => renderDashboard(content));
  const obs = new MutationObserver(() => {
    if (!content.contains(root)) {
      unsubMenu();
      unsubOrders();
      unsubAuth();
      obs.disconnect();
    }
  });
  obs.observe(content, { childList: true });
}

function summaryStat(label, value) {
  return h('div', { class: 'dashboard-summary__stat' }, [
    h('div', { class: 'dashboard-summary__stat-label' }, [label]),
    h('div', { class: 'dashboard-summary__stat-value' }, [value]),
  ]);
}
