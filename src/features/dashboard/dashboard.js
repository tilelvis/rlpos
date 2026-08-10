// Dashboard (port of lib/features/dashboard/dashboard_page.dart).

import { h, clear, formatMoney, formatDate } from '../../core/ui.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { navigate } from '../../core/router.js';

export function renderDashboard(content) {
  clear(content);

  const completed = OrdersProvider.completedOrders;
  const now = new Date();
  const today = completed.filter((o) => {
    if (!o.completedAt) return false;
    const c = new Date(o.completedAt);
    return c.getFullYear() === now.getFullYear() &&
           c.getMonth() === now.getMonth() &&
           c.getDate() === now.getDate();
  });

  const salesToday = today.reduce((s, o) => s + o.total, 0);
  const itemsToday = today.reduce((s, o) => s + o.itemCount, 0);
  const avgSale = today.length === 0 ? 0 : salesToday / today.length;

  const root = h('div', { style: { padding: '16px', maxWidth: '900px', margin: '0 auto' } }, []);

  // KPI row 1
  root.append(
    h('div', { class: 'kpi-grid' }, [
      kpiCard('SALES TODAY', formatMoney(salesToday), 'payments', 'var(--primary)'),
      kpiCard('ORDERS TODAY', String(today.length), 'receipt_long', 'var(--accent)'),
    ]),
    h('div', { style: { height: '12px' } }, []),
    h('div', { class: 'kpi-grid' }, [
      kpiCard('ITEMS SOLD', String(itemsToday), 'inventory_2', 'var(--success)'),
      kpiCard('AVG SALE', formatMoney(avgSale), 'trending_up', 'var(--warning)'),
    ]),
  );

  // Recent orders section
  const section = h('div', { style: { marginTop: '24px' } }, []);
  section.append(
    h('div', { class: 'row' }, [
      h('h2', { class: 'section-title', style: { margin: '0' } }, ['Recent Orders']),
      h('div', { class: 'spacer' }, []),
      h('button', {
        class: 'btn btn--text',
        onclick: () => navigate('/receipts'),
      }, ['View all receipts']),
    ]),
  );

  if (completed.length === 0) {
    section.append(
      h('div', { class: 'card', style: { marginTop: '8px' } }, [
        h('div', { class: 'list-item' }, [
          h('div', { class: 'list-item__avatar' }, [
            h('span', { class: 'icon material-symbols-outlined' }, ['info']),
          ]),
          h('div', { class: 'list-item__main' }, [
            h('div', { class: 'list-item__title' }, ['No sales yet']),
            h('div', { class: 'list-item__subtitle' }, ['Tap "New Sale" below to ring up your first order.']),
          ]),
        ]),
      ]),
    );
  } else {
    const recent = h('div', { class: 'card', style: { marginTop: '8px', padding: '0' } }, []);
    for (const o of completed.slice(0, 6)) {
      const receipt = ReceiptsProvider.findByOrderId(o.id);
      recent.appendChild(
        h('div', {
          class: 'list-item',
          onclick: () => receipt && navigate(`/receipts/${receipt.id}`),
        }, [
          h('div', { class: 'list-item__avatar' }, [
            h('span', { class: 'icon material-symbols-outlined' }, ['receipt']),
          ]),
          h('div', { class: 'list-item__main' }, [
            h('div', { class: 'list-item__title' }, [`${o.orderNumber} · ${o.cashierName}`]),
            h('div', { class: 'list-item__subtitle' }, [
              `${formatDate(o.completedAt)} · ${o.itemCount} items`,
            ]),
          ]),
          h('div', { class: 'list-item__trailing' }, [formatMoney(o.total)]),
        ]),
      );
    }
    section.append(recent);
  }

  root.append(section);
  content.append(root);
}

function kpiCard(label, value, icon, color) {
  return h('div', { class: 'kpi-card' }, [
    h('div', {
      class: 'kpi-card__icon',
      style: { background: `${color}1f`, color },
    }, [h('span', { class: 'icon material-symbols-outlined' }, [icon])]),
    h('div', {}, [
      h('div', { class: 'kpi-card__label' }, [label]),
      h('div', { class: 'kpi-card__value' }, [value]),
    ]),
  ]);
}
