// Builds downloadable Excel (.xlsx) sales reports straight from local
// order/receipt history. Port of lib/core/services/report_service.dart.
//
// Uses SheetJS (xlsx) — dynamically imported so the main bundle stays
// small. The Flutter app uses the `excel` Dart package; we use the
// equivalent npm `xlsx` package.

import { StorageService } from './storage.js';
import { ORDER_STATUS } from '../models/order.js';

let _xlsxPromise = null;
async function getXlsx() {
  if (!_xlsxPromise) {
    _xlsxPromise = import('xlsx');
  }
  return _xlsxPromise;
}

// ---- Backup data embedded in every report ----
// Each report doubles as a standalone backup: every order + receipt in
// its date range is JSON-serialized and tucked into an extra sheet. If
// local data is ever lost, re-uploading that same file restores it (see
// readBackupFile() + OrdersProvider.importBackup()).
const BACKUP_SHEET_NAME = 'RLPOS Backup';
const BACKUP_MARKER = 'RLPOS_BACKUP_V1';
const BACKUP_CHUNK_SIZE = 30000; // stay under Excel's ~32,767 char cell limit

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
  return chunks.length > 0 ? chunks : [''];
}

function fmtDate(d, pattern) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const HH = String(dt.getHours()).padStart(2, '0');
  const MM = String(dt.getMinutes()).padStart(2, '0');
  if (pattern === 'dd/MM/yyyy') return `${dd}/${mm}/${yyyy}`;
  if (pattern === 'HH:mm') return `${HH}:${MM}`;
  if (pattern === 'dd/MM/yyyy HH:mm') return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
  if (pattern === 'EEEE, dd MMM yyyy') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[dt.getDay()]}, ${dd} ${months[dt.getMonth()]} ${yyyy}`;
  }
  if (pattern === 'dd MMM') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dd} ${months[dt.getMonth()]}`;
  }
  if (pattern === 'dd MMM yyyy') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${dd} ${months[dt.getMonth()]} ${yyyy}`;
  }
  if (pattern === 'EEE') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dt.getDay()];
  }
  if (pattern === 'EEE dd/MM') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[dt.getDay()]} ${dd}/${mm}`;
  }
  return dt.toISOString();
}

