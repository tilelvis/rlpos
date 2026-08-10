// Order model + status enum.
//
// An Order is a customer order in the POS lifecycle:
//   open → held → completed → (paid=true)
//   open → voided
//
// PAYMENT STATUS:
// An order's `paid` flag is INDEPENDENT of its lifecycle status.
// `status: completed` means "the order was finalised and a receipt
// was printed". `paid: false` means "payment has NOT yet been
// received by an admin/cashier" — the order is still outstanding.
// Newly completed orders default to `paid=false`. An admin/cashier
// marks them paid after physically receiving the cash / M-Pesa.

import { OrderItem } from './order_item.js';

export const ORDER_STATUS = {
  open: { label: 'Open' },
  held: { label: 'Held' },
  completed: { label: 'Completed' },
  voided: { label: 'Voided' },
};

export class Order {
  constructor({
    id,
    orderNumber,
    items,
    status,
    cashierId,
    cashierName,
    createdAt,
    completedAt = null,
    heldAt = null,
    note = null,
    paid = false,
    paidAt = null,
    paidById = null,
    paidByName = null,
  }) {
    this.id = id;
    this.orderNumber = orderNumber;
    this.items = items;
    this.status = status;
    this.cashierId = cashierId;
    this.cashierName = cashierName;
    this.createdAt = createdAt;
    this.completedAt = completedAt;
    this.heldAt = heldAt;
    this.note = note;
    this.paid = paid;
    this.paidAt = paidAt;
    this.paidById = paidById;
    this.paidByName = paidByName;
  }

  get total() {
    return this.items.reduce((s, i) => s + i.lineTotal, 0);
  }

  get itemCount() {
    return this.items.reduce((s, i) => s + i.quantity, 0);
  }

  get statusLabel() {
    return ORDER_STATUS[this.status]?.label ?? this.status;
  }

  /** True if the order is completed but payment has not yet been
   *  received by an admin/cashier. */
  get isUnpaid() {
    return this.status === 'completed' && !this.paid;
  }

  /** Returns a copy with any of the given fields overridden. The
   *  items array is preserved as-is (still OrderItem instances). */
  copyWith({
    items,
    status,
    completedAt,
    heldAt,
    note,
    paid,
    paidAt,
    paidById,
    paidByName,
  } = {}) {
    return new Order({
      id: this.id,
      orderNumber: this.orderNumber,
      items: items ?? this.items,
      status: status ?? this.status,
      cashierId: this.cashierId,
      cashierName: this.cashierName,
      createdAt: this.createdAt,
      completedAt: completedAt ?? this.completedAt,
      heldAt: heldAt ?? this.heldAt,
      note: note ?? this.note,
      paid: paid ?? this.paid,
      paidAt: paidAt ?? this.paidAt,
      paidById: paidById ?? this.paidById,
      paidByName: paidByName ?? this.paidByName,
    });
  }

  /** Mark this order as paid by the given user. Returns a new Order. */
  markPaidBy(user) {
    return this.copyWith({
      paid: true,
      paidAt: new Date().toISOString(),
      paidById: user.id,
      paidByName: user.displayName,
    });
  }

  toMap() {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      items: this.items.map((i) => i.toMap()),
      status: this.status,
      cashierId: this.cashierId,
      cashierName: this.cashierName,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      heldAt: this.heldAt,
      note: this.note,
      paid: this.paid,
      paidAt: this.paidAt,
      paidById: this.paidById,
      paidByName: this.paidByName,
    };
  }

  static fromMap(m) {
    return new Order({
      id: m.id,
      orderNumber: m.orderNumber,
      items: (m.items || []).map((i) => OrderItem.fromMap(i)),
      status: m.status,
      cashierId: m.cashierId,
      cashierName: m.cashierName,
      createdAt: m.createdAt,
      completedAt: m.completedAt,
      heldAt: m.heldAt,
      note: m.note,
      // Migration: orders saved before the `paid` field existed
      // are treated as paid so historical receipts don't show as
      // outstanding. Only newly completed orders (post-this-change)
      // default to unpaid.
      paid: m.paid ?? (m.status === 'completed'),
      paidAt: m.paidAt ?? (m.status === 'completed' ? m.completedAt : null),
      paidById: m.paidById ?? m.cashierId,
      paidByName: m.paidByName ?? m.cashierName,
    });
  }
}
