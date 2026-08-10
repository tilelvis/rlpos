// Menu category model (port of lib/core/models/category.dart).

export class Category {
  constructor({ id, name, sortOrder = 0, colorValue = 0xff1976d2 }) {
    this.id = id;
    this.name = name;
    this.sortOrder = sortOrder;
    this.colorValue = colorValue;
  }

  toMap() {
    return {
      id: this.id,
      name: this.name,
      sortOrder: this.sortOrder,
      colorValue: this.colorValue,
    };
  }

  static fromMap(m) {
    return new Category({
      id: m.id,
      name: m.name,
      sortOrder: m.sortOrder ?? 0,
      colorValue: m.colorValue ?? 0xff1976d2,
    });
  }
}
