# Raicilabs POS — HTML + Vite + PWA + WebUSB Thermal Printer

A Point-of-Sale system built with **vanilla HTML + ES modules + Vite**, packaged as an installable **PWA** with **WebUSB direct ESC/POS thermal printer** support. A port of the original Flutter app to pure web standards — no Dart, no Flutter, no framework, no virtual DOM.

**North star:** From login to printed receipt in under 30 seconds — and the printer works without installing an OS driver.

---

## What's included

| Feature | Status |
|---------|--------|
| **Guest mode** — app boots to dashboard, no login screen at startup | ✅ |
| **Login-as-signature** — login modal pops up at "Complete Sale" as a signature step | ✅ |
| **Auto-logout for waiters** — waiters auto-logout after print, back to guest mode | ✅ |
| **Admin/cashier stay logged in** after signature login (to manage unpaid orders) | ✅ |
| **Unpaid orders tracking** — orders marked unpaid by default; admin/cashier mark paid | ✅ |
| **Floating unpaid-orders notif** at top — admin/cashier only, click to mark paid | ✅ |
| **Dashboard with 3×n category grid** — tap a category to drill into items | ✅ |
| **Receipts moved inside Reports** as a sub-tab (with per-receipt PDF export) | ✅ |
| **PDF removed from receipt preview** — only USB + Browser print paths there | ✅ |
| **Waiter's "You raised X orders today" disappearing toast** after print | ✅ |
| New Sale (menu grid + cart + complete) | ✅ |
| Receipt preview (58mm / 80mm, customer / kitchen copy toggle) | ✅ |
| Two print paths: WebUSB direct ESC/POS, browser print dialog (PDF export moved to Reports → Receipts) | ✅ |
| Order Log (held / completed / voided) with Paid/Unpaid badges per order | ✅ |
| Reports — Sales sub-tab (charts, Excel export) + Receipts sub-tab (PDF export) | ✅ |
| Menu management (items + categories + photos + CSV import) | ✅ |
| Settings: business profile, printer pairing, user management, system purge | ✅ |
| **WinUSB / Zadig setup walkthrough** (Settings → Printer → Open Setup Guide) | ✅ |
| PWA installable, offline-capable, manifest + service worker | ✅ |
| localStorage persistence | ✅ |

---

## Demo accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Cashier | `elvis` | `1234` |
| Waiter | `mary` | `1234` |

The cashier account can ring up sales; the admin account additionally sees the **Menu** and **Settings** tabs. The waiter can also ring up sales but only sees their own orders.

---

## Guest mode + login-as-signature flow

The app has **no login screen at startup**. Instead:

1. **App boots to dashboard in guest mode.** Anyone can browse categories, build a cart, and tap "Complete Sale".
2. **Login pops up as a signature step at "Complete Sale".** The user must authenticate to authorise the sale — this acts as their signature.
3. **After successful print:**
   - **Waiters** are auto-logged-out → back to guest mode. A "You've raised X orders today" toast appears for ~4 seconds.
   - **Admin/cashier** stay logged in so they can manage unpaid orders. They can sign out manually via the app bar.
4. **Menu/Settings** are admin-only — guests who navigate to those routes are bounced back to the dashboard.

This means a shared terminal can sit on the counter showing the dashboard. Staff walk up, build the order, sign in transiently to authorise the sale, and walk away — no lingering sessions.

### Unpaid orders

Every completed order defaults to `paid: false`. Payment is received separately by an admin/cashier (cash in the till, M-Pesa confirmation, etc.).

- A floating red "Unpaid: N" chip appears at the top-right of every page **for admin/cashier only**, when N > 0.
- Clicking the chip opens a modal listing all unpaid orders, each with a "Mark paid" button.
- Paid orders show a green "Paid" tag; unpaid show a red "Unpaid" tag in the Orders list.

---

## Architecture

