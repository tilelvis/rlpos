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
  }

  static get isSupported() {
    return navigatorUsb() !== null;
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
    const options = { filters: USB_PRINTER_FILTERS };
    const device = await usb.requestDevice(options);
    await this._openAndClaim(device);
  }

  /** Try to reconnect to a previously-granted device without showing
   *  the picker. Used on app startup to auto-resume a session. */
  async tryReconnect() {
    const usb = navigatorUsb();
    if (!usb) return false;
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

    // Pick the first configuration's first interface.
    const configs = device.configurations ?? [];
    if (configs.length > 0) {
      const cfg = configs[0];
      const cfgValue = cfg.configurationValue;
      try {
        await device.selectConfiguration(cfgValue);
      } catch {
        // Some printers are already configured; ignore.
      }

      const ifaces = cfg.interfaces ?? [];
      if (ifaces.length > 0) {
        const iface = ifaces[0];
        this._interfaceNumber = iface.interfaceNumber;
        await device.claimInterface(this._interfaceNumber);

        // Find a bulk OUT endpoint on the first alternate.
        const alternates = iface.alternates ?? [];
        if (alternates.length > 0) {
          const endpoints = alternates[0].endpoints ?? [];
          let preferred = null;
          for (const ep of endpoints) {
            if (ep.direction === 'out') {
              preferred = ep;
              break;
            }
          }
          const chosen = preferred ?? endpoints[0];
          if (chosen) {
            this._outEndpoint = chosen.endpointNumber;
          }
        }
      }
    }

    this._device = device;
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
   *  WebUSB has a 64KB limit per transfer. 4KB chunks are safe. */
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
      const result = await d.transferOut(this._outEndpoint, chunk);
      if (result.status !== 'ok') {
        throw new Error(
          `USB transfer failed: ${result.status} (wrote ${result.bytesWritten} bytes)`,
        );
      }
    }
  }
}
