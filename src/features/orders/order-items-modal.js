// Shared "order items" popup.
//
// Order History, Receipt History, and Reports → Receipts all let the
// user tap a past order/receipt to see what was in it. That used to
// navigate to /receipts/:id — the full print-preview page — which is
// meant only for the "waiter completes a live sale" flow (it has its
// own auto-logout + printer wiring tied to sale-context). Browsing
// history isn't that flow, so those taps now open this lightweight
// read-only modal instead: no navigation, no printer, no auto-logout.

import { h, showModal, formatMoney, formatDate } from '../../core/ui.js';
import { AuthProvider } from '../../core/providers/auth.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { openConfirmPaymentModal } from './unpaid-notif.js';

/**
 * @param {object} opts
 * @param {string} opts.heading      Modal title, e.g. order/receipt number.
 * @param {string} [opts.subtitle]   One-line meta info (date, cashier…).
 * @param {Array}  opts.items        [{ name, quantity, unitPrice, lineTotal? }]
 * @param {number} opts.total
 * @param {Array}  [opts.badges]     Extra small tag elements (status, paid/unpaid…).
 * @param {Array}  [opts.extraActions] Extra buttons, placed before Close.
 */
export function showOrderItemsModal({ heading, subtitle, items, total, badges = [], extraActions = [] }) {
  const rows = items.map((it) => {
    const lineTotal = it.lineTotal ?? it.unitPrice * it.quantity;
    return h('div', { class: 'order-items-modal__row' }, [
      h('span', { class: 'order-items-modal__qty' }, [`${it.quantity}×`]),
      h('div', { class: 'order-items-modal__info' }, [
        h('div', { class: 'order-items-modal__name' }, [it.name]),
        h('div', { class: 'order-items-modal__each' }, [`${formatMoney(it.unitPrice)} each`]),
      ]),
      h('span', { class: 'order-items-modal__line-total' }, [formatMoney(lineTotal)]),
    ]);
  });

  const body = h('div', { class: 'order-items-modal' }, [
    (subtitle || badges.length)
      ? h('div', { class: 'order-items-modal__meta' }, [
          subtitle ? h('div', { class: 'order-items-modal__subtitle' }, [subtitle]) : null,
          badges.length ? h('div', { class: 'order-items-modal__badges' }, badges) : null,
        ])
      : null,
    h('div', { class: 'order-items-modal__list' }, rows),
    h('div', { class: 'order-items-modal__total' }, [
      h('span', {}, ['Total']),
      h('span', {}, [formatMoney(total)]),
    ]),
  ]);

  const dlg = showModal({
    title: heading,
    content: body,
    size: 'sm',
    actions: [],
  });

  dlg.root.querySelector('.modal__actions').append(
    ...extraActions.map((make) => make(dlg)),
    h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Close']),
  );

  return dlg;
}

/** Convenience wrapper for an Order (order-history.js). */
export function showOrderModal(order) {
  const badges = [];
  if (order.status === 'completed') {
    badges.push(
      h('span', {
        class: `tag ${order.paid ? (order.paymentType === 'mpesa' ? 'tag--mpesa' : 'tag--cash') : 'tag--unpaid'}`,
      }, [order.paid ? order.paymentLabel : 'Unpaid']),
    );
  } else {
    badges.push(h('span', { class: 'tag' }, [order.statusLabel]));
  }

  const user = AuthProvider.currentUser;
  const extraActions = [];
  // Only admin/cashier can mark an order paid — same permission the
  // floating unpaid-orders chip already requires.
  if (order.isUnpaid && user?.canViewFinancials) {
    extraActions.push((dlg) =>
      h('button', {
        class: 'btn btn--filled',
        onclick: () => {
          dlg.close();
          // Small defer so the items-modal's close animation can start
          // before the payment modal (and any resulting re-render) fires.
          setTimeout(() => openConfirmPaymentModal(order, user, null), 300);
        },
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '16px' } }, ['payments']),
        'Confirm payment',
      ]),
    );
  }

  return showOrderItemsModal({
    heading: order.orderNumber,
    subtitle: `${formatDate(order.createdAt)} · Taken by ${order.cashierName}`,
    items: order.items,
    total: order.total,
    badges,
    extraActions,
  });
}

/** Convenience wrapper for a Receipt (receipt-history.js, reports.js). */
export function showReceiptModal(receipt) {
  // Payment info (cash/M-Pesa/unpaid) lives on the Order, not the
  // Receipt snapshot — look it up so the badge reflects current status
  // even if it was marked paid after the receipt was issued.
  const order = OrdersProvider.orders.find((o) => o.id === receipt.orderId);
  const badges = [];
  if (order) {
    badges.push(
      h('span', {
        class: `tag ${order.paid ? (order.paymentType === 'mpesa' ? 'tag--mpesa' : 'tag--cash') : 'tag--unpaid'}`,
      }, [order.paid ? order.paymentLabel : 'Unpaid']),
    );
  }
  if (receipt.reprintCount > 0) {
    badges.push(h('span', { class: 'tag' }, [`Reprinted ×${receipt.reprintCount}`]));
  }
  return showOrderItemsModal({
    heading: `#${receipt.receiptNumber}`,
    subtitle: `${formatDate(receipt.issuedAt, 'dd/MM/yyyy hh:mm a')} · Cashier: ${receipt.cashierName}`,
    items: receipt.lineItems,
    total: receipt.total,
    badges,
  });
}
