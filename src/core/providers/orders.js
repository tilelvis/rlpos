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
};
