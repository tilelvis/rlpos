// SVG icon set — replaces Material Symbols Outlined.
//
// Why: Material Symbols Outlined uses COLRv1 color tables which are
// unreliable in headless Chromium (and in some older browser versions).
// To guarantee the icons always render, we use a small inline SVG set
// instead. Each icon is a single-path SVG that inherits the current
// text color via `fill="currentColor"`.
//
// Usage:
//   import { icon } from './icons.js';
//   el.appendChild(icon('print'));        // default 20px
//   el.appendChild(icon('logout', 18));   // 18px
//
// Names roughly mirror Material Symbols Outlined so they're easy to
// grep for. If a name isn't in the set, a fallback "circle" is shown.

const ICONS = {
  // App bar / actions
  print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
  logout: 'M17 8l-1.41 1.41L17.17 11H14v2h3.17l-1.58 1.58L19 17l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  arrow_back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  'arrow_back_ios': 'M16.62 2.99a1.25 1.25 0 0 0-1.77 0L6.7 11.15a1 1 0 0 0 0 1.41l8.15 8.16a1.25 1.25 0 0 0 1.77-1.77L9.21 12l7.41-7.24a1.25 1.25 0 0 0 0-1.77z',
  chevron_right: 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  search: 'M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  person_add: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-1V8H4v3H1v2h3v3h2v-3h3v-2H6V11zm9 5c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',

  // Navigation
  point_of_sale: 'M15 5H5v3h10V5zm0 4H5v3h10V9zm-5 4H5v3h5v-3zm-5 4h10v3H5v-3zM16 8.5l4 4 4-4-1.41-1.41L21 9.67V3h-2v6.67L17.41 7.09 16 8.5z',
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  receipt_long: 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14l-1.5 1.5L3 22h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 12H7v-2h10v2zm0-4H7V9h10v2zm-2-6H9V3h6v2zM7 15h10v2H7v-2z',
  history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  bar_chart: 'M5 9.2h3V19H5zm5.6 5.2h3V19h-3zM16.2 5h3v14h-3z',
  restaurant: 'M11 9L9 8V2H7v6L5 9v2h6V9zm-2 0v2H7V9h2zm10.59 3.41L18.17 9l3.42-3.41L20.17 4.17 16.76 7.58 14.34 5.17l-1.41 1.41 3.41 3.42-3.41 3.41 1.41 1.41 2.41-2.41 3.41 3.41 1.42-1.42-3.42-3.41z',
  settings: 'M19.14 12.94a7.49 7.49 0 0 0 .05-.94c0-.32-.02-.64-.05-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.03.3-.05.62-.05.94s.02.64.05.94L2.86 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.47.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.488.488 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z',
  shopping_cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
  add_circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  add_a_photo: 'M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-2h2v-3h3v-3h3v-2H8V9H6zm5.5 4a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0z',
  upload_file: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16h-8v-2h8v2zm0-4h-8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  check_circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  picture_as_pdf: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 6h2v2h-2V8zm0 4h2v4h-2v-4zm-4-4h2v8H8V8zM4 8h2v2H4V8zm0 4h2v4H4v-4zM16 20H4v-2h12v2zm4-4h-2v-4h2v4zm0-6h-2V8h2v2z',
  usb: 'M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm5 9a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-4.08A7 7 0 0 0 19 10h-2z',
  usb_off: 'M3 3.27L4.41 1.86 21 18.45 19.59 19.86 17 17.27V21H7v-3.73L3 13.27V3.27zM15 5H9v6.73l-2-2V5L4.5 2.5 6 1h12v3l-2 2v3.73l-2-2V5z',
  link: 'M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10z',
  verified: 'M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  cancel: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
  'pause_circle': 'M9 16h2V8H9v8zm3-14C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 4h2v12h-2V6z',
  'edit_note': 'M3 10h11v2H3v-2zm0-2h4V6H3v2zm0 8h7v-2H3v2zm17.59-2.41L19.17 17l-3.42-3.41 1.42-1.41 2 2 4-4 1.42 1.41-5.42 5.41z',
  visibility: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'visibility_off': 'M12 6a9.77 9.77 0 0 1 8.94 5.84l1.49-1.49A11.74 11.74 0 0 0 12 4a11.7 11.7 0 0 0-10.43 6.35l1.49 1.49A9.77 9.77 0 0 1 12 6zm0 8a3 3 0 0 0 2.12-5.12l4.97-4.97 1.41 1.41-4.97 4.97A3 3 0 0 0 12 14z',
  'check_circle_outline': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  save: 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
  category: 'M12 2l-5.5 9h11L12 2zm5.5 9c-.83 0-1.5.67-1.5 1.5S16.67 14 17.5 14s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM3 8.5L8.5 14H3V8.5zm0 6L8.5 20H3v-5.5z',
  today: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z',
  date_range: 'M7 11h2v2H7zm0 4h2v-2H7zm4-4h2v2h-2zm0 4h2v-2h-2zm4-4h2v2h-2zm0 4h2v-2h-2zm2-9h-2V3h-2v2H9V3H7v2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H5V8h14v12z',
  'calendar_month': 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 18a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V10h14v8zm0-10H5V6h14v2z',
  payments: 'M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-8-3c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm12 0v8c0 1.1-.9 2-2 2H4v-2h14v-2c1.1 0 2-.9 2-2V8h2v3z',
  'inventory_2': 'M20 5V4c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v1H2v3c0 1.1.9 2 2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c1.1 0 2-.9 2-2V5h-2zM18 18H6v-8h12v8zm2-10H4V5h16v3zM8 12h8v2H8v-2zm0 4h8v2H8v-2z',
  'trending_up': 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z',
  'restaurant_menu': 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
  storefront: 'M5 6.5a2.5 2.5 0 0 1 5 0V8h2.5v-.5a2.5 2.5 0 0 1 5 0V8H19V4H5v2.5zm0 5V20h14v-8.5h-1.45c.27-.46.45-.97.45-1.5V9h-2v1c0 .55-.45 1-1 1s-1-.45-1-1V9h-5v1c0 .55-.45 1-1 1s-1-.45-1-1V9H5v1c0 .53.18 1.04.45 1.5H5zM4 3h16c.55 0 1 .45 1 1v6c0 1.66-1.34 3-3 3a3 3 0 0 1-3-3 3 3 0 0 1-6 0 3 3 0 0 1-3 3c-1.66 0-3-1.34-3-3V4c0-.55.45-1 1-1z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  person_outline: 'M12 5.9a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  'menu_book': 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  'person_remove': 'M14 8c0-2.21-1.79-4-4-4S6 5.79 6 8s1.79 4 4 4 4-1.79 4-4zm3 2v2h6v-2h-6zM3 18v2c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2c0-2.66-5.33-4-7-4s-7 1.34-7 4z',
  lock_outline: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z',
  'shopping_cart_checkout': 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
  'point_of_sale_alt': 'M15 5H5v3h10V5zm0 4H5v3h10V9zm-5 4H5v3h5v-3zm-5 4h10v3H5v-3zM16 8.5l4 4 4-4-1.41-1.41L21 9.67V3h-2v6.67L17.41 7.09 16 8.5z',
  'receipt_long_alt': 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14l-1.5 1.5L3 22h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
  // Fallback
  circle: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2z',
};

// Cache of <svg> elements by name+size to avoid rebuilding on every render.
const _cache = new Map();

/**
 * Build (or fetch from cache) an SVG icon element for the given name.
 *
 * @param {string} name - Icon name from the ICONS table above.
 * @param {number} [size=20] - Pixel size (width and height).
 * @param {string} [color='currentColor'] - Fill color. Defaults to currentColor
 *   so the icon inherits text color from its parent.
 * @returns {SVGSVGElement} An inline <svg> element ready to appendChild.
 */
export function icon(name, size = 20, color = 'currentColor') {
  const key = `${name}|${size}|${color}`;
  const cached = _cache.get(key);
  if (cached) return cached.cloneNode(true);

  const path = ICONS[name] || ICONS.circle;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', color);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.flexShrink = '0';

  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', path);
  svg.appendChild(pathEl);

  _cache.set(key, svg);
  return svg.cloneNode(true);
}

/** List of all available icon names — useful for debugging. */
export const iconNames = Object.keys(ICONS);
