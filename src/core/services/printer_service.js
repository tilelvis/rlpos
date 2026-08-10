// Printer strategy for POS receipts (port of lib/core/services/printer_service.dart).
//
// Three independent printing paths, all behind this single seam:
//
// 1. Browser print dialog (printReceipt / printReceiptBothCopiesBrowser)
//    — opens a hidden iframe with the receipt rendered as HTML sized to
//    58mm/80mm and triggers window.print(). The OS-level print driver
//    handles USB, network, and Bluetooth-via-OS printers. Works on every
//    browser.
//
// 2. Direct WebUSB ESC/POS (printReceiptUsb / printReceiptUsbBothCopies)
//    — sends raw ESC/POS commands straight to a thermal printer over
//    WebUSB, bypassing the OS print system entirely. No OS driver
//    needed. Chrome/Edge/Opera only, HTTPS or localhost only.
//
// 3. PDF export (exportPdf / exportPdfBothCopies) — for archival,
//    email, or printing later. Uses jsPDF (loaded lazily).
//
// Every completed sale should print BOTH the customer copy and the
// business/kitchen copy — use the `...BothCopies` methods for that.

import { ReceiptService } from './receipt_service.js';
import { EscPosBuilder } from './esc_pos_builder.js';
import { WebUsbPrinter } from './webusb_printer.js';
import { PAPER_WIDTHS } from '../constants.js';

class UsbConnectionState {
  constructor({ connected, deviceName = null }) {
    this.connected = connected;
    this.deviceName = deviceName;
  }
  static disconnected() {
    return new UsbConnectionState({ connected: false });
  }
  static connected(name) {
    return new UsbConnectionState({ connected: true, deviceName: name });
  }
}

// Singleton USB printer connection — once paired, the same device is
// reused for all subsequent direct prints in the session.
const _usb = new WebUsbPrinter();
const _usbListeners = new Set();

function notifyUsb(state) {
  for (const fn of _usbListeners) {
    try {
      fn(state);
    } catch (e) {
      console.error('[printer] usb state listener threw:', e);
    }
  }
}

// PDF export is dynamically imported so the main bundle stays small.
// jsPDF is loaded only when the user actually clicks "Export PDF".
let _jspdfPromise = null;
async function getJsPdf() {
  if (!_jspdfPromise) {
    _jspdfPromise = import('jspdf');
  }
  return _jspdfPromise;
}

