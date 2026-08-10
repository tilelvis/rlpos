// Receipt preview & print screen (port of
// lib/features/receipts/receipt_preview_page.dart).
//
// Shown immediately after "Complete Sale". Displays a pixel-accurate
// monospaced preview of what will be printed — toggle between Customer
// Copy and Business/Kitchen Copy.
//
// Two print paths only (PDF export moved to Reports → Receipts):
//   1. Direct WebUSB ESC/POS  — Chrome/Edge/Opera only, no OS driver
//   2. Browser print dialog  — works everywhere
//
// After a successful print:
//   - Waiters are auto-logged-out (signature flow complete) and shown
//     a disappearing "You've raised X orders today" toast.
//   - Admin/cashier stay signed in so they can manage unpaid orders.

import { h, clear, mount, toast, formatMoney } from '../../core/ui.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { ReceiptService } from '../../core/services/receipt_service.js';
import { PrinterService } from '../../core/services/printer_service.js';
import { StorageService } from '../../core/services/storage.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { store, CHANNELS } from '../../core/store.js';
import { navigate } from '../../core/router.js';
import { AuthProvider } from '../../core/providers/auth.js';

export function renderReceiptPreview(receiptId) {
  const receipt = ReceiptsProvider.findById(receiptId);
  if (!receipt) {
    const err = h('div', { class: 'empty-state' }, ['Receipt not found.']);
    mount(err);
    return;
  }

  // The user who completed this sale — stashed by new-order.js before
  // navigating here. Used to decide post-print behaviour (auto-logout
  // for waiters, toast for waiters, stay-logged-in for admin/cashier).
  const saleUser = window.__lastSaleUser || AuthProvider.currentUser;
  const saleOrderId = window.__lastSaleOrderId || receipt.orderId;

  // Local UI state
  let _paper = receipt.paperWidth || 'mm58';
  let _previewCopy = 'customer';
  let _printing = false;
  let _postPrintHandled = false;

  // Listen to USB state changes.
  let _usbConnected = PrinterService.usbConnected;
  let _usbName = PrinterService.usbDeviceName;

  const root = h('div', { class: 'receipt-preview-page', style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' } }, []);

  const appbar = h('header', { class: 'appbar' }, []);
  const banner = h('div', { class: 'status-bar status-bar--ok' }, []);
  const usbBar = h('div', {}, []);
  const copyToggle = h('div', { class: 'status-bar status-bar--muted' }, []);
  const preview = h('div', { class: 'receipt-preview' }, []);
  const actionBar = h('div', {}, []);

  root.append(appbar, banner, usbBar, copyToggle, preview, actionBar);
  mount(root);

  const unsubUsb = PrinterService.onUsbState((state) => {
    _usbConnected = state.connected;
    _usbName = state.deviceName;
    drawUsbBar();
    drawActions();
  });

  const unsubReceipts = store.subscribe(CHANNELS.receipts, () => {
    const refreshed = ReceiptsProvider.findById(receiptId);
    if (refreshed) drawPreview(refreshed);
  });

  // Cleanup on navigate-away.
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      unsubUsb();
      unsubReceipts();
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  function drawAppbar() {
    clear(appbar);
    appbar.append(
      h('button', {
        class: 'btn btn--icon',
        'aria-label': 'Close',
        onclick: () => afterPrintCancel(),
      }, [h('span', { class: 'icon material-symbols-outlined' }, ['close'])]),
      h('div', { class: 'appbar__title' }, [`Receipt #${receipt.receiptNumber}`]),
      // Paper width toggle
      h('div', { class: 'row', style: { gap: '4px' } }, [
        h('button', {
          class: `chip ${_paper === 'mm58' ? 'active' : ''}`,
          onclick: () => { _paper = 'mm58'; drawAppbar(); drawPreview(); },
        }, ['58mm']),
        h('button', {
          class: `chip ${_paper === 'mm80' ? 'active' : ''}`,
          onclick: () => { _paper = 'mm80'; drawAppbar(); drawPreview(); },
        }, ['80mm']),
      ]),
    );
  }

  function drawBanner() {
    clear(banner);
    banner.append(
      h('span', { class: 'icon material-symbols-outlined' }, ['check_circle']),
      h('div', { class: 'status-bar__text' }, [
        `Sale complete · Receipt #${receipt.receiptNumber} · Total ${formatMoney(receipt.total)}`,
      ]),
    );
  }

  function drawUsbBar() {
    clear(usbBar);
    if (!PrinterService.usbSupported) return;
    if (_usbConnected) {
      usbBar.className = 'status-bar status-bar--info';
      usbBar.append(
        h('span', { class: 'icon material-symbols-outlined' }, ['usb']),
        h('div', { class: 'status-bar__text' }, [
          `USB printer connected: ${_usbName || 'Thermal Printer'}`,
        ]),
        h('button', {
          class: 'btn btn--text btn--sm',
          onclick: async () => {
            try {
              await PrinterService.disconnectUsbPrinter();
              toast('USB printer disconnected.', { type: 'info' });
            } catch (e) {
              toast(`Disconnect failed: ${e.message}`, { type: 'error' });
            }
          },
        }, ['Disconnect']),
      );
    } else {
      usbBar.className = 'status-bar status-bar--muted';
      usbBar.append(
        h('span', { class: 'icon material-symbols-outlined' }, ['usb_off']),
        h('div', { class: 'status-bar__text' }, [
          'No USB printer paired — using browser print dialog.',
        ]),
        h('button', {
          class: 'btn btn--text btn--sm',
          onclick: async () => {
            try {
              await PrinterService.connectUsbPrinter();
              toast(`USB printer paired: ${PrinterService.usbDeviceName || 'Thermal Printer'}`, { type: 'success' });
            } catch (e) {
              toast(`Failed to pair USB printer: ${e.message}`, { type: 'error' });
            }
          },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '14px' } }, ['link']),
          'Pair USB Printer',
        ]),
      );
    }
  }

  function drawCopyToggle() {
    clear(copyToggle);
    const secondLabel = (receipt.secondCopyLabel || 'Business Copy')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    copyToggle.append(
      h('button', {
        class: `chip ${_previewCopy === 'customer' ? 'active' : ''}`,
        onclick: () => { _previewCopy = 'customer'; drawCopyToggle(); drawPreview(); },
      }, ['Customer Copy']),
      h('button', {
        class: `chip ${_previewCopy === 'business' ? 'active' : ''}`,
        onclick: () => { _previewCopy = 'business'; drawCopyToggle(); drawPreview(); },
      }, [secondLabel]),
    );
  }

  function drawPreview(current = receipt) {
    clear(preview);
    const displayReceipt = current.copyWith
      ? current.copyWith({ paperWidth: _paper })
      : Object.assign(Object.create(Object.getPrototypeOf(current)), current, { paperWidth: _paper });
    const text = ReceiptService.generate(displayReceipt, _previewCopy);
    const paperEl = h('div', {
      class: `receipt-paper ${_paper === 'mm80' ? 'receipt-paper--80' : ''}`,
    }, [text]);
    preview.appendChild(paperEl);
  }

  function drawActions() {
    clear(actionBar);
    actionBar.className = 'action-bar';
    actionBar.append(
      h('div', { class: 'action-bar__hint', style: { width: '100%' } }, [
        'Prints both the Customer Copy and the internal copy together.',
      ]),
    );

    const displayReceipt = receipt.copyWith
      ? receipt.copyWith({ paperWidth: _paper })
      : Object.assign(Object.create(Object.getPrototypeOf(receipt)), receipt, { paperWidth: _paper });

    const browserBtn = h('button', { class: 'btn btn--outlined', style: { flex: '1' } }, [
      h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['print']),
      'Browser',
    ]);
    browserBtn.addEventListener('click', () => doPrint('browser', displayReceipt));

    if (_usbConnected) {
      const usbBtn = h('button', { class: 'btn btn--filled', style: { flex: '2' } }, [
        _printing ? h('span', { class: 'spinner' }, []) : h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['print']),
        _printing ? 'Printing…' : 'Print to USB',
      ]);
      usbBtn.addEventListener('click', () => doPrint('usb', displayReceipt));
      actionBar.append(browserBtn, usbBtn);
    } else {
      const bothBtn = h('button', { class: 'btn btn--filled', style: { flex: '2' } }, [
        _printing ? h('span', { class: 'spinner' }, []) : h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['print']),
        _printing ? 'Printing…' : 'Print Both Copies',
      ]);
      bothBtn.addEventListener('click', () => doPrint('browser', displayReceipt));
      actionBar.append(browserBtn, bothBtn);
    }
  }

  async function doPrint(method, displayReceipt) {
    if (_printing) return;
    _printing = true;
    drawActions();
    try {
      await StorageService.upsertReceipt(displayReceipt);
      await ReceiptsProvider.markReprinted(displayReceipt.id);

      // Schedule the post-print flow BEFORE calling print() — print()
      // is synchronous and blocks the JS event loop until the print
      // dialog closes (in real Chrome) or dismisses silently (in
      // headless Chromium). Either way, we don't want the post-print
      // navigation to depend on print() returning.
      setTimeout(() => afterPrintSuccess(), 1500);

      if (method === 'usb') {
        await PrinterService.printReceiptUsbBothCopies(displayReceipt);
        toast('Receipt printed via USB.', { type: 'success' });
      } else {
        await PrinterService.printReceiptBothCopiesBrowser(displayReceipt);
      }
    } catch (e) {
      toast(`${method === 'usb' ? 'USB' : 'Browser'} print failed: ${e.message}`, { type: 'error' });
      _printing = false;
      drawActions();
    }
  }

  /** Called after a successful print. Decides what to do based on the
   *  sale user's role:
   *    Waiter → auto-logout, show "X orders today" toast, navigate to dashboard.
   *    Admin/Cashier → stay logged in, navigate to dashboard.
   *    Guest (shouldn't happen — Complete Sale requires login) → just navigate. */
  function afterPrintSuccess() {
    if (_postPrintHandled) return;
    _postPrintHandled = true;

    if (saleUser && saleUser.role === 'waiter') {
      // Waiter: count their completed orders today, show toast, logout.
      const count = OrdersProvider.countByUserToday(saleUser.id);
      const msg = count === 1
        ? `You've raised 1 order today`
        : `You've raised ${count} orders today`;
      toast(msg, { type: 'success', duration: 4500 });
      AuthProvider.signOut();
      // Brief delay so the toast is visible before navigation.
      setTimeout(() => navigate('/dashboard'), 600);
      return;
    }

    // Admin/cashier: stay logged in, go to dashboard.
    navigate('/dashboard');
  }

  /** Called when user dismisses the preview without printing (close button). */
  function afterPrintCancel() {
    // If a waiter signed in to complete the sale but then cancelled the
    // print, still log them out (their signature was used to create the
    // receipt — they don't get to stay logged in without printing).
    if (saleUser && saleUser.role === 'waiter') {
      AuthProvider.signOut();
    }
    // Clear the stashed sale context.
    delete window.__lastSaleUser;
    delete window.__lastSaleOrderId;
    navigate('/dashboard');
  }

  // Initial draw
  drawAppbar();
  drawBanner();
  drawUsbBar();
  drawCopyToggle();
  drawPreview();
  drawActions();

  // Try silent reconnect on first build.
  if (PrinterService.usbSupported) {
    PrinterService.tryReconnectUsb().then((ok) => {
      if (ok) drawUsbBar();
    });
  }
}
