// WinUSB / Zadig printer setup walkthrough.
//
// Explains — step by step — how to replace the manufacturer's USB
// printer driver on Windows with WinUSB so Chrome can claim the device
// via WebUSB. Without this step, Chrome on Windows sees the printer
// as already claimed by the OS driver and WebUSB device pairing fails
// with "Unable to claim interface."
//
// Zadig: https://zadig.akeo.ie/

import { h, mount, toast } from '../../core/ui.js';
import { PrinterService } from '../../core/services/printer_service.js';
import { navigate } from '../../core/router.js';
import { usbPrinterConnectionCard } from './usb-printer-widget.js';

export function renderPrinterSetup() {
  const root = h('div', { class: 'receipt-preview-page' }, []);

  const appbar = h('header', { class: 'appbar' }, [
    h('button', {
      class: 'btn btn--icon',
      'aria-label': 'Back',
      onclick: () => navigate('/settings'),
    }, [h('span', { class: 'icon material-symbols-outlined' }, ['arrow_back'])]),
    h('div', { class: 'appbar__title' }, ['Printer Setup — WinUSB / Zadig']),
  ]);

  const content = h('div', { style: { padding: '20px', maxWidth: '760px', margin: '0 auto', width: '100%' } }, []);

  // Browser support indicator
  const supported = PrinterService.usbSupported;
  const supportBanner = supported
    ? h('div', { class: 'status-bar status-bar--ok', style: { marginBottom: '16px' } }, [
        h('span', { class: 'icon material-symbols-outlined' }, ['verified']),
        h('div', { class: 'status-bar__text' }, [
          'WebUSB is available in this browser — you can pair a thermal printer directly.',
        ]),
      ])
    : h('div', { class: 'status-bar status-bar--muted', style: { marginBottom: '16px' } }, [
        h('span', { class: 'icon material-symbols-outlined' }, ['warning']),
        h('div', { class: 'status-bar__text' }, [
          'WebUSB is NOT available in this browser. Switch to Chrome, Edge, or Opera to use direct USB printing. The browser print dialog (the OS driver path) still works fine.',
        ]),
      ]);

  content.append(
    supportBanner,

    h('h2', { class: 'section-title' }, ['Why Zadig / WinUSB?']),
    h('p', { style: { color: 'var(--muted)', lineHeight: '1.6' } }, [
      'On Windows, the printer manufacturer\'s driver usually ',
      h('strong', {}, ['claims the USB device']),
      ' the moment you plug it in. Chrome can\'t access a device the OS has already claimed, so WebUSB device pairing fails with "Unable to claim interface."',
    ]),
    h('p', { style: { color: 'var(--muted)', lineHeight: '1.6' } }, [
      'The fix is to replace the manufacturer\'s driver with ',
      h('strong', {}, ['WinUSB']),
      ' (or libusbK) — a generic USB driver that gives user-space applications (like Chrome) direct access to the device. ',
      h('a', { href: 'https://zadig.akeo.ie/', target: '_blank', rel: 'noopener' }, ['Zadig']),
      ' is the standard tool for this. It\'s free, signed, and widely used for exactly this purpose.',
    ]),
    h('div', { style: { background: 'rgba(243, 156, 18, 0.10)', padding: '12px 14px', borderRadius: '10px', margin: '12px 0', fontSize: '13px', color: 'var(--accent)' } }, [
      h('strong', {}, ['Note:']),
      ' Once you switch the driver to WinUSB, the printer will NOT appear in Windows\'s "Printers & scanners" list anymore — it\'s no longer an OS printer, just a raw USB device. That\'s expected: from this point, you print via the WebUSB path in this app, not via Windows Print Spooler. The browser print dialog path still works for any OTHER printer the OS knows about.',
    ]),

    h('h2', { class: 'section-title', style: { marginTop: '24px' } }, ['Step-by-step']),
    h('div', { class: 'steps' }, [
      step(1, 'Plug in the printer', [
        'Connect the thermal printer to a USB port on the POS PC. Power it on. Wait for Windows to recognise it (you may see a "device ready" notification).',
        'Most ESC/POS thermal printers (Epson TM-T20, Xprinter XP-58, Goojprt MPT-58, SNBC BK-T802, Zjiang ZJ-5890, etc.) work the same way.',
      ]),
      step(2, 'Download Zadig', [
        'Go to ',
        h('a', { href: 'https://zadig.akeo.ie/', target: '_blank', rel: 'noopener' }, ['https://zadig.akeo.ie/']),
        ' and download the latest Zadig executable (zadig-2.x.exe). No installation needed — just run it.',
      ]),
      step(3, 'Open Zadig as Administrator', [
        'Right-click the downloaded zadig-2.x.exe and choose ',
        h('strong', {}, ['"Run as administrator"']),
        '. Approve the UAC prompt. Zadig needs admin rights to install a driver.',
      ]),
      step(4, 'Select Options → List All Devices', [
        'In Zadig, click ',
        h('strong', {}, ['Options → List All Devices']),
        ' (top menu). This makes Zadig show every USB device, not just the ones without drivers.',
      ]),
      step(5, 'Pick the printer in the dropdown', [
        'Open the dropdown at the top of Zadig\'s main window. Look for your thermal printer by name — common entries:',
        h('ul', { style: { margin: '6px 0 6px 20px', paddingLeft: '0' } }, [
          h('li', {}, ['Epson: "TM-T20III" or "EPSON TM-T20III"']),
          h('li', {}, ['Xprinter: "USB Printing Support" or "XP-58IIH"']),
          h('li', {}, ['Goojprt/SNBC/Zjiang: "USB Printing Support" or model name']),
          h('li', {}, ['Generic: "USB Printing Support" (USB class 0x07 — printer class)']),
        ]),
        'If you see two entries (one for the printer, one for a USB-to-serial adapter), pick the one labelled "USB Printing Support" or with your printer\'s model name.',
      ]),
      step(6, 'Set the target driver to WinUSB', [
        'Below the dropdown, there are three boxes: Driver, Driver Version, and a green arrow. Use the up/down arrows on the Driver box to cycle through options until you see ',
        h('strong', {}, ['WinUSB']),
        ' (or libusbK — both work, but WinUSB is the modern recommendation).',
        h('div', { style: { background: 'var(--bg)', border: '1px solid var(--divider)', borderRadius: '8px', padding: '8px 10px', marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px' } }, [
          'Driver:    WinUSB (v6.1.7600.16385)\nTarget:    Replace driver',
        ]),
      ]),
      step(7, 'Click "Replace Driver"', [
        'Click the big green ',
        h('strong', {}, ['"Replace Driver"']),
        ' button. Zadig will install WinUSB over the existing driver. This takes about 5–15 seconds. You\'ll see a success popup when it\'s done.',
        h('div', { style: { background: 'rgba(243, 156, 18, 0.10)', border: '1px solid rgba(243, 156, 18, 0.30)', borderRadius: '8px', padding: '8px 10px', marginTop: '6px', fontSize: '12px', color: 'var(--accent)' } }, [
          h('strong', {}, ['Important:']),
          ' if Windows shows a "driver not digitally signed" warning, accept it anyway. WinUSB is included in Windows itself — Zadig just selects it as the active driver for this device.',
        ]),
      ]),
      step(8, 'Unplug & replug the printer', [
        'Disconnect the USB cable and reconnect it. This forces Windows to re-enumerate the device against the new driver. Wait 2–3 seconds for the device to be ready.',
      ]),
      step(9, 'Restart Chrome fully', [
        'Close ',
        h('strong', {}, ['all']),
        ' Chrome windows and reopen it (or just quit and restart the browser). WebUSB device permissions are cached per browser session; the new driver needs a fresh process to be picked up.',
      ]),
      step(10, 'Pair the printer from this app', [
        'Click "Pair USB Printer" below. Chrome will show a device picker — your thermal printer should appear in the list. Select it and click "Connect".',
        'If pairing succeeds, you\'ll see a green "Connected: <name>" banner here, and direct ESC/POS printing will work from the receipt preview screen.',
      ]),
    ]),

    h('h2', { class: 'section-title', style: { marginTop: '24px' } }, ['Pair the printer']),
    h('p', { style: { color: 'var(--muted)', lineHeight: '1.6' } }, [
      'Once Zadig has installed WinUSB, the printer is a raw USB device that Chrome can claim directly. Click the button below — it must be triggered by a user gesture, so it can\'t run automatically.',
    ]),

    h('div', { class: 'card', style: { marginTop: '8px' } }, [usbPrinterConnectionCard()]),

    h('h2', { class: 'section-title', style: { marginTop: '24px' } }, ['Troubleshooting']),
    h('div', { class: 'card' }, [
      h('div', { style: { marginBottom: '10px' } }, [
        h('strong', {}, ['"No devices" in the Chrome picker']),
        h('div', { style: { color: 'var(--muted)', fontSize: '13px', marginTop: '4px' } }, [
          'Either Zadig didn\'t install WinUSB (re-do steps 6–7), or Chrome wasn\'t fully restarted (step 9). Also check that the printer is powered on and the USB cable is firmly connected.',
        ]),
      ]),
      h('div', { style: { marginBottom: '10px' } }, [
        h('strong', {}, ['"Unable to claim interface"']),
        h('div', { style: { color: 'var(--muted)', fontSize: '13px', marginTop: '4px' } }, [
          'The device is still claimed by another driver. Re-do steps 5–8 — make sure you selected the printer (not some other USB device) in Zadig, and that WinUSB is the target driver.',
        ]),
      ]),
      h('div', { style: { marginBottom: '10px' } }, [
        h('strong', {}, ['Printer pairs but prints garbage']),
        h('div', { style: { color: 'var(--muted)', fontSize: '13px', marginTop: '4px' } }, [
          'The printer is most likely ESC/POS-compatible but on a different code page. The app uses Latin-1 / CP437 by default — that covers the standard ASCII character set used by receipts (English). For CJK / Arabic / etc. you\'d need to set the printer\'s code page explicitly (not supported in this build).',
        ]),
      ]),
      h('div', {}, [
        h('strong', {}, ['Reverting back to the manufacturer\'s driver']),
        h('div', { style: { color: 'var(--muted)', fontSize: '13px', marginTop: '4px' } }, [
          'Open Windows ',
          h('code', {}, ['Device Manager']),
          ' → find the printer (usually under "Universal Serial Bus devices" or "Printers") → right-click → ',
          h('strong', {}, ['Update driver']),
          ' → ',
          h('strong', {}, ['Browse my computer for drivers']),
          ' → ',
          h('strong', {}, ['Let me pick from a list']),
          ' → choose the manufacturer\'s driver. Then unplug & replug.',
        ]),
      ]),
    ]),

    h('div', { style: { marginTop: '24px', display: 'flex', justifyContent: 'space-between', gap: '12px' } }, [
      h('button', { class: 'btn btn--outlined', onclick: () => navigate('/settings') }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['arrow_back']),
        'Back to Settings',
      ]),
      h('a', {
        class: 'btn btn--outlined',
        href: 'https://zadig.akeo.ie/',
        target: '_blank',
        rel: 'noopener',
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['download']),
        'Download Zadig',
      ]),
    ]),
  );

  root.append(appbar, content);
  mount(root);
}

function step(n, title, children) {
  return h('div', { class: 'step' }, [
    h('div', { class: 'step__num' }, [String(n)]),
    h('div', { class: 'step__body' }, [
      h('h3', { class: 'step__title' }, [title]),
      h('div', { class: 'step__text' }, children),
    ]),
  ]);
}
