// Floating unpaid-orders notification.
//
// Renders a small floating chip at the top-right of the page showing
// the count of unpaid orders. Visible ONLY to admin/cashier users
// (waiters and guests don't see it — they can't mark orders as paid).
//
// Clicking the chip opens a modal listing all unpaid orders. Each row
// has a "Confirm payment" button that marks the order as paid (cash).

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
        `${unpaid.length} order${unpaid.length === 1 ? '' : 's'} awaiting payment. Tap "Confirm payment" once you've received the cash or M-Pesa.`,
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
            onclick: () => openConfirmPaymentModal(o, user, refresh),
          }, [
            h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '14px' } }, ['payments']),
            'Confirm payment',
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

  // NOTE: we deliberately do NOT subscribe to CHANNELS.orders here.
  // The confirm-payment modal (opened from this modal) calls markPaid
  // which bumps CHANNELS.orders. If we subscribed, the refresh would
  // fire WHILE the confirm-payment modal is open, causing a nested
  // re-render that wedges the event loop. Instead, the confirm-payment
  // modal calls `onConfirmed()` (which is `refresh`) manually after
  // markPaid succeeds — that's the only time this modal needs to
  // refresh.
  const cleanup = setInterval(() => {
    if (!document.body.contains(dlg.root)) {
      clearInterval(cleanup);
    }
  }, 1000);
}

/**
 * Opens a modal to confirm payment for a specific order. The
 * admin/cashier picks how it was paid — Cash or M-Pesa — and taps
 * "Confirm". No reference/transaction code field; this just records
 * the method, not a confirmation code.
 *
 * Receipts are NOT printed here — printing already happened at the
 * Complete Sale step. This modal only records HOW the order was paid.
 */
export function openConfirmPaymentModal(order, user, onConfirmed) {
  let _paymentType = 'cash'; // 'cash' | 'mpesa'

  const body = h('div', {}, []);
  function refresh() {
    clear(body);
    body.append(
      // Order summary card
      h('div', { class: 'card', style: { padding: '12px', marginBottom: '16px', background: 'var(--bg)' } }, [
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
          h('div', {}, [
            h('div', { style: { fontWeight: 700, fontSize: '15px' } }, [order.orderNumber]),
            h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, [
              `${order.cashierName} · ${order.itemCount} items`,
            ]),
          ]),
          h('div', { style: { fontSize: '20px', fontWeight: 800, color: 'var(--primary)' } }, [
            formatMoney(order.total),
          ]),
        ]),
      ]),

      h('p', { style: { color: 'var(--muted)', fontSize: '13px', margin: '0 0 12px' } }, [
        'How was this payment received?',
      ]),

      // Payment type selector — two large chips, tap to select
      h('div', { style: { display: 'flex', gap: '8px' } }, [
        h('button', {
          class: `chip ${_paymentType === 'cash' ? 'active' : ''}`,
          style: { flex: '1', justifyContent: 'center', padding: '14px', fontSize: '15px' },
          onclick: () => { _paymentType = 'cash'; refresh(); },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['payments']),
          'Cash',
        ]),
        h('button', {
          class: `chip ${_paymentType === 'mpesa' ? 'active' : ''}`,
          style: { flex: '1', justifyContent: 'center', padding: '14px', fontSize: '15px' },
          onclick: () => { _paymentType = 'mpesa'; refresh(); },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['phone_iphone']),
          'M-Pesa',
        ]),
      ]),
    );
  }
  refresh();

  const dlg = showModal({
    title: 'Confirm payment',
    content: body,
    size: 'sm',
    actions: [],
  });

  dlg.root.querySelector('.modal__actions').append(
    h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Cancel']),
    h('button', {
      class: 'btn btn--filled',
      onclick: () => {
        const paymentType = _paymentType;
        const orderId = order.id;
        const orderNum = order.orderNumber;
        const cb = onConfirmed;

        // Close THIS modal first.
        dlg.close();

        // Defer markPaid so the modal close animation can start before
        // the orders store bump triggers a dashboard re-render.
        setTimeout(async () => {
          try {
            const updated = await OrdersProvider.markPaid(orderId, user, { paymentType });
            const payLabel = paymentType === 'mpesa' ? 'M-Pesa' : 'Cash';
            const timeLabel = updated?.paidAt ? formatDate(updated.paidAt, 'hh:mm a') : '';
            toast(`Confirmed ${orderNum} as paid via ${payLabel}${timeLabel ? ` at ${timeLabel}` : ''}.`, { type: 'success' });
            if (cb) cb();
          } catch (e) {
            toast(`Failed: ${e.message}`, { type: 'error' });
          }
        }, 300);
      },
    }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '16px' } }, ['check']),
      'Confirm',
    ]),
  );
}
