// Receipt text + HTML generation (port of lib/core/services/receipt_service.dart).
//
// Builds plain-text receipt content for thermal printers — column-formatted
// so it looks identical when printed on a 58mm (32-col) or 80mm (48-col)
// thermal printer (monospaced). Every completed sale produces TWO copies
// from the same Receipt record: customer copy and business/kitchen copy.

import { PAPER_WIDTHS } from '../constants.js';

function padCols(paperWidth) {
  return PAPER_WIDTHS[paperWidth]?.columns ?? 32;
}

function center(text, cols) {
  if (text.length >= cols) return text;
  const pad = Math.floor((cols - text.length) / 2);
  return ' '.repeat(pad) + text;
}

function formatMoney(v) {
  const s = Math.abs(v).toFixed(2);
  const [intPart, frac] = s.split('.');
  const grouped = groupThousands(intPart);
  return (v < 0 ? '-' : '') + grouped + '.' + frac;
}

function groupThousands(s) {
  let out = '';
  let count = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    out = s[i] + out;
    count++;
    if (count % 3 === 0 && i !== 0) out = ',' + out;
  }
  return out;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatLineItem({ qty, name, amount, cols, emphasize = false }) {
  const left = qty == null ? name : `${qty} x ${name}`;
  const right = formatMoney(amount);
  const space = cols - left.length - right.length;
  if (space < 1) {
    const maxLeft = cols - right.length - 1;
    const trimmed =
      left.length > maxLeft ? left.slice(0, maxLeft - 1) + '\u2026' : left;
    return trimmed + ' '.repeat(cols - trimmed.length - right.length) + right;
  }
  return left + ' '.repeat(space) + right;
}

function formatKitchenLineItem({ qty, name, cols }) {
  const marker = '[ PREP ]';
  const left = `${qty}x ${name}`;
  const space = cols - left.length - marker.length;
  if (space < 1) {
    const maxLeft = cols - marker.length - 1;
    const trimmed =
      left.length > maxLeft ? left.slice(0, maxLeft - 1) + '\u2026' : left;
    return trimmed + ' '.repeat(cols - trimmed.length - marker.length) + marker;
  }
  return left + ' '.repeat(space) + marker;
}

function formatDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  let h = dt.getHours();
  const min = String(dt.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy} ${String(h).padStart(2, '0')}:${min} ${ampm}`;
}

export const ReceiptService = {
  /** Generate the plain-text receipt for the given receipt record and copy. */
  generate(r, copyType = 'customer') {
    const cols = padCols(r.paperWidth);
    const divider = '-'.repeat(cols);
    const buf = [];

    // Header — business data — same on both copies.
    buf.push(center((r.businessName || '').toUpperCase(), cols));
    if ((r.businessAddress || '').trim().length > 0) {
      buf.push(center(r.businessAddress, cols));
    }
    if ((r.businessPhone || '').trim().length > 0) {
      buf.push(center(`Tel: ${r.businessPhone}`, cols));
    }
    buf.push(divider);

    // The second copy is only a "kitchen" ticket when the business has
    // explicitly labelled it that way.
    const isKitchenCopy =
      copyType === 'business' &&
      (r.secondCopyLabel || '').trim().toUpperCase() === 'KITCHEN COPY';

    const banner =
      copyType === 'customer'
        ? 'CUSTOMER COPY'
        : isKitchenCopy
          ? 'KITCHEN ORDER COPY'
          : (r.secondCopyLabel || 'BUSINESS COPY').toUpperCase();
    buf.push(center(`*** ${banner} ***`, cols));
    buf.push(divider);

    buf.push(`Receipt No: ${r.receiptNumber}`);
    buf.push(`Date: ${formatDate(r.issuedAt)}`);
    buf.push(`Order: ${r.orderNumber}`);
    buf.push(divider);

    if (isKitchenCopy) {
      let itemCount = 0;
      for (const li of r.lineItems) {
        itemCount += li.quantity;
        buf.push(
          formatKitchenLineItem({
            qty: li.quantity,
            name: li.name,
            cols,
          }),
        );
      }
      buf.push(divider);
      buf.push(`Total items: ${itemCount}`);
    } else {
      for (const li of r.lineItems) {
        buf.push(
          formatLineItem({
            qty: li.quantity,
            name: li.name,
            amount: li.lineTotal,
            cols,
          }),
        );
      }
      buf.push(divider);
      buf.push(
        formatLineItem({
          qty: null,
          name: 'TOTAL',
          amount: r.total,
          cols,
          emphasize: true,
        }),
      );
    }
    buf.push(divider);

    if (copyType === 'customer') {
      const hasPaybill = (r.paybillNumber || '').trim().length > 0;
      const hasTill = (r.tillNumber || '').trim().length > 0;
      if (hasPaybill || hasTill) {
        buf.push(center('PAY VIA M-PESA', cols));
        if (hasPaybill) buf.push(`Paybill: ${r.paybillNumber}  Acc: ${r.orderNumber}`);
        if (hasTill) buf.push(`Till: ${r.tillNumber}`);
        buf.push(divider);
      }
      buf.push(`Served by: ${r.cashierName}`);
      buf.push(divider);

      const footer = (r.footerMessage || '').trim();
      if (footer.length > 0) {
        for (const line of footer.split('\n')) {
          buf.push(center(line, cols));
        }
      }
    } else {
      buf.push(center('STAFF', cols));
      buf.push(`Waiter: ${r.cashierName}`);
      buf.push(`Time: ${formatDate(r.issuedAt)}`);
      buf.push(divider);
      buf.push(center('INTERNAL COPY - NOT FOR CUSTOMER', cols));
    }

    return buf.join('\n');
  },

  /** Generate an HTML receipt for high-fidelity preview and browser
   *  print dialog. Uses a monospaced font at a width matching the paper. */
  toHtml(r, copyType = 'customer') {
    const widthPx = r.paperWidth === 'mm58' ? 220 : 320;
    const fontSizePx = r.paperWidth === 'mm58' ? 12 : 14;
    const escaped = escapeHtml(this.generate(r, copyType));
    const label = PAPER_WIDTHS[r.paperWidth]?.label ?? '58mm';
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${r.receiptNumber}</title>
<style>
  @page { size: ${label} auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Courier New", "Liberation Mono", monospace;
    font-size: ${fontSizePx}px;
    line-height: 1.45;
    color: #000;
    white-space: pre;
    width: ${widthPx}px;
    margin: 0 auto;
    padding: 8px 4px;
  }
  @media print {
    body { width: auto; }
  }
</style>
</head>
<body>${escaped}</body>
</html>`;
  },

  /** Generate a single HTML document containing BOTH copies, separated by
   *  a forced page break, so one print job produces both tickets. */
  toHtmlBothCopies(r) {
    const widthPx = r.paperWidth === 'mm58' ? 220 : 320;
    const fontSizePx = r.paperWidth === 'mm58' ? 12 : 14;
    const customer = escapeHtml(this.generate(r, 'customer'));
    const business = escapeHtml(this.generate(r, 'business'));
    const label = PAPER_WIDTHS[r.paperWidth]?.label ?? '58mm';
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt ${r.receiptNumber}</title>
<style>
  @page { size: ${label} auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .copy {
    font-family: "Courier New", "Liberation Mono", monospace;
    font-size: ${fontSizePx}px;
    line-height: 1.45;
    color: #000;
    white-space: pre;
    width: ${widthPx}px;
    margin: 0 auto;
    padding: 8px 4px;
  }
  .copy.second { page-break-before: always; }
  @media print {
    .copy { width: auto; }
  }
</style>
</head>
<body>
  <div class="copy">${customer}</div>
  <div class="copy second">${business}</div>
</body>
</html>`;
  },
};
