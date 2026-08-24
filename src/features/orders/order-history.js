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
import { showOrderModal } from './order-items-modal.js';

const STATUS_COLORS = {
  open: 'var(--accent)',
  held: 'var(--warning)',
  completed: 'var(--success)',
  voided: 'var(--muted)',
};
const STATUS_BG = {
  open: 'rgba(var(--accent-rgb), 0.14)',
  held: 'rgba(var(--warning-rgb), 0.15)',
  completed: 'rgba(var(--success-rgb), 0.12)',
  voided: 'rgba(var(--muted-rgb), 0.10)',
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
            // Just browsing history — show a read-only items popup,
            // not the print-preview page (that's reserved for the
            // live "complete sale" flow).
            showOrderModal(o);
            return;
          }
          toast(`${o.orderNumber} · ${o.statusLabel}`, { type: 'info' });
        },
      }, [
        h('div', {
          class: 'list-item__avatar',
          style: { background: STATUS_BG[o.status] || 'rgba(var(--muted-rgb), 0.10)', color: statusColor },
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
            // Show paid/unpaid badge on completed orders — when paid,
            // the badge names the actual payment method (Cash / M-Pesa)
            // rather than a generic "Paid" so the method is visible at
            // a glance in the order table, not just inside the receipt.
            o.status === 'completed'
              ? h('span', {
                  class: `tag ${o.paid ? (o.paymentType === 'mpesa' ? 'tag--mpesa' : 'tag--cash') : 'tag--unpaid'}`,
                  style: { marginLeft: '4px' },
                }, [o.paid ? o.paymentLabel : 'Unpaid'])
              : null,
          ]),
          h('div', { class: 'list-item__subtitle' }, [
            `${formatDate(o.createdAt)} · Taken by ${o.cashierName} · ${o.itemCount} items`,
          ]),
        ]),
        h('div', { class: 'list-item__trailing' }, [formatMoney(o.total)]),
        (o.status === 'completed' && user.isAdmin)
          ? h('button', {
              class: 'btn btn--outlined btn--icon-only',
              title: 'Reprint receipt',
              onclick: async (e) => {
                e.stopPropagation();
                const receipt = ReceiptsProvider.findByOrderId(o.id);
                if (!receipt) {
                  toast('No receipt found for this order.', { type: 'error' });
                  return;
                }
                // No saleContext set here — the receipt-preview page
                // treats that as "admin/cashier reprint" (see its
                // comments): it stays logged in as the current admin,
                // skips the waiter auto-logout + "orders today" toast,
                // and just shows print / USB print / PDF actions.
                navigate(`/receipts/${receipt.id}`);
              },
            }, [
              h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['print']),
            ])
          : null,
      ]),
    );
  }
  root.append(card);
  content.append(root);
}
