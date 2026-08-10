// Menu category model (port of lib/core/models/category.dart).
//
// Categories optionally have a `photoBase64` (PNG/JPEG data URL) used
// as the background image on the dashboard's category cards. When no
// photo is set, the dashboard falls back to the category's first
// letter rendered against a tinted background using `colorValue`.

export class Category {
  constructor({
    id,
    name,
    sortOrder = 0,
    colorValue = 0xff1976d2,
    photoBase64 = null,
  }) {
    this.id = id;
    this.name = name;
    this.sortOrder = sortOrder;
    this.colorValue = colorValue;
    this.photoBase64 = photoBase64;
  }

  get hasPhoto() {
    return !!this.photoBase64 && this.photoBase64.length > 0;
  }

  copyWith({ name, sortOrder, colorValue, photoBase64 } = {}) {
    return new Category({
      id: this.id,
      name: name ?? this.name,
      sortOrder: sortOrder ?? this.sortOrder,
      colorValue: colorValue ?? this.colorValue,
      photoBase64: photoBase64 ?? this.photoBase64,
    });
  }

  toMap() {
    return {
      id: this.id,
      name: this.name,
      sortOrder: this.sortOrder,
      colorValue: this.colorValue,
      photoBase64: this.photoBase64,
    };
  }

  static fromMap(m) {
    return new Category({
      id: m.id,
      name: m.name,
      sortOrder: m.sortOrder ?? 0,
      colorValue: m.colorValue ?? 0xff1976d2,
      photoBase64: m.photoBase64 ?? null,
    });
  }
}