```
raicilabs-pos-web/
├── index.html                     # PWA shell + loading screen + Google Fonts
├── vite.config.js                 # Vite + vite-plugin-pwa config (injectManifest)
├── package.json
├── public/
│   ├── icons/                     # PWA icons (192/512 + maskable variants)
│   ├── favicon.png
│   └── logo.png                   # Login page logo
├── src/
│   ├── main.js                    # Entry: seed storage, boot router, hide loading
│   ├── routes.js                  # Hash router registration
│   ├── sw.js                      # Service worker (Workbox injectManifest)
│   ├── styles/main.css            # Full stylesheet (warm Nairobi palette)
│   ├── core/
│   │   ├── constants.js           # App constants, USB vendor IDs, storage keys
│   │   ├── theme.js               # Color palette + shadow/radius tokens
│   │   ├── router.js              # Hash-based router with auth gate
│   │   ├── store.js               # Tiny pub/sub store + in-memory cart + auth
│   │   ├── ui.js                  # hyperscript `h()`, mount, toast, modal, formatMoney
│   │   ├── models/                # Plain JS classes mirroring the Dart models
│   │   │   ├── user.js
│   │   │   ├── category.js
│   │   │   ├── menu_item.js
│   │   │   ├── order.js
│   │   │   ├── order_item.js
│   │   │   ├── receipt.js
│   │   │   └── business_info.js
│   │   ├── services/
│   │   │   ├── storage.js         # localStorage adapter (mirrors Hive box API)
│   │   │   ├── seed.js            # First-run user seeding
│   │   │   ├── receipt.js         # Plain-text + HTML receipt generation
│   │   │   ├── printer_service.js # Three-path print orchestrator
│   │   │   ├── webusb_printer.js  # WebUSB device pairing + transferOut
│   │   │   ├── esc_pos_builder.js # ESC/POS command builder
│   │   │   ├── csv.js             # CSV file picker + RFC-4180 parser
│   │   │   ├── menu_csv_import.js
│   │   │   ├── report_service.js  # Excel (.xlsx) reports via SheetJS
│   │   │   └── file_download.js   # Blob + <a download> helper
│   │   └── providers/             # Thin orchestration (call storage, bump store)
│   │       ├── auth.js            # signIn / signOut / user / business mgmt
│   │       ├── menu.js             # MenuProvider + CartProvider
│   │       ├── orders.js           # createFromCart / hold / resume / complete
│   │       └── receipts.js
│   └── features/
│       ├── auth/login.js
│       ├── shell/app-shell.js     # Top app bar + bottom nav + view switching
│       ├── dashboard/dashboard.js
│       ├── orders/
│       │   ├── new-order.js       # Menu grid + cart + complete sale
│       │   └── order-history.js
│       ├── receipts/
│       │   ├── receipt-history.js
│       │   └── receipt-preview.js # Pixel-accurate preview + 3 print paths
│       ├── menu/menu-management.js
│       ├── reports/reports.js
│       ├── settings/business-settings.js  # 3 tabs + system purge
│       └── printer/
│           ├── usb-printer-widget.js      # Pairing card (used in Settings + app bar)
│           └── zadig-setup.js              # WinUSB / Zadig walkthrough (10 steps)
```

### Receipt printing strategy

```
Order Completed
      │
      ▼
ReceiptService.generate(receipt)   ← plain-text receipt (32 or 48 cols)
      │
      ▼
ReceiptPreviewPage                 ← on-screen pixel-accurate preview
      │
      ▼
PrinterService
      │
   ┌──┴────┬─────────┐
   ▼       ▼         ▼
WebUSB   Browser    PDF
direct   print      export (jsPDF)
ESC/POS  dialog
```

**Three independent printing paths**, all behind `PrinterService`:

1. **WebUSB direct ESC/POS** (`PrinterService.printReceiptUsbBothCopies`) — sends raw ESC/POS commands straight to a thermal printer over WebUSB. No OS driver needed. **Chrome, Edge, or Opera only**, over HTTPS or localhost. Requires a one-time user gesture to pair the device (the "Pair USB Printer" button in Settings or the receipt preview).

   - Builders: `EscPosBuilder` (`src/core/services/esc_pos_builder.js`)
   - Interop: `WebUsbPrinter` (`src/core/services/webusb_printer.js`)
   - Recognized vendors: Epson, Star Micronics, Xprinter, Goojprt, SNBC, Zjiang, plus any USB-printer-class device (class 0x07).

2. **Browser print dialog** (`PrinterService.printReceiptBothCopiesBrowser`) — opens a hidden iframe with the receipt rendered as HTML sized to 58mm/80mm and triggers `window.print()`. The OS-level print driver handles USB, network, and Bluetooth-via-OS printers. **Works on every browser.**

