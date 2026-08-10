// Order model + status enum (port of lib/core/models/order.dart).

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

  /** Returns a copy with any of the given fields overridden. The
   *  items array is preserved as-is (still OrderItem instances). */
  copyWith({ items, status, completedAt, heldAt, note } = {}) {
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
    });
  }
}