export const ReportService = {
  async buildDailyReport(day) {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return this._build({
      rangeStart: start,
      rangeEnd: end,
      title: `Daily Sales Report — ${fmtDate(start, 'EEEE, dd MMM yyyy')}`,
    });
  },

  async buildMonthlyReport(anyDayInMonth) {
    const d = new Date(anyDayInMonth.getFullYear(), anyDayInMonth.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return this._build({
      rangeStart: d,
      rangeEnd: end,
      title: `Monthly Sales Report — ${months[d.getMonth()]} ${d.getFullYear()}`,
      dailyBreakdown: true,
      dailyBreakdownDays: Math.round((lastDay.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    });
  },

  async buildWeeklyReport(anyDayInWeek) {
    const d = new Date(anyDayInWeek.getFullYear(), anyDayInWeek.getMonth(), anyDayInWeek.getDate());
    const monday = new Date(d);
    monday.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    const end = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return this._build({
      rangeStart: monday,
      rangeEnd: end,
      title: `Weekly Sales Report — ${fmtDate(monday, 'dd MMM')} to ${fmtDate(lastDay, 'dd MMM yyyy')}`,
      dailyBreakdown: true,
    });
  },

  async _build({ rangeStart, rangeEnd, title, dailyBreakdown = false, dailyBreakdownDays = 7 }) {
    const XLSX = await getXlsx();

    const allOrders = StorageService.orders.filter((o) => {
      const c = new Date(o.createdAt);
      return c >= rangeStart && c < rangeEnd;
    });
    allOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const completed = allOrders.filter((o) => o.status === 'completed');
    const voided = allOrders.filter((o) => o.status === 'voided');
    const usersById = new Map(StorageService.users.map((u) => [u.id, u]));

    const wb = XLSX.utils.book_new();

    // ---- Summary ----
    const totalRevenue = completed.reduce((s, o) => s + o.total, 0);
    const totalItems = completed.reduce((s, o) => s + o.itemCount, 0);
    const avgTicket = completed.length === 0 ? 0 : totalRevenue / completed.length;

    // ---- Payment breakdown (cash vs M-Pesa vs still-unpaid) ----
    const cashOrders = completed.filter((o) => o.paid && o.paymentType === 'cash');
    const mpesaOrders = completed.filter((o) => o.paid && o.paymentType === 'mpesa');
    const unpaidOrders = completed.filter((o) => !o.paid);
    const cashTotal = cashOrders.reduce((s, o) => s + o.total, 0);
    const mpesaTotal = mpesaOrders.reduce((s, o) => s + o.total, 0);
    const unpaidTotal = unpaidOrders.reduce((s, o) => s + o.total, 0);

    const summaryData = [
      [title],
      ['Generated', fmtDate(new Date(), 'dd/MM/yyyy HH:mm')],
      [''],
      ['Total Sales (KES)', Number(totalRevenue.toFixed(2))],
      ['Completed Orders', completed.length],
      ['Voided Orders', voided.length],
      ['Items Sold', totalItems],
      ['Average Ticket (KES)', Number(avgTicket.toFixed(2))],
      [''],
      ['Payment Breakdown', 'Orders', 'Amount (KES)'],
      ['Cash', cashOrders.length, Number(cashTotal.toFixed(2))],
      ['M-Pesa', mpesaOrders.length, Number(mpesaTotal.toFixed(2))],
      ['Unpaid (outstanding)', unpaidOrders.length, Number(unpaidTotal.toFixed(2))],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ---- Sales (one row per order) ----
    const salesHeader = [
      'Order #', 'Date', 'Time', 'Taken By', 'Items', 'Total (KES)', 'Status', 'Payment Method',
    ];
    const salesData = [salesHeader];
    for (const o of allOrders) {
      salesData.push([
        o.orderNumber,
        fmtDate(o.createdAt, 'dd/MM/yyyy'),
        fmtDate(o.createdAt, 'HH:mm'),
        o.cashierName,
        o.itemCount,
        Number(o.total.toFixed(2)),
        o.statusLabel,
        o.status === 'completed' ? o.paymentLabel : '—',
      ]);
    }
    const wsSales = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

    // ---- Staff KPIs ----
    const byStaff = new Map();
    for (const o of allOrders) {
      let agg = byStaff.get(o.cashierId);
      if (!agg) {
        agg = { id: o.cashierId, name: o.cashierName, taken: 0, completed: 0, voided: 0, items: 0, value: 0 };
        byStaff.set(o.cashierId, agg);
      }
      agg.taken += 1;
      if (o.status === 'completed') {
        agg.completed += 1;
        agg.items += o.itemCount;
        agg.value += o.total;
      } else if (o.status === 'voided') {
        agg.voided += 1;
      }
    }
    const sortedStaff = [...byStaff.values()].sort((a, b) => b.value - a.value);
    const kpiHeader = [
      'Staff', 'Role', 'Orders Taken', 'Completed', 'Voided', 'Items Sold',
      'Value of Completed Orders (KES)',
    ];
    const kpiData = [kpiHeader];
    for (const agg of sortedStaff) {
      const role = usersById.get(agg.id)?.roleLabel ?? '—';
      kpiData.push([
        agg.name, role, agg.taken, agg.completed, agg.voided, agg.items,
        Number(agg.value.toFixed(2)),
      ]);
    }
    const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'Staff KPIs');

    // ---- Best Sellers ----
    const itemAgg = new Map();
    for (const o of completed) {
      for (const it of o.items) {
        let agg = itemAgg.get(it.name);
        if (!agg) {
          agg = { qty: 0, revenue: 0 };
          itemAgg.set(it.name, agg);
        }
        agg.qty += it.quantity;
        agg.revenue += it.lineTotal;
      }
    }
    const sortedItems = [...itemAgg.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    const bestHeader = ['Item', 'Qty Sold', 'Revenue (KES)'];
    const bestData = [bestHeader];
    for (const [name, agg] of sortedItems) {
      bestData.push([name, agg.qty, Number(agg.revenue.toFixed(2))]);
    }
    const wsBest = XLSX.utils.aoa_to_sheet(bestData);
    XLSX.utils.book_append_sheet(wb, wsBest, 'Best Sellers');

    // ---- Daily breakdown (weekly/monthly reports) ----
    if (dailyBreakdown) {
      const dailyHeader = ['Date', 'Completed Orders', 'Cash (KES)', 'M-Pesa (KES)', 'Unpaid (KES)', 'Revenue (KES)'];
      const dailyData = [dailyHeader];
      for (let i = 0; i < dailyBreakdownDays; i++) {
        const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dOrders = completed.filter((o) => {
          const c = o.completedAt ? new Date(o.completedAt) : null;
          if (!c) return false;
          return c.getFullYear() === d.getFullYear() &&
                 c.getMonth() === d.getMonth() &&
                 c.getDate() === d.getDate();
        });
        const rev = dOrders.reduce((s, o) => s + o.total, 0);
        const dCash = dOrders.filter((o) => o.paid && o.paymentType === 'cash').reduce((s, o) => s + o.total, 0);
        const dMpesa = dOrders.filter((o) => o.paid && o.paymentType === 'mpesa').reduce((s, o) => s + o.total, 0);
        const dUnpaid = dOrders.filter((o) => !o.paid).reduce((s, o) => s + o.total, 0);
        dailyData.push([
          fmtDate(d, dailyBreakdownDays > 7 ? 'dd MMM yyyy' : 'EEE dd/MM'),
          dOrders.length,
          Number(dCash.toFixed(2)),
          Number(dMpesa.toFixed(2)),
          Number(dUnpaid.toFixed(2)),
          Number(rev.toFixed(2)),
        ]);
      }
      const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Breakdown');
    }

    // ---- Backup data (machine-readable — powers "Restore from Backup") ----
    const receiptsInRange = StorageService.receipts.filter((r) =>
      allOrders.some((o) => o.id === r.orderId),
    );
    const backupJson = JSON.stringify({
      orders: allOrders.map((o) => o.toMap()),
      receipts: receiptsInRange.map((r) => r.toMap()),
    });
    const backupRows = [
      [BACKUP_MARKER, rangeStart.toISOString(), rangeEnd.toISOString(), new Date().toISOString(), allOrders.length],
      ...chunkString(backupJson, BACKUP_CHUNK_SIZE).map((c) => [c]),
    ];
    const wsBackup = XLSX.utils.aoa_to_sheet(backupRows);
    XLSX.utils.book_append_sheet(wb, wsBackup, BACKUP_SHEET_NAME);

    // SheetJS writes to an ArrayBuffer when type:'array' is requested.
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(out);
  },

  /** Read a previously-downloaded report's embedded backup data back out.
   *  Returns { generatedAt, rangeStart, rangeEnd, orders, receipts } —
   *  orders/receipts are plain maps; pass the whole result straight to
   *  OrdersProvider.importBackup() to write them. Throws a user-facing
   *  Error if the file has no backup sheet or the data is corrupted.
   *
   *  @param {Uint8Array|ArrayBuffer} bytes
   */
  async readBackupFile(bytes) {
    const XLSX = await getXlsx();
    let wb;
    try {
      wb = XLSX.read(bytes, { type: 'array' });
    } catch (e) {
      throw new Error('Could not read that file — is it a valid .xlsx report?');
    }
    const ws = wb.Sheets[BACKUP_SHEET_NAME];
    if (!ws) {
      throw new Error('This file has no restorable data — it may be an older report, or not one generated by this app.');
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const header = rows[0];
    if (!header || header[0] !== BACKUP_MARKER) {
      throw new Error('This file has no restorable data — it may be an older report, or not one generated by this app.');
    }
    const json = rows.slice(1).map((r) => (r && r[0]) || '').join('');
    let payload;
    try {
      payload = JSON.parse(json);
    } catch (e) {
      throw new Error('The backup data in this file is corrupted and could not be read.');
    }
    return {
      generatedAt: header[3] ?? null,
      rangeStart: header[1] ?? null,
      rangeEnd: header[2] ?? null,
      orders: Array.isArray(payload.orders) ? payload.orders : [],
      receipts: Array.isArray(payload.receipts) ? payload.receipts : [],
    };
  },
};
