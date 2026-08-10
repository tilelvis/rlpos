// Menu item model (port of lib/core/models/menu_item.dart).

export class MenuItem {
  constructor({
    id,
    name,
    price,
    categoryId,
    available = true,
    description = null,
    sortOrder = 0,
    photoBase64 = null,
  }) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.categoryId = categoryId;
    this.available = available;
    this.description = description;
    this.sortOrder = sortOrder;
    this.photoBase64 = photoBase64;
  }

  get hasPhoto() {
    return !!this.photoBase64 && this.photoBase64.length > 0;
  }

  toMap() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      categoryId: this.categoryId,
      available: this.available,
      description: this.description,
      sortOrder: this.sortOrder,
      photoBase64: this.photoBase64,
    };
  }

  static fromMap(m) {
    return new MenuItem({
      id: m.id,
      name: m.name,
      price: m.price,
      categoryId: m.categoryId,
      available: m.available ?? true,
      description: m.description,
      sortOrder: m.sortOrder ?? 0,
      photoBase64: m.photoBase64,
    });
  }
}
