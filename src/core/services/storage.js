// Thin localStorage wrapper. Mirrors the API surface of the Flutter
// app's Hive-based StorageService so the providers can stay thin too.
//
// Each "box" is a single localStorage key holding a JSON object whose
// properties are record IDs and whose values are record maps.

import { STORAGE_KEYS, DEFAULT_BUSINESS } from '../constants.js';
import { User } from '../models/user.js';
import { Category } from '../models/category.js';
import { MenuItem } from '../models/menu_item.js';
import { Order, ORDER_STATUS } from '../models/order.js';
import { Receipt } from '../models/receipt.js';
import { BusinessInfo } from '../models/business_info.js';

// ---- Low-level JSON I/O ----

function readObject(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (e) {
    console.error(`[storage] failed to read ${key}:`, e);
    return {};
  }
}

function writeObject(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error(`[storage] failed to write ${key}:`, e);
    return false;
  }
}

function readScalar(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[storage] failed to read ${key} — falling back to default (${JSON.stringify(defaultValue)}):`, e);
    return defaultValue;
  }
}

function writeScalar(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`[storage] failed to write scalar ${key}:`, e);
    return false;
  }
}

// ---- Users ----

export const StorageService = {
  // ----- Users -----
  get users() {
    const obj = readObject(STORAGE_KEYS.users);
    return Object.values(obj)
      .map((m) => User.fromMap(m))
      .sort((a, b) => a.username.localeCompare(b.username));
  },

  findUser(username) {
    if (!username) return null;
    const lower = username.toLowerCase();
    return this.users.find((u) => u.username.toLowerCase() === lower) ?? null;
  },

  async upsertUser(user) {
    const obj = readObject(STORAGE_KEYS.users);
    obj[user.id] = user.toMap();
    writeObject(STORAGE_KEYS.users, obj);
  },

  async deleteUser(id) {
    const obj = readObject(STORAGE_KEYS.users);
    delete obj[id];
    writeObject(STORAGE_KEYS.users, obj);
  },

  // ----- Categories -----
  get categories() {
    const obj = readObject(STORAGE_KEYS.categories);
    return Object.values(obj)
      .map((m) => Category.fromMap(m))
      .sort((a, b) =>
        a.sortOrder === b.sortOrder
          ? a.name.localeCompare(b.name)
          : a.sortOrder - b.sortOrder,
      );
  },

  async upsertCategory(c) {
    const obj = readObject(STORAGE_KEYS.categories);
    obj[c.id] = c.toMap();
    writeObject(STORAGE_KEYS.categories, obj);
  },

  async deleteCategory(id) {
    const obj = readObject(STORAGE_KEYS.categories);
    delete obj[id];
    writeObject(STORAGE_KEYS.categories, obj);
  },

  // ----- Menu items -----
  get menu() {
    const obj = readObject(STORAGE_KEYS.menuItems);
    return Object.values(obj)
      .map((m) => MenuItem.fromMap(m))
      .sort((a, b) =>
        a.sortOrder === b.sortOrder
          ? a.name.localeCompare(b.name)
          : a.sortOrder - b.sortOrder,
      );
  },

  async upsertMenuItem(m) {
    const obj = readObject(STORAGE_KEYS.menuItems);
    obj[m.id] = m.toMap();
    writeObject(STORAGE_KEYS.menuItems, obj);
  },

  async deleteMenuItem(id) {
    const obj = readObject(STORAGE_KEYS.menuItems);
    delete obj[id];
    writeObject(STORAGE_KEYS.menuItems, obj);
  },

  // ----- Orders -----
  get orders() {
    const obj = readObject(STORAGE_KEYS.orders);
    return Object.values(obj)
      .map((m) => Order.fromMap(m))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  findOrder(id) {
    const obj = readObject(STORAGE_KEYS.orders);
    const m = obj[id];
    return m ? Order.fromMap(m) : null;
  },

  async upsertOrder(o) {
    const obj = readObject(STORAGE_KEYS.orders);
    obj[o.id] = o.toMap();
    writeObject(STORAGE_KEYS.orders, obj);
  },

  async deleteOrder(id) {
    const obj = readObject(STORAGE_KEYS.orders);
    delete obj[id];
    writeObject(STORAGE_KEYS.orders, obj);
  },

  // ----- Receipts -----
  get receipts() {
    const obj = readObject(STORAGE_KEYS.receipts);
    return Object.values(obj)
      .map((m) => Receipt.fromMap(m))
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  },

  findReceipt(id) {
    const obj = readObject(STORAGE_KEYS.receipts);
    const m = obj[id];
    return m ? Receipt.fromMap(m) : null;
  },

  findReceiptByOrder(orderId) {
    return this.receipts.find((r) => r.orderId === orderId) ?? null;
  },

  async upsertReceipt(r) {
    const obj = readObject(STORAGE_KEYS.receipts);
    obj[r.id] = r.toMap();
    writeObject(STORAGE_KEYS.receipts, obj);
  },

  // ----- Business -----
  get business() {
    const obj = readObject(STORAGE_KEYS.business);
    const m = obj.current;
    if (!m) return BusinessInfo.defaults();
    return BusinessInfo.fromMap(m);
  },

  async saveBusiness(b) {
    const obj = readObject(STORAGE_KEYS.business);
    obj.current = b.toMap();
    writeObject(STORAGE_KEYS.business, obj);
  },

  // ----- Counters (sequential receipt/order numbers) -----

  /** Returns "000123" — zero-padded to 6 digits, then incremented. */
  async nextReceiptNumber() {
    const counters = readObject(STORAGE_KEYS.counters);
    const current = counters.receipt ?? 0;
    const next = current + 1;
    counters.receipt = next;
    writeObject(STORAGE_KEYS.counters, counters);
    return String(next).padStart(6, '0');
  },

  /** Returns "ORD-000123". */
  async nextOrderNumber() {
    const counters = readObject(STORAGE_KEYS.counters);
    const current = counters.order ?? 0;
    const next = current + 1;
    counters.order = next;
    writeObject(STORAGE_KEYS.counters, counters);
    return `ORD-${String(next).padStart(6, '0')}`;
  },

  // ----- Session (currently-logged-in user) -----
  get currentUserId() {
    return readScalar(STORAGE_KEYS.session, null);
  },

  set currentUserId(id) {
    writeScalar(STORAGE_KEYS.session, id);
  },

  clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEYS.session);
    } catch (e) {
      console.error('[storage] failed to clear session:', e);
    }
  },

  // ----- Bulk reset -----

  /** Clears only open/held orders — stuck carts. Keeps completed orders,
   * receipts, users, menu, and business settings intact. */
  async resetOpenOrders() {
    const obj = readObject(STORAGE_KEYS.orders);
    const stuck = Object.values(obj).filter(
      (m) => m.status === ORDER_STATUS.open || m.status === ORDER_STATUS.held,
    );
    for (const m of stuck) {
      delete obj[m.id];
    }
    writeObject(STORAGE_KEYS.orders, obj);
  },

  /** Wipes users, categories, menu, orders, receipts, counters, report
   * flags. Does NOT clear business profile (kept so the admin doesn't
   * have to re-enter Paybill/Till numbers after a reset). */
  async clearOperationalData() {
    localStorage.removeItem(STORAGE_KEYS.users);
    localStorage.removeItem(STORAGE_KEYS.categories);
    localStorage.removeItem(STORAGE_KEYS.menuItems);
    localStorage.removeItem(STORAGE_KEYS.orders);
    localStorage.removeItem(STORAGE_KEYS.receipts);
    localStorage.removeItem(STORAGE_KEYS.counters);
    localStorage.removeItem(STORAGE_KEYS.reportFlags);
  },

  // ----- Report scheduling flags -----
  get lastAutoDailyReportDate() {
    const obj = readObject(STORAGE_KEYS.reportFlags);
    return obj.lastDaily ?? null;
  },

  async setLastAutoDailyReportDate(key) {
    const obj = readObject(STORAGE_KEYS.reportFlags);
    obj.lastDaily = key;
    writeObject(STORAGE_KEYS.reportFlags, obj);
  },

  get lastAutoWeeklyReportDate() {
    const obj = readObject(STORAGE_KEYS.reportFlags);
    return obj.lastWeekly ?? null;
  },

  async setLastAutoWeeklyReportDate(key) {
    const obj = readObject(STORAGE_KEYS.reportFlags);
    obj.lastWeekly = key;
    writeObject(STORAGE_KEYS.reportFlags, obj);
  },
};
