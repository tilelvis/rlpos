// Reports page with two sub-tabs: Sales and Receipts.
//
// Sales: existing charts — daily sales (last 7 days), top items by
//   revenue, sales by cashier, plus Excel export buttons.
//
// Receipts: list of all receipts (one per completed order) with
//   per-receipt PDF export button. This is where PDF export lives now
//   that the receipt preview window no longer has it — cashier can
//   come back here later if they need a PDF copy of any receipt.
//
// Both sub-tabs are visible to admin/cashier only (the Reports tab
// itself is admin/cashier-only in the bottom nav, so this is enforced
// at the route level).

import { h, clear, formatMoney0, formatMoney, toast, formatDate } from '../../core/ui.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { ReceiptsProvider } from '../../core/providers/receipts.js';
import { ReportService } from '../../core/services/report_service.js';
import { PrinterService } from '../../core/services/printer_service.js';
import { FileDownloadService } from '../../core/services/file_download.js';
import { store, CHANNELS } from '../../core/store.js';
import { showReceiptModal } from '../orders/order-items-modal.js';

let _subtab = 'sales'; // 'sales' | 'receipts'

export function renderReports(content) {
  clear(content);

  const root = h('div', { style: { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' } }, []);
  const subtabs = h('div', { class: 'subtabs' }, [
    h('button', {
      class: `subtab ${_subtab === 'sales' ? 'active' : ''}`,
      onclick: () => { _subtab = 'sales'; draw(); },
    }, ['Sales']),
    h('button', {
      class: `subtab ${_subtab === 'receipts' ? 'active' : ''}`,
      onclick: () => { _subtab = 'receipts'; draw(); },
    }, ['Receipts']),
  ]);
  const body = h('div', { class: 'tab-content' }, []);
  root.append(subtabs, body);
  content.append(root);

  function draw() {
    subtabs.querySelectorAll('.subtab').forEach((b, i) => {
      b.classList.toggle('active', (_subtab === 'sales' && i === 0) || (_subtab === 'receipts' && i === 1));
    });
    clear(body);
    if (_subtab === 'sales') drawSalesTab(body);
    else drawReceiptsTab(body);
  }

  draw();

  const unsub = store.subscribe(CHANNELS.orders, draw);
  const unsubR = store.subscribe(CHANNELS.receipts, draw);
  const obs = new MutationObserver(() => {
    if (!content.contains(root)) {
      unsub();
      unsubR();
      obs.disconnect();
    }
  });
  obs.observe(content, { childList: true });
}

// ------------------ Sales sub-tab ------------------

function drawSalesTab(body) {
  const completed = OrdersProvider.completedOrders;
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0);

  // Daily Sales (last 7 days)
  const today = new Date();
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dayOrders = completed.filter((o) => {
      if (!o.completedAt) return false;
      const c = new Date(o.completedAt);
      return c.getFullYear() === d.getFullYear() &&
             c.getMonth() === d.getMonth() &&
             c.getDate() === d.getDate();
    });
    const total = dayOrders.reduce((s, o) => s + o.total, 0);
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daily.push({ label: labels[d.getDay()], value: total, count: dayOrders.length });
  }
  const maxDaily = daily.reduce((m, d) => (d.value > m ? d.value : m), 0);

  // Top items by revenue
  const itemTotals = new Map();
  for (const o of completed) {
    for (const it of o.items) {
      const cur = itemTotals.get(it.name) ?? { qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += it.lineTotal;
      itemTotals.set(it.name, cur);
    }
  }
  const topItems = [...itemTotals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // Sales by cashier
  const userTotals = new Map();
  for (const o of completed) {
    const cur = userTotals.get(o.cashierName) ?? { qty: 0, revenue: 0 };
    cur.qty += 1;
    cur.revenue += o.total;
    userTotals.set(o.cashierName, cur);
  }
  const topUsers = [...userTotals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // ---- Download reports card ----
  body.append(
    h('div', { class: 'card' }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Download Reports']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        'Each report is an Excel file with sales, staff KPIs, and best sellers.',
      ]),
      h('div', { class: 'row' }, [
        h('button', {
          class: 'btn btn--outlined',
          style: { flex: '1' },
          onclick: async () => {
            try {
              const bytes = await ReportService.buildDailyReport(new Date());
              const key = formatDate(new Date(), 'dd/MM/yyyy');
              FileDownloadService.downloadBytes(bytes, `sales-report-${key}.xlsx`, FileDownloadService.xlsxMimeType);
            } catch (e) {
              toast(`Report failed: ${e.message}`, { type: 'error' });
            }
          },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['today']),
          'Today',
        ]),
        h('button', {
          class: 'btn btn--outlined',
          style: { flex: '1' },
          onclick: async () => {
            try {
              const bytes = await ReportService.buildWeeklyReport(new Date());
              const key = formatDate(new Date(), 'dd/MM/yyyy');
              FileDownloadService.downloadBytes(bytes, `weekly-sales-report-${key}.xlsx`, FileDownloadService.xlsxMimeType);
            } catch (e) {
              toast(`Report failed: ${e.message}`, { type: 'error' });
            }
          },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['date_range']),
          'This Week',
        ]),
      ]),
    ]),
  );

  // ---- Summary ----
  body.append(
    h('div', { style: { height: '20px' } }, []),
    h('div', { class: 'kpi-grid' }, [
      h('div', { class: 'kpi-card', style: { flexDirection: 'column', alignItems: 'flex-start' } }, [
        h('div', { class: 'kpi-card__label' }, ['TOTAL REVENUE']),
        h('div', { style: { fontSize: '24px', fontWeight: '800', color: 'var(--primary)' } }, [formatMoney0(totalRevenue)]),
      ]),
      h('div', { class: 'kpi-card', style: { flexDirection: 'column', alignItems: 'flex-start' } }, [
        h('div', { class: 'kpi-card__label' }, ['COMPLETED ORDERS']),
        h('div', { style: { fontSize: '24px', fontWeight: '800' } }, [String(completed.length)]),
      ]),
    ]),
  );

  // ---- Daily sales chart ----
  body.append(
    h('div', { style: { height: '24px' } }, []),
    h('h2', { class: 'section-title', style: { margin: '0 0 12px' } }, ['Daily Sales (last 7 days)']),
    h('div', { class: 'card' }, [
      h('div', { style: { color: 'var(--muted)', fontSize: '12px' } }, [
        maxDaily > 0 ? `Peak day: ${formatMoney0(maxDaily)}` : 'No sales in the last 7 days.',
      ]),
      h('div', { class: 'report-bar-chart' },
        daily.map((b) =>
          h('div', { class: 'report-bar-chart__col' }, [
            h('div', {
              class: 'report-bar-chart__bar',
              style: { height: `${(maxDaily === 0 ? 2 : Math.max((b.value / maxDaily) * 100, 2))}%` },
            }),
            h('div', { class: 'report-bar-chart__label' }, [b.label]),
          ]),
        ),
      ),
    ]),
  );

  // ---- Top items ----
  body.append(
    h('div', { style: { height: '24px' } }, []),
    h('h2', { class: 'section-title', style: { margin: '0 0 8px' } }, ['Top Items by Revenue']),
  );
  if (topItems.length === 0) {
    body.append(emptyCard('No items sold yet.'));
  } else {
    const card = h('div', { class: 'card', style: { padding: '0' } }, []);
    for (const it of topItems.slice(0, 8)) {
      card.append(
        h('div', { class: 'list-item' }, [
          h('div', { class: 'list-item__main' }, [
            h('div', { class: 'list-item__title' }, [it.name]),
            h('div', { class: 'list-item__subtitle' }, [`${it.qty} sold`]),
          ]),
          h('div', { class: 'list-item__trailing' }, [formatMoney0(it.revenue)]),
        ]),
      );
    }
    body.append(card);
  }

  // ---- Sales by cashier ----
  body.append(
    h('div', { style: { height: '24px' } }, []),
    h('h2', { class: 'section-title', style: { margin: '0 0 8px' } }, ['Sales by Cashier']),
  );
  if (topUsers.length === 0) {
    body.append(emptyCard('No sales recorded yet.'));
  } else {
    const card = h('div', { class: 'card', style: { padding: '0' } }, []);
    for (const u of topUsers) {
      card.append(
        h('div', { class: 'list-item' }, [
          h('div', { class: 'list-item__avatar' }, [
            h('span', { class: 'icon material-symbols-outlined' }, ['person']),
          ]),
          h('div', { class: 'list-item__main' }, [
            h('div', { class: 'list-item__title' }, [u.name]),
            h('div', { class: 'list-item__subtitle' }, [`${u.qty} orders`]),
          ]),
          h('div', { class: 'list-item__trailing' }, [formatMoney0(u.revenue)]),
        ]),
      );
    }
    body.append(card);
  }
}

