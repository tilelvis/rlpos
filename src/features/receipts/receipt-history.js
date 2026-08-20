// Receipt history (port of lib/features/receipts/receipt_history_page.dart).

import { h, clear, formatMoney, formatDate } from '../../core/ui.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { showReceiptModal } from '../orders/order-items-modal.js';

export function renderReceiptHistory(content) {
  clear(content);

  const receipts = ReceiptsProvider.receipts;
  if (receipts.length === 0) {
    content.append(
      h('div', { class: 'empty-state' }, [
        'No receipts yet.',
        h('br'),
        h('br'),
        'Complete a sale to generate the first receipt.',
      ]),
    );
    return;
  }

  const root = h('div', { style: { padding: '16px', maxWidth: '900px', margin: '0 auto' } }, []);

  const ordersById = new Map(OrdersProvider.orders.map((o) => [o.id, o]));
  const card = h('div', { class: 'card', style: { padding: '0' } }, []);
  for (const r of receipts) {
    const order = ordersById.get(r.orderId);
    const paid = order?.paid ?? true;
    const paymentLabel = order?.paymentLabel ?? 'Paid';
    card.append(
      h('div', {
        class: 'list-item',
        onclick: () => showReceiptModal(r),
      }, [
        h('div', { class: 'list-item__avatar' }, [r.receiptNumber.substring(0, 3)]),
        h('div', { class: 'list-item__main' }, [
          h('div', { class: 'list-item__title' }, [
            `#${r.receiptNumber}`,
            h('span', { style: { color: 'var(--muted)', fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' } }, [r.orderNumber]),
            h('span', {
              class: `tag ${paid ? (order?.paymentType === 'mpesa' ? 'tag--mpesa' : 'tag--cash') : 'tag--unpaid'}`,
              style: { marginLeft: '8px' },
            }, [paid ? paymentLabel : 'Unpaid']),
          ]),
          h('div', { class: 'list-item__subtitle' }, [
            `${formatDate(r.issuedAt, 'dd/MM/yyyy hh:mm a')} · Cashier: ${r.cashierName}` +
              (r.reprintCount > 0 ? ` · Reprinted ×${r.reprintCount}` : ''),
          ]),
        ]),
        h('div', { class: 'list-item__trailing', style: { color: 'var(--primary)' } }, [
          formatMoney(r.total),
        ]),
      ]),
    );
  }

  root.append(card);
  content.append(root);
}
