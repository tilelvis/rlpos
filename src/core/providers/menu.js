// Menu + cart providers (port of lib/core/providers/menu_provider.dart
// and lib/core/providers/cart_provider.dart).
//
// "Providers" here are thin orchestration modules: they call StorageService
// and bump the corresponding store channel so subscribers rebuild.

import { store, CHANNELS, Cart } from '../store.js';
import { StorageService } from '../services/storage.js';
import { OrderItem } from '../models/order_item.js';

export const MenuProvider = {
  get categories() {
    return StorageService.categories;
  },

  get items() {
    return StorageService.menu;
  },

  /** Items filtered by category, with availability + search applied. */
  filtered({ categoryId = null, query = '' } = {}) {
    const all = StorageService.menu.filter((i) => i.available);
    const q = (query || '').trim().toLowerCase();
    return all.filter((i) => {
      if (categoryId && i.categoryId !== categoryId) return false;
      if (q.length > 0 && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  // --- Mutations ---
  async upsertCategory(c) {
    await StorageService.upsertCategory(c);
    store.bump(CHANNELS.menu);
  },

  async deleteCategory(id) {
    await StorageService.deleteCategory(id);
    store.bump(CHANNELS.menu);
  },

  async upsertMenuItem(m) {
    await StorageService.upsertMenuItem(m);
    store.bump(CHANNELS.menu);
  },

  async deleteMenuItem(id) {
    await StorageService.deleteMenuItem(id);
    store.bump(CHANNELS.menu);
  },
};

export const CartProvider = {
  get items() {
    return Cart.items;
  },
  get total() {
    return Cart.total;
  },
  get itemCount() {
    return Cart.itemCount;
  },

  addItem(m) {
    const items = Cart.items.slice();
    const idx = items.findIndex((i) => i.menuItemId === m.id);
    if (idx >= 0) {
      const existing = items[idx];
      items[idx] = new OrderItem({
        menuItemId: existing.menuItemId,
        name: existing.name,
        unitPrice: existing.unitPrice,
        quantity: existing.quantity + 1,
        categoryId: existing.categoryId,
      });
    } else {
      items.push(
        new OrderItem({
          menuItemId: m.id,
          name: m.name,
          unitPrice: m.price,
          quantity: 1,
          categoryId: m.categoryId,
        }),
      );
    }
    Cart.setItems(items);
  },

  increment(menuItemId) {
    const items = Cart.items.map((i) =>
      i.menuItemId === menuItemId
        ? new OrderItem({ ...i, quantity: i.quantity + 1 })
        : i,
    );
    Cart.setItems(items);
  },

  decrement(menuItemId) {
    const existing = Cart.items.find((i) => i.menuItemId === menuItemId);
    if (!existing) return;
    if (existing.quantity <= 1) {
      this.remove(menuItemId);
      return;
    }
    const items = Cart.items.map((i) =>
      i.menuItemId === menuItemId
        ? new OrderItem({ ...i, quantity: i.quantity - 1 })
        : i,
    );
    Cart.setItems(items);
  },

  remove(menuItemId) {
    Cart.setItems(Cart.items.filter((i) => i.menuItemId !== menuItemId));
  },

  clear() {
    Cart.clear();
  },

  setItems(items) {
    Cart.setItems(items);
  },
};