// ------------------ Receipts sub-tab ------------------

function drawReceiptsTab(body) {
  const receipts = ReceiptsProvider.receipts;

  body.append(
    h('div', { class: 'card' }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Receipts']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        'Tap a receipt to view its preview (and reprint if needed). Use the PDF button to download a copy for archival or email.',
      ]),
    ]),
  );

  if (receipts.length === 0) {
    body.append(
      h('div', { class: 'empty-state', style: { marginTop: '20px' } }, [
        'No receipts yet. Complete a sale to generate the first receipt.',
      ]),
    );
    return;
  }

  const card = h('div', { class: 'card', style: { marginTop: '12px', padding: '0' } }, []);
  for (const r of receipts) {
    const row = h('div', { class: 'list-item' }, [
      h('div', { class: 'list-item__avatar' }, [r.receiptNumber.substring(0, 3)]),
      h('div', { class: 'list-item__main' }, [
        h('div', { class: 'list-item__title' }, [
          h('strong', {}, [`#${r.receiptNumber}`]),
          h('span', { style: { color: 'var(--muted)', fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' } }, [r.orderNumber]),
        ]),
        h('div', { class: 'list-item__subtitle' }, [
          `${formatDate(r.issuedAt, 'dd/MM/yyyy hh:mm a')} · ${r.cashierName}` +
            (r.reprintCount > 0 ? ` · Reprinted ×${r.reprintCount}` : ''),
        ]),
      ]),
      h('div', { class: 'list-item__trailing', style: { color: 'var(--primary)' } }, [
        formatMoney(r.total),
      ]),
      h('button', {
        class: 'btn btn--outlined btn--sm',
        title: 'Download PDF copy',
        onclick: async (e) => {
          e.stopPropagation();
          try {
            await PrinterService.exportPdfBothCopies(r);
            toast(`PDF downloaded for receipt #${r.receiptNumber}`, { type: 'success' });
          } catch (err) {
            toast(`PDF failed: ${err.message}`, { type: 'error' });
          }
        },
      }, [
        h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '14px' } }, ['picture_as_pdf']),
        'PDF',
      ]),
    ]);
    // Tap anywhere on the row (except the PDF button) shows a read-only
    // items popup — not the print-preview page, which is reserved for
    // the live "complete sale" flow.
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      showReceiptModal(r);
    });
    card.append(row);
  }
  body.append(card);
}

function emptyCard(text) {
  return h('div', { class: 'card' }, [h('div', { class: 'empty-state' }, [text])]);
}
