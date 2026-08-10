// Order item model (port of lib/core/models/order_item.dart).

export class OrderItem {
  constructor({ menuItemId, name, unitPrice, quantity, categoryId = null }) {
    this.menuItemId = menuItemId;
    this.name = name;
    this.unitPrice = unitPrice;
    this.quantity = quantity;
    this.categoryId = categoryId;
  }

  get lineTotal() {
    return this.unitPrice * this.quantity;
  }

  toMap() {
    return {
      menuItemId: this.menuItemId,
      name: this.name,
      unitPrice: this.unitPrice,
      quantity: this.quantity,
      categoryId: this.categoryId,
    };
  }

  static fromMap(m) {
    return new OrderItem({
      menuItemId: m.menuItemId,
      name: m.name,
      unitPrice: m.unitPrice,
      quantity: m.quantity,
      categoryId: m.categoryId,
    });
  }
}
