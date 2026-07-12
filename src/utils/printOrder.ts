import type { Order } from '../api/ordersApi';
import { STATUS_LABELS } from '../api/ordersApi';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const inr = (n: number | undefined | null): string =>
  n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const dateStr = (d?: string | Date | null): string =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

/**
 * Opens the browser print dialog with a printable invoice for the order.
 * From the dialog the admin can print or choose "Save as PDF" to download.
 */
export function printOrder(order: Order): void {
  const orderNo = order.orderNumber ?? order._id.slice(-6).toUpperCase();
  const isPaid = order.paymentStatus === 'COMPLETED';

  // Estimated services table
  const itemRows = order.items
    .map(
      (i, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(i.serviceName ?? i.name ?? 'Service')}</td>
        <td>${i.category === 'scheduled' ? 'Scheduled' : 'Instant'}</td>
        <td class="num">${i.quantity}</td>
        <td class="num">${inr(i.price)}</td>
        <td class="num">${inr((i.price ?? 0) * (i.quantity ?? 0))}</td>
      </tr>`,
    )
    .join('');

  // Itemized cloth breakdown (present once admin itemizes)
  const breakdown: any[] = (order as any).clothTypeBreakdown ?? [];
  const breakdownRows = breakdown
    .map(
      (b: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${esc(b.name ?? b.clothTypeName ?? b.clothTypeId ?? 'Item')}</td>
        <td class="num">${esc(b.quantity ?? '—')}</td>
        <td class="num">${b.rate != null ? inr(b.rate) : '—'}</td>
        <td class="num">${b.amount != null ? inr(b.amount) : '—'}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Order ${esc(orderNo)} — LaundryBrew</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 32px; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2453FF; padding-bottom: 16px; }
  .brand { font-size: 24px; font-weight: 800; color: #2453FF; }
  .brand small { display: block; font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px; }
  .orderno { text-align: right; }
  .orderno .no { font-size: 18px; font-weight: 800; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 6px; }
  .paid   { background: #dcfce7; color: #15803d; }
  .unpaid { background: #fee2e2; color: #b91c1c; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 18px 0; }
  .meta div { padding: 3px 0; }
  .meta b { color: #334155; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #2453FF; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .num { text-align: right; }
  th.num { text-align: right; }
  .totals { margin-top: 14px; margin-left: auto; width: 280px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 2px solid #0f172a; font-size: 16px; font-weight: 800; padding-top: 8px; margin-top: 4px; }
  .foot { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">🧺 LaundryBrew<small>Laundry &amp; Dry Cleaning Services</small></div>
    <div class="orderno">
      <div class="no">Order #${esc(orderNo)}</div>
      <div style="color:#64748b; font-size:12px; margin-top:2px;">Placed: ${dateStr(order.createdAt)}</div>
      <span class="badge ${isPaid ? 'paid' : 'unpaid'}">${isPaid ? '✓ PAID' : 'PAYMENT PENDING'}</span>
    </div>
  </div>

  <div class="meta">
    <div><b>Customer:</b> ${esc(order.customerName ?? '—')}</div>
    <div><b>Contact Number:</b> ${esc(order.customerPhone ?? '—')}</div>
    <div><b>Status:</b> ${esc(STATUS_LABELS[order.status] ?? order.status)}</div>
    <div><b>Payment:</b> ${esc(order.paymentStatus)}</div>
    <div><b>Pickup date:</b> ${dateStr(order.pickupDate)}</div>
    <div><b>Pickup slot:</b> ${esc(order.pickupSlot ?? '—')}${order.pickupTime ? ' · ' + esc(order.pickupTime) : ''}</div>
    <div><b>Delivery date:</b> ${dateStr((order as any).deliveryDate)}</div>
    <div><b>Delivery slot:</b> ${esc(order.deliverySlot ?? '—')}</div>
    <div style="grid-column: 1 / -1;"><b>Address:</b> ${esc(order.address ?? '—')}</div>
    ${order.deliveryPartnerName ? `<div><b>Delivery partner:</b> ${esc(order.deliveryPartnerName)}</div>` : ''}
    ${order.driverName ? `<div><b>Driver:</b> ${esc(order.driverName)}${order.driverPhone ? ' · ' + esc(order.driverPhone) : ''}</div>` : ''}
  </div>

  <h3>Services Ordered</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Service</th><th>Type</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${breakdownRows
    ? `<h3>Itemized Breakdown</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${breakdownRows}</tbody>
  </table>`
    : ''}

  <div class="totals">
    ${order.weightKg != null ? `<div><span>Weight</span><span>${esc(order.weightKg)} kg</span></div>` : ''}
    ${order.itemCount != null ? `<div><span>Total pieces</span><span>${esc(order.itemCount)}</span></div>` : ''}
    <div><span>Estimated total</span><span>${inr(order.totalAmount)}</span></div>
    <div class="grand"><span>${order.billAmount != null ? 'Final Bill' : 'Amount Due'}</span><span>${inr(order.billAmount ?? order.totalAmount)}</span></div>
  </div>

  <div class="foot">
    Generated on ${new Date().toLocaleString('en-IN')} · LaundryBrew Admin · This is a system-generated document.
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=840,height=900');
  if (!win) {
    alert('Please allow pop-ups to print/download the order.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the new window a beat to render before opening the print dialog.
  setTimeout(() => win.print(), 350);
}