3. **PDF export** (`PrinterService.exportPdfBothCopies`) — for archival, email, or printing later. Uses jsPDF (lazy-loaded).

### Persistence

`localStorage` keys mirror the Flutter app's Hive box layout:

- `raicilabs.users`, `raicilabs.categories`, `raicilabs.menuItems`, `raicilabs.orders`, `raicilabs.receipts`, `raicilabs.business`, `raicilabs.counters`, `raicilabs.reportFlags`, `raicilabs.session`

Each "box" is a single localStorage key holding a JSON object whose properties are record IDs and whose values are record maps. This keeps the persistence layer thin and resilient to schema changes — same strategy as the Flutter app's no-adapters Hive usage.

### State management

A tiny pub/sub `Store` (in `src/core/store.js`) holds named "channels" with version counters. Components subscribe to a channel on mount and re-render when the version bumps. The cart is in-memory only (not persisted) — same as the Flutter app's Riverpod cart.

### Routing

Hash-based router (`#/login`, `#/dashboard`, `#/orders/new`, `#/receipts/:id`, etc.). Hash routing keeps the build a pure static bundle — no server-side URL rewriting needed (works on GitHub Pages, S3, Vercel, Netlify, anywhere).

---

## WinUSB / Zadig: why and how

**Why:** On Windows, the thermal printer manufacturer's driver claims the USB device the moment you plug it in. Chrome can't access a device the OS has already claimed, so WebUSB pairing fails with "Unable to claim interface."

