// Order history (port of lib/features/orders/order_history_page.dart).
//
// Admin/cashier see every order ("Order Log"); waiters see only their own
// ("My Orders").

import { h, clear, formatMoney, formatDate, toast } from '../../core/ui.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { CartProvider } from '../../core/providers/menu.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { navigate } from '../../core/router.js';
import { ORDER_STATUS } from '../../core/models/order.js';

const STATUS_COLORS = {
  open: 'var(--accent)',
  held: 'var(--warning)',
  completed: 'var(--success)',
  voided: 'var(--muted)',
};
const STATUS_ICONS = {
  open: 'edit_note',
  held: 'pause_circle',
  completed: 'check_circle',
  voided: 'cancel',
};

export function renderOrderHistory(content) {
  clear(content);

  const user = AuthProvider.currentUser;
  if (!user) return;

  const all = OrdersProvider.orders;
  const orders = user.canViewFinancials
    ? all
    : all.filter((o) => o.cashierId === user.id);

  if (orders.length === 0) {
    content.append(
      h('div', { class: 'empty-state' }, [
        user.canViewFinancials
          ? 'No orders yet.\n\nTap "New Sale" to create your first order.'
          : "You haven't made any sales yet.\n\nTap \"New Sale\" to get started.",
      ].join('').split('\n').map((line, i) => i === 0 ? line : [h('br'), line])),
    );
    return;
  }

  const root = h('div', { style: { padding: '16px', maxWidth: '900px', margin: '0 auto' } }, []);
  const card = h('div', { class: 'card', style: { padding: '0' } }, []);

  for (const o of orders) {
    const statusColor = STATUS_COLORS[o.status] || 'var(--muted)';
    card.append(
      h('div', {
        class: 'list-item',
        onclick: async () => {
          if (o.status === 'held') {
            const resumed = await OrdersProvider.resumeOrder(o.id);
            if (resumed) {
              CartProvider.setItems(resumed.items);
              toast(`Order ${resumed.orderNumber} resumed. Review & complete it.`, { type: 'success' });
              navigate('/orders/new');
            }
            return;
          }
          if (o.status === 'completed') {
            const receipt = ReceiptsProvider.findByOrderId(o.id);
            if (receipt) navigate(`/receipts/${receipt.id}`);
            return;
          }
          toast(`${o.orderNumber} · ${o.statusLabel}`, { type: 'info' });
        },
      }, [
        h('div', {
          class: 'list-item__avatar',
          style: { background: `${statusColor}1f`, color: statusColor },
        }, [
          h('span', { class: 'icon material-symbols-outlined' }, [STATUS_ICONS[o.status] || 'circle']),
        ]),
        h('div', { class: 'list-item__main' }, [
          h('div', { class: 'list-item__title' }, [
            h('strong', {}, [o.orderNumber]),
            h('span', {
              class: `tag tag--${o.status === 'completed' ? 'success' : o.status === 'held' ? 'purple' : o.status === 'voided' ? 'muted' : 'warning'}`,
              style: { marginLeft: '8px' },
            }, [o.statusLabel]),
          ]),
          h('div', { class: 'list-item__subtitle' }, [
            `${formatDate(o.createdAt)} · Taken by ${o.cashierName} · ${o.itemCount} items`,
          ]),
        ]),
        h('div', { class: 'list-item__trailing' }, [formatMoney(o.total)]),
      ]),
    );
  }
  root.append(card);
  content.append(root);
}
