// Floating unpaid-orders notification.
//
// Renders a small floating chip at the top-right of the page showing
// the count of unpaid orders. Visible ONLY to admin/cashier users
// (waiters and guests don't see it — they can't mark orders as paid).
//
// Clicking the chip opens a modal listing all unpaid orders with a
// "Mark paid" button next to each. Marking an order as paid updates
// its `paid` flag and bumps the orders channel so the modal refreshes.
//
// The chip is rendered ONCE into a fixed-position container on first
// call. Subsequent calls just refresh its content (count + visibility).

import { h, clear, toast, formatMoney, formatDate, showModal } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { store, CHANNELS } from '../../core/store.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { navigate } from '../../core/router.js';

let _container = null;
let _chip = null;
let _countEl = null;
let _listenersAttached = false;

export function renderUnpaidNotif() {
  if (_container) return; // already mounted
  _container = h('div', { class: 'unpaid-notif-container' }, []);
  _chip = h('button', {
    class: 'unpaid-notif-chip',
    title: 'Unpaid orders — click to review',
    onclick: () => openUnpaidOrdersModal(),
  }, [
    h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['warning']),
    h('span', {}, ['Unpaid: ']),
    _countEl = h('strong', {}, ['0']),
  ]);
  _container.appendChild(_chip);
  document.body.appendChild(_container);

  if (!_listenersAttached) {
    store.subscribe(CHANNELS.orders, refreshUnpaidNotif);
    store.subscribe(CHANNELS.auth, refreshUnpaidNotif);
    _listenersAttached = true;
  }
  refreshUnpaidNotif();
}

export function refreshUnpaidNotif() {
  if (!_container) return;
  const user = AuthProvider.currentUser;
  const count = OrdersProvider.unpaidCount;

  // Only show for admin/cashier when there's at least 1 unpaid order.
  const shouldShow = !!user && user.canViewFinancials && count > 0;
  _container.classList.toggle('visible', shouldShow);
  if (_countEl) _countEl.textContent = String(count);
}

function openUnpaidOrdersModal() {
  const user = AuthProvider.currentUser;
  if (!user || !user.canViewFinancials) {
    toast('Only admin/cashier can mark orders as paid.', { type: 'warning' });
    return;
  }

  const body = h('div', {}, []);
  function refresh() {
    clear(body);
    const unpaid = OrdersProvider.unpaidOrders;
    if (unpaid.length === 0) {
      body.append(h('div', { class: 'empty-state' }, ['No unpaid orders. All caught up!']));
      return;
    }
    body.append(
      h('p', { style: { color: 'var(--muted)', fontSize: '13px', margin: '0 0 12px' } }, [
        `${unpaid.length} order${unpaid.length === 1 ? '' : 's'} awaiting payment. Tap "Mark paid" once you've received the cash / M-Pesa.`,
      ]),
    );
    const list = h('div', { class: 'card', style: { padding: '0', maxHeight: '50vh', overflowY: 'auto' } }, []);
    for (const o of unpaid) {
      const receipt = ReceiptsProvider.findByOrderId(o.id);
      list.append(
        h('div', { class: 'list-item' }, [
          h('div', { class: 'list-item__avatar', style: { background: 'rgba(192, 57, 43, 0.12)', color: 'var(--danger)' } }, [
            h('span', { class: 'icon material-symbols-outlined' }, ['warning']),
          ]),
          h('div', { class: 'list-item__main' }, [
            h('div', { class: 'list-item__title' }, [
              h('strong', {}, [o.orderNumber]),
              receipt
                ? h('span', { class: 'tag tag--warning', style: { marginLeft: '8px' } }, [`Receipt #${receipt.receiptNumber}`])
                : null,
            ]),
            h('div', { class: 'list-item__subtitle' }, [
              `${formatDate(o.createdAt)} · Raised by ${o.cashierName} · ${o.itemCount} items`,
            ]),
          ]),
          h('div', { class: 'list-item__trailing', style: { color: 'var(--danger)' } }, [
            formatMoney(o.total),
          ]),
          h('button', {
            class: 'btn btn--filled btn--sm',
            onclick: async () => {
              try {
                await OrdersProvider.markPaid(o.id, user);
                toast(`Marked ${o.orderNumber} as paid.`, { type: 'success' });
                refresh();
              } catch (e) {
                toast(`Failed: ${e.message}`, { type: 'error' });
              }
            },
          }, [
            h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '14px' } }, ['check']),
            'Mark paid',
          ]),
        ]),
      );
    }
    body.append(list);
  }
  refresh();

  const dlg = showModal({
    title: 'Unpaid orders',
    content: body,
    size: 'lg',
    actions: [
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Close']),
    ],
  });

  // Re-render the modal body when the orders store bumps (e.g. after
  // marking an order as paid).
  const unsub = store.subscribe(CHANNELS.orders, refresh);
  const obs = new MutationObserver(() => {
    if (!document.body.contains(dlg.root)) {
      unsub();
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