**How:** Use [Zadig](https://zadig.akeo.ie/) to replace the manufacturer's driver with **WinUSB** — a generic USB driver that gives user-space applications (like Chrome) direct access to the device. This is a one-time setup per printer per PC.

The app includes a **step-by-step walkthrough** (Settings → Printer → "Open Printer Setup Guide", or directly at `#/settings/printer-setup`) covering:

1. Plug in the printer
2. Download Zadig from zadig.akeo.ie
3. Open Zadig as Administrator
4. Enable Options → List All Devices
5. Pick the printer in Zadig's dropdown
6. Set target driver to WinUSB
7. Click "Replace Driver"
8. Unplug & replug the printer
9. Restart Chrome fully
10. Pair the printer from this app

Plus a troubleshooting section for "no devices in picker", "unable to claim interface", "garbage printout", and how to revert back to the manufacturer's driver via Device Manager.

> **Important:** After switching to WinUSB, the printer will NOT appear in Windows's "Printers & scanners" list anymore — it's no longer an OS printer, just a raw USB device. That's expected: you print via the WebUSB path in this app, not via Windows Print Spooler. The browser print dialog path still works for any OTHER printer the OS knows about.

---

## Running locally

```bash
npm install
npm run dev
# → http://localhost:5173/
```

Vite dev server runs on `localhost`, which is treated as a secure context by WebUSB — direct USB printing works out of the box. No HTTPS setup needed for dev.

### Troubleshooting: "Invalid PostCSS Plugin found at: plugins[0]"

If `npm run dev` or `npm run build` crashes with this error, it means Vite walked **up your directory tree** looking for a PostCSS config and found a stray `postcss.config.{js,mjs,cjs}` in a parent folder (e.g. in `C:\Users\<you>\Downloads\`). That parent config probably references plugins this project doesn't have installed.

This project ships with two complementary guards against this:

1. **`postcss.config.js`** at the project root — explicitly empty `plugins: []`. Vite finds this first and stops searching.
2. **`css.postcss: {}`** in `vite.config.js` — tells Vite inline that there are no PostCSS plugins.

If you still hit the error, **delete or rename the stray parent config** (e.g. `C:\Users\<you>\Downloads\postcss.config.mjs`) — it doesn't belong to this project.

## Building a production bundle

```bash
npm run build
# Output: dist/  (pure static files)
```

The build produces:
- `dist/index.html`
- `dist/assets/index-*.js` (main bundle, ~29 KB gzipped)
- `dist/assets/jspdf.es.min-*.js` (lazy-loaded PDF export, ~118 KB gzipped)
- `dist/assets/xlsx-*.js` (lazy-loaded Excel export, ~143 KB gzipped)
- `dist/sw.js` (service worker, ~8 KB gzipped)
- `dist/manifest.webmanifest`
- `dist/icons/`

## Previewing the production build

```bash
npm run preview
# → http://localhost:4173/
```

## Deploying

The `dist/` folder is pure static files. Deploy it to any static host:

- **Vercel:** `vercel --prod` (auto-detected as a static site)
- **Netlify:** drag-and-drop the `dist/` folder or connect the repo
- **GitHub Pages:** push `dist/` to a `gh-pages` branch
- **Cloudflare Pages:** connect the repo, build command `npm run build`, output dir `dist`

**HTTPS is required for WebUSB** — Vercel, Netlify, Cloudflare Pages, and GitHub Pages all give you HTTPS by default.

---

## Offline guarantees

This app is audited to make **zero network requests at runtime**, so it works from the first load with no internet connection ever having been available:

| Dependency | Before | Now |
|---|---|---|
| UI font | Loaded from `fonts.googleapis.com` / `fonts.gstatic.com` (Inter) | Self-hosted via `@fontsource/jetbrains-mono`, bundled into the build, precached by the service worker. Used for all UI chrome (`--font-sans`); the receipt preview keeps its own separate system-monospace stack (`--font-mono`, unchanged) |
| Icons | `<link>` tag advertised "Material Symbols Outlined" web font | Was already rendered as inline SVG at runtime (`core/icons.js`) regardless — the web-font `<link>` and leftover `font-family` CSS were dead weight and have been removed |
| PDF export (jsPDF) | npm package, lazy-loaded chunk | Unchanged — already bundled locally, no CDN |
| Excel export (SheetJS/xlsx) | npm package, lazy-loaded chunk | Unchanged — already bundled locally, no CDN |
| Printing (WebUSB / browser print) | Local device APIs only | Unchanged — no network involved by design |
| Data persistence | `localStorage` | Unchanged — no backend, no API calls |
| Service worker | Precached app shell + runtime-cached Google Fonts | Precaches the entire app shell **including** the self-hosted font files; no runtime caching of any third-party origin remains, because there is no third-party origin left to call |

The only external URLs left anywhere in the app are plain `<a href>` links to `https://zadig.akeo.ie/` in the optional WinUSB setup guide (Settings → Printer → Setup Guide) — these are informational links a user may click, not resources the app loads or depends on to function.

**One manual step required:** run `npm install` once after pulling these changes so `@fontsource/jetbrains-mono` is downloaded into `node_modules` (this needs internet, same as any `npm install`). After that, `npm run build` produces a `dist/` folder that is 100% self-contained — deploy it once, and the terminal keeps working indefinitely with no connection at all.

---

## Differences from the original Flutter app

| Aspect | Flutter app | This port |
|--------|-------------|-----------|
| Framework | Flutter Web (Riverpod state, Material 3 widgets) | Vanilla HTML + ES modules (no framework) |
| Build | `flutter build web` | `vite build` |
| Bundle size (gzip) | ~1.5 MB (Flutter web engine) | ~29 KB main + ~261 KB lazy (jspdf + xlsx) |
| Storage | Hive boxes (no adapters) | localStorage (mirrors Hive box layout) |
| PWA | Custom offline_service_worker.js | vite-plugin-pwa (Workbox injectManifest) |
| WebUSB | Dart interop with `navigator.usb` | Native JS `navigator.usb` |
| PDF export | `pdf` + `printing` Dart packages | `jspdf` (lazy-loaded) |
| Excel export | `excel` Dart package | `xlsx` (SheetJS, lazy-loaded) |
| Icons | Material Icons (font) | Material Symbols Outlined (Google Fonts) |
| Typography | Google Fonts (Inter) | Self-hosted JetBrains Mono (`@fontsource/jetbrains-mono`) |
| Routing | Flutter Navigator (push/pop) | Hash-based router (`#/login`, `#/dashboard`, etc.) |
| WinUSB/Zadig docs | Brief mention in `WINDOWS_DESKTOP.md` | Full 10-step walkthrough at `#/settings/printer-setup` |

Feature parity: every Flutter feature listed in the original `README.md` is implemented. The Flutter-specific MySQL backend, Tauri Windows desktop wrapper, and report scheduler cron are deferred (they're separate from the POS app itself).

---

## License

Same as the upstream Raicilabs POS project.
