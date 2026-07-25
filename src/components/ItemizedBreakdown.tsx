import React from 'react';
import type { Order } from '../api/ordersApi';

const processingLabel = (v?: 'instant' | 'scheduled'): string =>
  v === 'scheduled' ? 'Scheduled' : v === 'instant' ? 'Instant' : '-';

/**
 * Read-only, saved-order view of the itemized garment breakdown — Service
 * Name and Processing Type come straight from `order.clothTypeBreakdown`
 * (snapshotted once at itemization time), never recomputed from the current
 * ClothType catalog. Shown for any order that has been itemized, regardless
 * of its current status, so operational staff (processing/QC/packing/
 * delivery) can always see what was actually billed and how it should be
 * routed — this is the one place both figures are guaranteed to still match
 * what the customer was billed even if the catalog changes later.
 */
export const ItemizedBreakdown: React.FC<{ order: Order }> = ({ order }) => {
  const items = order.clothTypeBreakdown ?? [];
  if (items.length === 0) return null;

  return (
    <div className="mt-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-white/10">
            <th className="text-left font-semibold px-3 py-2">Service</th>
            <th className="text-left font-semibold px-3 py-2">Item</th>
            <th className="text-left font-semibold px-3 py-2">Processing</th>
            <th className="text-right font-semibold px-3 py-2">Qty</th>
            <th className="text-right font-semibold px-3 py-2">Rate</th>
            <th className="text-right font-semibold px-3 py-2">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.serviceName ?? '-'}</td>
              <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white">{item.clothTypeName}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{processingLabel(item.serviceType)}</td>
              <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{item.quantity}</td>
              <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">₹{item.rate.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-white">₹{item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
