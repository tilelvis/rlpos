// Reports page (port of lib/features/reports/reports_page.dart).

import { h, clear, formatMoney0, toast, formatDate } from '../../core/ui.js';
import { OrdersProvider } from '../../core/providers/orders.js';
import { ReportService } from '../../core/services/report_service.js';
import { FileDownloadService } from '../../core/services/file_download.js';

export function renderReports(content) {
  clear(content);

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

  const root = h('div', { style: { padding: '16px', maxWidth: '900px', margin: '0 auto' } }, []);

  // ---- Download reports card ----
  root.append(
    h('div', { class: 'card' }, [
      h('h2', { class: 'section-title', style: { margin: '0 0 4px' } }, ['Download Reports']),
      h('p', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '0' } }, [
        'Each report is an Excel file with sales, staff KPIs, and best sellers. ' +
          'The admin is prompted to save the previous day\'s report at the start of each day; ' +
          'a copy of the weekly report also auto-downloads Sunday 9:00 PM as long as the app is open then.',
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
      h('div', { style: { marginTop: '8px' } }, [
        h('button', {
          class: 'btn btn--text',
          onclick: async () => {
            const picked = await pickDate();
            if (!picked) return;
            try {
              const bytes = await ReportService.buildDailyReport(picked);
              const key = formatDate(picked, 'dd/MM/yyyy');
              FileDownloadService.downloadBytes(bytes, `sales-report-${key}.xlsx`, FileDownloadService.xlsxMimeType);
            } catch (e) {
              toast(`Report failed: ${e.message}`, { type: 'error' });
            }
          },
        }, [
          h('span', { class: 'icon material-symbols-outlined', style: { fontSize: '18px' } }, ['calendar_month']),
          'Pick a different day…',
        ]),
      ]),
    ]),
  );

  // ---- Summary card ----
  root.append(
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
  root.append(
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
  root.append(
    h('div', { style: { height: '24px' } }, []),
    h('h2', { class: 'section-title', style: { margin: '0 0 8px' } }, ['Top Items by Revenue']),
  );
  if (topItems.length === 0) {
    root.append(emptyCard('No items sold yet.'));
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
    root.append(card);
  }

  // ---- Sales by cashier ----
  root.append(
    h('div', { style: { height: '24px' } }, []),
    h('h2', { class: 'section-title', style: { margin: '0 0 8px' } }, ['Sales by Cashier']),
  );
  if (topUsers.length === 0) {
    root.append(emptyCard('No sales recorded yet.'));
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
    root.append(card);
  }

  content.append(root);
}

function emptyCard(text) {
  return h('div', { class: 'card' }, [h('div', { class: 'empty-state' }, [text])]);
}

function pickDate() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'date', style: { position: 'fixed', opacity: '0', pointerEvents: 'none' } });
    document.body.appendChild(input);
    input.max = new Date().toISOString().slice(0, 10);
    input.min = '2020-01-01';
    input.addEventListener('change', () => {
      const v = input.value;
      input.remove();
      if (!v) return resolve(null);
      const [y, m, d] = v.split('-').map(Number);
      resolve(new Date(y, m - 1, d));
    });
    // Cancel if user closes picker without selecting.
    setTimeout(() => input.click(), 50);
  });
}
