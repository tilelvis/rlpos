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

  async _build({ rangeStart, rangeEnd, title, dailyBreakdown = false }) {
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

    const summaryData = [
      [title],
      ['Generated', fmtDate(new Date(), 'dd/MM/yyyy HH:mm')],
      [''],
      ['Total Sales (KES)', Number(totalRevenue.toFixed(2))],
      ['Completed Orders', completed.length],
      ['Voided Orders', voided.length],
      ['Items Sold', totalItems],
      ['Average Ticket (KES)', Number(avgTicket.toFixed(2))],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ---- Sales (one row per order) ----
    const salesHeader = [
      'Order #', 'Date', 'Time', 'Taken By', 'Items', 'Total (KES)', 'Status',
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

    // ---- Daily breakdown (weekly reports only) ----
    if (dailyBreakdown) {
      const dailyHeader = ['Date', 'Completed Orders', 'Revenue (KES)'];
      const dailyData = [dailyHeader];
      for (let i = 0; i < 7; i++) {
        const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dOrders = completed.filter((o) => {
          const c = o.completedAt ? new Date(o.completedAt) : null;
          if (!c) return false;
          return c.getFullYear() === d.getFullYear() &&
                 c.getMonth() === d.getMonth() &&
                 c.getDate() === d.getDate();
        });
        const rev = dOrders.reduce((s, o) => s + o.total, 0);
        dailyData.push([
          fmtDate(d, 'EEE dd/MM'),
          dOrders.length,
          Number(rev.toFixed(2)),
        ]);
      }
      const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Breakdown');
    }

    // SheetJS writes to an ArrayBuffer when type:'array' is requested.
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(out);
  },
};