export const PrinterService = {
  // ---- WebUSB state ----
  get usbSupported() {
    return WebUsbPrinter.isSupported;
  },
  get usbDeviceName() {
    return _usb.deviceName;
  },
  get usbConnected() {
    return _usb.isConnected;
  },

  /** Subscribe to USB connection state changes. Returns an unsubscribe fn. */
  onUsbState(fn) {
    _usbListeners.add(fn);
    return () => _usbListeners.delete(fn);
  },

  /** Prompt the user to pick a USB thermal printer. Must be called from a
   *  user gesture. */
  async connectUsbPrinter() {
    await _usb.requestAndConnect();
    notifyUsb(UsbConnectionState.connected(_usb.deviceName));
  },

  /** Attempt to re-acquire a previously-paired device without showing
   *  the picker. Safe to call on app startup; returns silently if no
   *  device is paired. */
  async tryReconnectUsb() {
    const ok = await _usb.tryReconnect();
    if (ok) {
      notifyUsb(UsbConnectionState.connected(_usb.deviceName));
    }
    return ok;
  },

  async disconnectUsbPrinter() {
    await _usb.disconnect();
    notifyUsb(UsbConnectionState.disconnected());
  },

  // ---- Direct WebUSB ESC/POS printing ----

  /** Send raw ESC/POS commands for one copy of the receipt directly to
   *  the paired USB thermal printer. Throws if no printer is connected. */
  async printReceiptUsb(receipt, { copyType = 'customer' } = {}) {
    const cols = PAPER_WIDTHS[receipt.paperWidth]?.columns ?? 32;
    const text = ReceiptService.generate(receipt, copyType);
    const bytes = EscPosBuilder.fromPlainText(text, { cols });
    await _usb.send(bytes);
  },

  /** Print both copies (customer then business) to the paired USB
   *  thermal printer as two separate tickets. */
  async printReceiptUsbBothCopies(receipt) {
    await this.printReceiptUsb(receipt, { copyType: 'customer' });
    await this.printReceiptUsb(receipt, { copyType: 'business' });
  },

  // ---- Browser print dialog ----

  /** Opens the browser print dialog with one copy of the receipt rendered
   *  as an HTML document sized for the chosen paper width. */
  async printReceipt(receipt, { copyType = 'customer' } = {}) {
    await this._printHtml(ReceiptService.toHtml(receipt, copyType));
  },

  /** Opens the browser print dialog with BOTH copies as a single 2-page
   *  print job. */
  async printReceiptBothCopiesBrowser(receipt) {
    await this._printHtml(ReceiptService.toHtmlBothCopies(receipt));
  },

  /** Shared iframe + window.print() plumbing.
   *
   *  IMPORTANT: the iframe must have real (non-zero) width/height. Chrome
   *  silently skips printing content from a `width:0;height:0` iframe —
   *  it never opens the print dialog. We keep it visually hidden with
   *  opacity:0 and a 1px height, and wait for onLoad (with a timeout
   *  fallback) rather than a fixed delay so we don't call print() before
   *  the receipt content has actually laid out. */
  async _printHtml(htmlContent) {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '340px';
    frame.style.height = '1px';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.srcdoc = htmlContent;

    const loaded = new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      frame.addEventListener('load', finish);
      // Fallback in case onLoad doesn't fire.
      setTimeout(finish, 800);
    });

    document.body.appendChild(frame);
    await loaded;
    // One more tick so layout settles before print() is invoked.
    await new Promise((r) => setTimeout(r, 80));

    try {
      frame.contentWindow?.print();
    } catch (e) {
      console.warn('[printer] window.print() failed:', e);
    }

    // Remove the iframe after a delay so the print dialog stays alive.
    setTimeout(() => {
      try {
        frame.remove();
      } catch {}
    }, 6000);
  },

  // ---- PDF export ----

  /** Render one copy of the receipt as a PDF and trigger the browser's
   *  save / open PDF flow. */
  async exportPdf(receipt, { copyType = 'customer' } = {}) {
    const { jsPDF } = await getJsPdf();
    const doc = this._buildPdfDoc(receipt, copyType, jsPDF);
    doc.save(`receipt_${receipt.receiptNumber}_${copyType}.pdf`);
  },

  /** Render BOTH copies as a single 2-page PDF. */
  async exportPdfBothCopies(receipt) {
    const { jsPDF } = await getJsPdf();
    const doc = this._buildPdfDoc(receipt, 'customer', jsPDF);
    doc.addPage();
    this._drawPdfPage(doc, receipt, 'business');
    doc.save(`receipt_${receipt.receiptNumber}.pdf`);
  },

  /** Build a jsPDF document sized for the thermal paper width whose
   *  height fits the content. Uses Courier (built-in, monospaced). */
  _buildPdfDoc(receipt, copyType, jsPDF) {
    const ptPerMm = 2.83464567; // 1mm = 2.83465pt
    const pageWidthMm = receipt.paperWidth === 'mm58' ? 58 : 80;
    const fontSize = receipt.paperWidth === 'mm58' ? 9 : 11;
    const lineHeight = fontSize * 1.4;

    const text = ReceiptService.generate(receipt, copyType);
    const lines = text.split('\n');

    const heightMm = (lines.length * lineHeight) / ptPerMm;
    const pageWidthPt = pageWidthMm * ptPerMm;
    const pageHeightPt = Math.min(Math.max(heightMm + 8, 40), 600) * ptPerMm;

    const doc = new jsPDF({
      unit: 'pt',
      format: [pageWidthPt, pageHeightPt],
      orientation: 'portrait',
    });

    this._drawPdfPage(doc, receipt, copyType, { fontSize, lineHeight, text, lines });
    return doc;
  },

  _drawPdfPage(doc, receipt, copyType, opts = {}) {
    const fontSize = opts.fontSize ?? (receipt.paperWidth === 'mm58' ? 9 : 11);
    const lineHeight = opts.lineHeight ?? fontSize * 1.4;
    const text = opts.text ?? ReceiptService.generate(receipt, copyType);
    const lines = opts.lines ?? text.split('\n');

    const ptPerMm = 2.83464567;
    const marginX = 2 * ptPerMm;
    const marginTop = 4 * ptPerMm;

    doc.setFont('Courier', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);

    let y = marginTop;
    for (const line of lines) {
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  },
};

export { UsbConnectionState };
