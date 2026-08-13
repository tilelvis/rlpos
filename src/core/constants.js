// App-wide constants for Raicilabs POS (web port).

export const APP_NAME = 'Raicilabs POS';
export const APP_VERSION = '1.0.0';

// Default business profile (editable in Settings).
export const DEFAULT_BUSINESS = {
  name: 'RAICILABS',
  address: 'Nairobi, Kenya',
  phone: '+254 700 000 000',
  footerMessage: 'THANK YOU\nPLEASE VISIT AGAIN',
};

// Demo credentials — same as the Flutter app.
export const DEMO = {
  admin: { username: 'admin', password: 'admin123', displayName: 'Site Admin', role: 'admin' },
  cashier: { username: 'elvis', password: '1234', displayName: 'Elvis', role: 'cashier' },
  waiter: { username: 'mary', password: '1234', displayName: 'Mary', role: 'waiter' },
};

// Receipt widths in millimeters (thermal paper).
export const PAPER_WIDTHS = {
  mm58: { mm: 58, columns: 32, label: '58mm' },
  mm80: { mm: 80, columns: 48, label: '80mm' },
};

// Printable area in dots at 203 DPI (typical thermal printer density).
export const PRINTABLE_DOTS = {
  mm58: 384,
  mm80: 576,
};

// localStorage keys (one box per collection — mirrors Hive box layout).
export const STORAGE_KEYS = {
  users: 'raicilabs.users',
  categories: 'raicilabs.categories',
  menuItems: 'raicilabs.menuItems',
  orders: 'raicilabs.orders',
  receipts: 'raicilabs.receipts',
  business: 'raicilabs.business',
  counters: 'raicilabs.counters',
  reportFlags: 'raicilabs.reportFlags',
  session: 'raicilabs.session', // currently-logged-in user id
  theme: 'raicilabs.theme', // 'light' | 'dark'
};

// WebUSB vendor IDs recognised as ESC/POS thermal printers.
// Used by the WebUSB pairing filter — a real printer must match one of
// these (or expose USB class 0x07 = printer) to appear in the picker.
export const USB_PRINTER_FILTERS = [
  { classCode: 7 }, // generic USB printer class
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x0519 }, // Star Micronics
  { vendorId: 0x0fe6 }, // ICS Advent / Xprinter
  { vendorId: 0x0416 }, // Winbond / Goojprt
  { vendorId: 0x0483 }, // STMicro (generic)
  { vendorId: 0x154f }, // SNBC
  { vendorId: 0x1659 }, // Zjiang
];
