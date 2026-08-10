// Lightweight reactive store.
//
// The Flutter app uses Riverpod. We don't need a full state library —
// we use a tiny pub/sub "Store" object that holds version counters and
// notifies subscribers when state changes. Components subscribe on mount
// and re-render on change.
//
// Each "provider" is a plain object exposing:
//   - get()       — read current value
//   - subscribe() — register a listener, returns unsubscribe
//   - bump()      — increment version and notify (used after writes)

class Store {
  constructor() {
    this._channels = new Map();
  }

  _ensure(name) {
    if (!this._channels.has(name)) {
      this._channels.set(name, { version: 0, listeners: new Set() });
    }
    return this._channels.get(name);
  }

  /** Read the current version counter. */
  version(name) {
    return this._ensure(name).version;
  }

  /** Increment version and notify all subscribers. Pass a payload
   * (optional) so subscribers can act on what changed. */
  bump(name, payload = null) {
    const ch = this._ensure(name);
    ch.version++;
    for (const fn of ch.listeners) {
      try {
        fn(ch.version, payload, name);
      } catch (e) {
        console.error(`[store] subscriber for "${name}" threw:`, e);
      }
    }
  }

  /** Subscribe to a channel. Returns an unsubscribe function. */
  subscribe(name, fn) {
    const ch = this._ensure(name);
    ch.listeners.add(fn);
    return () => ch.listeners.delete(fn);
  }
}

export const store = new Store();

// Channel names — keep them as constants so refactorings don't break string keys.
export const CHANNELS = {
  auth: 'auth',
  business: 'business',
  menu: 'menu',
  cart: 'cart',
  orders: 'orders',
  receipts: 'receipts',
  users: 'users',
  // The cart is in-memory only — but we still expose a version channel
  // so the cart panel rebuilds when items change.
};

// In-memory cart. Not persisted (mirrors the Flutter app's Riverpod cart).
let _cart = [];

export const Cart = {
  get items() {
    return _cart.slice();
  },
  get total() {
    return _cart.reduce((s, i) => s + i.lineTotal, 0);
  },
  get itemCount() {
    return _cart.reduce((s, i) => s + i.quantity, 0);
  },
  setItems(items) {
    _cart = items.slice();
    store.bump(CHANNELS.cart);
  },
  clear() {
    _cart = [];
    store.bump(CHANNELS.cart);
  },
};

// Currently-signed-in user (in-memory cache, mirrored to localStorage).
let _currentUser = null;

export const Auth = {
  get user() {
    return _currentUser;
  },
  setUser(user) {
    _currentUser = user;
    if (user) {
      StorageService_currentUserId(user.id);
    } else {
      StorageService_currentUserId(null);
    }
    store.bump(CHANNELS.auth);
  },
  // Restore from storage on app start.
  restore() {
    const id = StorageService_currentUserId_read();
    if (!id) return null;
    const user = StorageService_findUserById(id);
    _currentUser = user;
    return user;
  },
};

// Forward declarations — these are wired to StorageService below.
// (We can't import StorageService here directly to avoid a circular
// import; the boot code wires them instead.)
let StorageService_currentUserId = () => {};
let StorageService_currentUserId_read = () => null;
let StorageService_findUserById = () => null;

export function wireAuthToStorageService(StorageService) {
  StorageService_currentUserId = (id) => {
    StorageService.currentUserId = id;
  };
  StorageService_currentUserId_read = () => StorageService.currentUserId;
  StorageService_findUserById = (id) => StorageService.users.find((u) => u.id === id) ?? null;
}
