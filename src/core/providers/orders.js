// Orders provider (port of lib/core/providers/orders_provider.dart).

import { store, CHANNELS, Auth } from '../store.js';
import { StorageService } from '../services/storage.js';
import { Order } from '../models/order.js';
import { OrderItem } from '../models/order_item.js';
import { Receipt } from '../models/receipt.js';
import { BusinessProvider } from './auth.js';
import { CartProvider } from './menu.js';

export const OrdersProvider = {
  get orders() {
    return StorageService.orders;
  },

  get heldOrders() {
    return StorageService.orders.filter((o) => o.status === 'held');
  },

  get completedOrders() {
    return StorageService.orders.filter((o) => o.status === 'completed');
  },

  /** Completed orders that haven't been paid for yet. Visible to
   *  admin/cashier via the floating unpaid-orders notif. */
  get unpaidOrders() {
    return StorageService.orders.filter((o) => o.isUnpaid);
  },

  get unpaidCount() {
    return this.unpaidOrders.length;
  },

  /** Count of completed orders raised by the given user today
   *  (used for the waiter's "you raised X orders today" toast). */
  countByUserToday(userId) {
    const now = new Date();
    return StorageService.orders.filter((o) => {
      if (o.cashierId !== userId) return false;
      if (o.status !== 'completed') return false;
      const c = new Date(o.createdAt);
      return (
        c.getFullYear() === now.getFullYear() &&
        c.getMonth() === now.getMonth() &&
        c.getDate() === now.getDate()
      );
    }).length;
  },

  /** Create a new open order from the current cart. Returns the created order. */
  async createFromCart(items, { note = null } = {}) {
    const user = Auth.user;
    if (!user) throw new Error('No signed-in user.');
    const orderNumber = await StorageService.nextOrderNumber();
    const order = new Order({
      id: `o-${Date.now()}`,
      orderNumber,
      items: items.slice(),
      status: 'open',
      cashierId: user.id,
      cashierName: user.displayName,
      createdAt: new Date().toISOString(),
      note,
    });
    await StorageService.upsertOrder(order);
    store.bump(CHANNELS.orders);
    return order;
  },

  /** Hold an open order so it can be resumed later. */
  async holdOrder(orderId) {
    const o = StorageService.findOrder(orderId);
    if (!o) return;
    const updated = o.copyWith({ status: 'held', heldAt: new Date().toISOString() });
    await StorageService.upsertOrder(updated);
    store.bump(CHANNELS.orders);
  },

  /** Resume a held order — brings it back to open. */
  async resumeOrder(orderId) {
    const o = StorageService.findOrder(orderId);
    if (!o) return null;
    const updated = o.copyWith({ status: 'open', heldAt: null });
    await StorageService.upsertOrder(updated);
    store.bump(CHANNELS.orders);
    return updated;
  },

  /** Complete an order and generate its receipt. Returns the receipt.
   *  This is the central payment -> receipt handoff. */
  async completeOrder(orderId) {
    const o = StorageService.findOrder(orderId);
    if (!o) throw new Error(`Order ${orderId} not found`);

    const completed = o.copyWith({
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    await StorageService.upsertOrder(completed);

    const biz = BusinessProvider.info;
    const receiptNumber = await StorageService.nextReceiptNumber();
    const receipt = Receipt.fromOrder({
      id: `r-${Date.now()}`,
      receiptNumber,
      order: completed,
      businessInfo: biz,
    });
    await StorageService.upsertReceipt(receipt);

    store.bump(CHANNELS.orders);
    store.bump(CHANNELS.receipts);

    // Clear the cart — sale is finalized.
    CartProvider.clear();

    return receipt;
  },

  /** Void an open/held order. */
  async voidOrder(orderId) {
    const o = StorageService.findOrder(orderId);
    if (!o) return;
    const updated = o.copyWith({ status: 'voided' });
    await StorageService.upsertOrder(updated);
    store.bump(CHANNELS.orders);
  },

  /** Mark a completed order as paid. Only admin/cashier may call this
   *  — the caller is responsible for ensuring the user is authorised
   *  (the unpaid-orders modal checks `user.canViewFinancials` before
   *  showing the "Confirm payment" button).
   *
   *  @param {string} orderId
   *  @param {User} user - the admin/cashier confirming payment
   *  @param {Object} opts
   *  @param {string} opts.paymentType - 'cash' | 'mpesa'
   *  @param {string|null} opts.paymentRef - optional reference (e.g. M-Pesa confirmation code)
   */
  async markPaid(orderId, user, { paymentType = 'cash', paymentRef = null } = {}) {
    const o = StorageService.findOrder(orderId);
    if (!o) return;
    if (o.status !== 'completed') return;
    const updated = o.markPaidBy(user, { paymentType, paymentRef });
    await StorageService.upsertOrder(updated);
    store.bump(CHANNELS.orders);
    return updated;
  },

  /** Restore orders + receipts from a previously downloaded report's
   *  embedded backup data (see ReportService.readBackupFile). Matches
   *  by id — records already present are left untouched, so importing
   *  the same file twice (or files with overlapping date ranges) is
   *  always safe and never overwrites live data.
   *
   *  @param {{orders?: object[], receipts?: object[]}} backup
   */
  async importBackup({ orders = [], receipts = [] }) {
    let ordersAdded = 0, ordersSkipped = 0;
    for (const m of orders) {
      if (StorageService.findOrder(m.id)) { ordersSkipped++; continue; }
      await StorageService.upsertOrder(Order.fromMap(m));
      ordersAdded++;
    }
    let receiptsAdded = 0, receiptsSkipped = 0;
    for (const m of receipts) {
      if (StorageService.findReceipt(m.id)) { receiptsSkipped++; continue; }
      await StorageService.upsertReceipt(Receipt.fromMap(m));
      receiptsAdded++;
    }
    store.bump(CHANNELS.orders);
    store.bump(CHANNELS.receipts);
    return { ordersAdded, ordersSkipped, receiptsAdded, receiptsSkipped };
  },
};
