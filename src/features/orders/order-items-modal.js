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

/**
 * @param {object} opts
 * @param {string} opts.heading      Modal title, e.g. order/receipt number.
 * @param {string} [opts.subtitle]   One-line meta info (date, cashier…).
 * @param {Array}  opts.items        [{ name, quantity, unitPrice, lineTotal? }]
 * @param {number} opts.total
 * @param {Array}  [opts.badges]     Extra small tag elements (status, paid/unpaid…).
 */
export function showOrderItemsModal({ heading, subtitle, items, total, badges = [] }) {
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
    actions: [
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Close']),
    ],
  });

  return dlg;
}

/** Convenience wrapper for an Order (order-history.js). */
export function showOrderModal(order) {
  const badges = [];
  if (order.status === 'completed') {
    badges.push(
      h('span', { class: `tag ${order.paid ? 'tag--paid' : 'tag--unpaid'}` }, [order.paid ? 'Paid' : 'Unpaid']),
    );
  } else {
    badges.push(h('span', { class: 'tag' }, [order.statusLabel]));
  }
  return showOrderItemsModal({
    heading: order.orderNumber,
    subtitle: `${formatDate(order.createdAt)} · Taken by ${order.cashierName}`,
    items: order.items,
    total: order.total,
    badges,
  });
}

/** Convenience wrapper for a Receipt (receipt-history.js, reports.js). */
export function showReceiptModal(receipt) {
  const badges = [];
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
