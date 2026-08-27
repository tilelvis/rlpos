// WebUSB printer wrapper (port of lib/core/services/webusb_printer.dart).
//
// Browser support: Chrome, Edge, Opera, Android Chrome. NOT in Firefox
// or Safari — those users fall back to the browser print dialog.
// Requires HTTPS (or localhost) — WebUSB is disabled on plain HTTP.
//
// For Windows: thermal printer drivers from the manufacturer usually
// claim the USB device, which blocks Chrome from accessing it. Use Zadig
// (https://zadig.akeo.ie/) to replace the printer's driver with WinUSB
// (or libusbK) so Chrome can claim the device via WebUSB. The dedicated
// Printer Setup page in Settings walks through this end-to-end.
//
// STALL RECOVERY: many budget ESC/POS boards (Xprinter/Goojprt clones,
// etc.) briefly halt their bulk-OUT endpoint while the cutter motor is
// busy right after a cut command. The WebUSB spec requires calling
// device.clearHalt() to clear that before the next transferOut() will
// go through — without it, the endpoint stays wedged until the device
// is physically unplugged (a full bus reset). send() below detects a
// 'stall' result and clears + retries automatically so callers never
// see it.
//
// See: https://developer.mozilla.org/en-US/docs/Web/API/USB

import { USB_PRINTER_FILTERS } from '../constants.js';

function navigatorUsb() {
  try {
    if (typeof navigator === 'undefined') return null;
    return navigator.usb ?? null;
  } catch {
    return null;
  }
}

export class WebUsbPrinter {
  constructor() {
    this._device = null;
    this._outEndpoint = 1; // most ESC/POS printers use endpoint 1
    this._interfaceNumber = 0;
    this._onDisconnect = null; // set by PrinterService
    this._listenersAttached = false;
  }

  static get isSupported() {
    return navigatorUsb() !== null;
  }

  /** Register a callback fired when the currently-connected device is
   *  physically unplugged (fires the WebUSB 'disconnect' event) or a
   *  send() irrecoverably loses the device mid-transfer. Lets
   *  PrinterService keep its "connected" state truthful instead of
   *  showing Connected after the printer has actually dropped off. */
  onDisconnect(fn) {
    this._onDisconnect = fn;
  }

  _attachUsbEventListeners() {
    const usb = navigatorUsb();
    if (!usb || this._listenersAttached) return;
    this._listenersAttached = true;
    usb.addEventListener('disconnect', (event) => {
      if (this._device && event.device === this._device) {
        this._device = null;
        if (this._onDisconnect) {
          try {
            this._onDisconnect();
          } catch {}
        }
      }
    });
  }

  get deviceName() {
    const d = this._device;
    if (!d) return null;
    try {
      const p = d.productName;
      if (p && p.length > 0) return p;
    } catch {}
    try {
      const m = d.manufacturerName;
      if (m && m.length > 0) return m;
    } catch {}
    return null;
  }

  get isConnected() {
    return this._device !== null;
  }

  /** Prompt the user to pick a USB thermal printer. Must be called from
   *  a user gesture (button tap). Throws if user cancels or browser
   *  doesn't support WebUSB. */
  async requestAndConnect() {
    const usb = navigatorUsb();
    if (!usb) {
      throw new Error(
        'WebUSB is not supported in this browser. Use Chrome, Edge, or Opera.',
      );
    }
    this._attachUsbEventListeners();
    const options = { filters: USB_PRINTER_FILTERS };
    const device = await usb.requestDevice(options);
    await this._openAndClaim(device);
  }

  /** Try to reconnect to a previously-granted device without showing
   *  the picker. Used on app startup to auto-resume a session, and
   *  as a one-shot recovery attempt if send() finds the device gone. */
  async tryReconnect() {
    const usb = navigatorUsb();
    if (!usb) return false;
    this._attachUsbEventListeners();
    try {
      const devices = await usb.getDevices();
      if (devices.length === 0) return false;
      await this._openAndClaim(devices[0]);
      return true;
    } catch {
      return false;
    }
  }

