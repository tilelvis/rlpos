// Sale context — tracks the current in-progress sale's user + order ID.
//
// This replaces the old `window.__lastSaleUser` / `window.__lastSaleOrderId`
// globals. The receipt-preview page needs to know:
//   - WHO completed the sale (to decide post-print behaviour: waiters
//     auto-logout + get a "you raised X orders today" toast; admin/
//     cashier stay logged in)
//   - WHICH order was just completed (for the waiter's order-count toast)
//
// Two ENTRY PATHS to the receipt-preview page:
//
//   1. WAITER PATH (from "Complete Sale"):
//      - new-order.js calls SaleContext.set(user, order) before navigating
//      - receipt-preview.js reads SaleContext.get() to find the sale user
//      - After print: auto-logout (waiter), show toast, navigate to dashboard
//      - SaleContext is cleared after use
//
//   2. ADMIN/CASHIER PATH (from Orders/Reports reprint):
//      - No SaleContext is set (the admin is already logged in)
//      - receipt-preview.js falls back to AuthProvider.currentUser
//      - After print: NO auto-logout, NO waiter toast, just navigate
//      - This was the bug: previously the receipt-preview used
//        window.__lastSaleUser which was stale from a previous waiter
//        sale, causing the admin to get auto-logged-out

class SaleContext {
  constructor() {
    this._user = null;
    this._orderId = null;
  }

  /** Set the current sale's user + order ID. Called by new-order.js
   *  just before navigating to the receipt-preview page. */
  set(user, orderId) {
    this._user = user;
    this._orderId = orderId;
  }

  /** Get the sale user (or null if no sale context is set). */
  get user() {
    return this._user;
  }

  /** Get the sale order ID (or null). */
  get orderId() {
    return this._orderId;
  }

  /** True if a sale context is currently set (i.e. we just came from
   *  a Complete Sale flow, not a reprint). */
  get isSet() {
    return this._user !== null && this._orderId !== null;
  }

  /** Clear the sale context. Called by receipt-preview.js after it
   *  has consumed the context (either after print or after the user
   *  dismisses the preview without printing). */
  clear() {
    this._user = null;
    this._orderId = null;
  }
}

export const saleContext = new SaleContext();
