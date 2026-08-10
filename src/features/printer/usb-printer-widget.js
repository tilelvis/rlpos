// USB printer pairing widget (port of
// lib/features/printer/usb_printer_widget.dart).
//
// Self-contained USB thermal printer pairing card. Shows current
// connection state and Pair/Disconnect control. Used both in
// Settings > Printer (admin) and in the quick-access printer dialog
// reachable from the app bar.

import { h, toast, showModal } from '../../core/ui.js';
import { PrinterService } from '../../core/services/printer_service.js';
import { navigate } from '../../core/router.js';

export function usbPrinterConnectionCard() {
  const card = h('div', {}, []);
  let _connected = PrinterService.usbConnected;
  let _name = PrinterService.usbDeviceName;
  let _busy = false;
  const _supported = PrinterService.usbSupported;

  function refresh() {
    clear2(card);
    if (!_supported) {
      card.append(
        h('div', {
          style: {
            padding: '12px',
            background: 'rgba(107,99,87,0.10)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '8px',
          },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { color: 'var(--muted)', fontSize: '18px' } }, ['warning']),
          h('div', { style: { color: 'var(--muted)', fontSize: '12px', flex: '1' } }, [
            'WebUSB is not supported in this browser. Use Chrome, Edge, or Opera to pair a USB thermal printer. ',
            h('a', { href: '#/settings/printer-setup', onclick: (e) => { e.preventDefault(); navigate('/settings/printer-setup'); } }, ['Open Printer Setup →']),
          ]),
        ]),
      );
      return;
    }
    if (_connected) {
      card.append(
        h('div', { class: 'row' }, [
          h('span', { class: 'icon material-symbols-outlined', style: { color: 'var(--success)', fontSize: '18px' } }, ['usb']),
          h('div', { style: { flex: '1', fontWeight: '600', color: 'var(--success)' } }, [
            `Connected: ${_name || 'Thermal Printer'}`,
          ]),
          h('button', {
            class: 'btn btn--text btn--sm',
            onclick: async () => {
              try {
                await PrinterService.disconnectUsbPrinter();
                toast('Disconnected.', { type: 'info' });
              } catch (e) {
                toast(`Disconnect failed: ${e.message}`, { type: 'error' });
              }
            },
          }, ['Disconnect']),
        ]),
      );
    } else {
      card.append(
        h('button', {
          class: 'btn btn--tonal btn--block',
          onclick: async () => {
            _busy = true;
            refresh();
            try {
              await PrinterService.connectUsbPrinter();
              toast(`Paired: ${PrinterService.usbDeviceName || 'Thermal Printer'}`, { type: 'success' });
            } catch (e) {
              toast(`Pairing failed: ${e.message}`, { type: 'error' });
            } finally {
              _busy = false;
              refresh();
            }
          },
        }, [
          _busy ? h('span', { class: 'spinner spinner--dark' }, []) : h('span', { class: 'icon material-symbols-outlined' }, ['usb']),
          'Pair USB Printer',
        ]),
        h('div', { style: { marginTop: '8px', fontSize: '12px', color: 'var(--muted)' } }, [
          'First time? ',
          h('a', { href: '#/settings/printer-setup', onclick: (e) => { e.preventDefault(); navigate('/settings/printer-setup'); } }, ['Open Printer Setup']),
          ' to install WinUSB via Zadig.',
        ]),
      );
    }
  }

  refresh();
  PrinterService.onUsbState((state) => {
    _connected = state.connected;
    _name = state.deviceName;
    refresh();
  });

  // Try silent reconnect on first build.
  if (_supported) {
    PrinterService.tryReconnectUsb().then((ok) => { if (ok) refresh(); });
  }

  return card;
}

function clear2(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// Quick-access modal reachable from the app bar's printer icon.
export function showPrinterQuickAccessDialog() {
  const dlg = showModal({
    title: 'Printer Connection',
    size: 'sm',
    content: h('div', {}, [
      h('p', { style: { color: 'var(--muted)', fontSize: '13px', marginTop: '0' } }, [
        'Pair a WebUSB ESC/POS thermal printer for direct printing — no OS driver needed. ' +
          'Once paired, the browser remembers it and reconnects automatically.',
      ]),
      h('div', { style: { marginTop: '16px' } }, [usbPrinterConnectionCard()]),
    ]),
    actions: [
      h('button', { class: 'btn btn--text', onclick: () => dlg.close() }, ['Close']),
    ],
  });
}