  async _openAndClaim(device) {
    if (!device.opened) {
      await device.open();
    }

    // Walk every configuration/interface/alternate looking for a real
    // bulk-OUT endpoint — don't just assume interfaces[0] is right.
    // Composite printers (common on budget boards) can expose more
    // than one interface, and grabbing the wrong one "mostly works"
    // in a way that's hard to distinguish from a flaky connection.
    const found = this._findBulkOutEndpoint(device);
    if (!found) {
      throw new Error(
        'No printable (bulk-OUT) USB interface found on that device.',
      );
    }

    try {
      await device.selectConfiguration(found.configValue);
    } catch {
      // Some printers are already on the right configuration; ignore.
    }

    await device.claimInterface(found.interfaceNumber);

    this._interfaceNumber = found.interfaceNumber;
    this._outEndpoint = found.endpointNumber;
    this._device = device;

    // Some boards need a brief moment after claimInterface before
    // they'll accept the first transferOut without dropping it.
    await new Promise((r) => setTimeout(r, 120));
  }

  _findBulkOutEndpoint(device) {
    const configs = device.configurations ?? [];
    for (const cfg of configs) {
      const ifaces = cfg.interfaces ?? [];
      for (const iface of ifaces) {
        const alternates = iface.alternates ?? [];
        for (const alt of alternates) {
          const endpoints = alt.endpoints ?? [];
          const out = endpoints.find(
            (ep) => ep.direction === 'out' && ep.type === 'bulk',
          );
          if (out) {
            return {
              configValue: cfg.configurationValue,
              interfaceNumber: iface.interfaceNumber,
              endpointNumber: out.endpointNumber,
            };
          }
        }
      }
    }
    return null;
  }

  /** Disconnect and release the device. */
  async disconnect() {
    const d = this._device;
    if (!d) return;
    try {
      await d.releaseInterface(this._interfaceNumber);
    } catch {}
    try {
      await d.close();
    } catch {}
    this._device = null;
  }

  /** Send raw ESC/POS bytes to the printer. Chunks large transfers —
   *  WebUSB has a 64KB limit per transfer. 4KB chunks are safe.
   *
   *  Recovers from a stalled endpoint (common right after a cut
   *  command busies the cutter motor) by calling clearHalt() and
   *  retrying the same chunk once. If the device has actually gone
   *  away mid-transfer, clears local state and throws a clear error
   *  instead of leaving the app thinking it's still connected. */
  async send(bytes) {
    const d = this._device;
    if (!d) {
      throw new Error(
        'No USB printer connected. Call requestAndConnect() first.',
      );
    }
    const chunkSize = 4096;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, bytes.length);
      const chunk = bytes.slice(offset, end);
      await this._transferWithStallRecovery(d, chunk);
    }
  }

  async _transferWithStallRecovery(device, chunk, _retried = false) {
    let result;
    try {
      result = await device.transferOut(this._outEndpoint, chunk);
    } catch (e) {
      // The device object throws (rather than returning a status) when
      // it has actually disconnected mid-transfer. Clear local state
      // so the UI stops claiming we're still connected.
      this._device = null;
      if (this._onDisconnect) {
        try {
          this._onDisconnect();
        } catch {}
      }
      throw new Error(
        `USB printer disconnected during printing: ${e.message || e}. Reconnect and try again.`,
      );
    }

    if (result.status === 'stall') {
      if (_retried) {
        throw new Error(
          'USB transfer stalled twice in a row — the printer may be busy (still cutting), out of paper, or its cover is open.',
        );
      }
      try {
        await device.clearHalt('out', this._outEndpoint);
      } catch {}
      await this._transferWithStallRecovery(device, chunk, true);
      return;
    }

    if (result.status !== 'ok') {
      throw new Error(
        `USB transfer failed: ${result.status} (wrote ${result.bytesWritten} bytes)`,
      );
    }
  }
}
