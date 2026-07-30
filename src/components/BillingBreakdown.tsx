import React from 'react';
import type { Order } from '../api/ordersApi';

/**
 * Transparent line-item breakdown of an order's bill. Renders only the
 * pieces that actually apply (fee fields default to 0 and are hidden), and
 * falls back to nothing when the order predates the pricing engine — the
 * existing Amount row already covers that legacy case.
 */
export const BillingBreakdown: React.FC<{ order: Order }> = ({ order }) => {
  if (order.billAmount == null) return null;

  const baseAmount = order.calculatedAmount ?? order.totalAmount;

  const fees: { label: string; amount: number }[] = [];
  if (order.deliveryFee)    fees.push({ label: 'Delivery Fee', amount: order.deliveryFee });
  if (order.platformFee)    fees.push({ label: 'Platform Fee', amount: order.platformFee });
  if (order.convenienceFee) fees.push({ label: 'Convenience Fee', amount: order.convenienceFee });
  if (order.packagingFee)   fees.push({ label: 'Packaging Fee', amount: order.packagingFee });

  const discounts: { label: string; amount: number }[] = [];
  if (order.couponDiscountAmount) {
    discounts.push({
      label: order.couponCode ? `Coupon Applied (${order.couponCode})` : 'Coupon Applied',
      amount: order.couponDiscountAmount,
    });
  }
  if (order.firstOrderDiscountAmount) {
    discounts.push({ label: 'First Order Discount Applied', amount: order.firstOrderDiscountAmount });
  }
  if (order.walletDeductionAmount) {
    discounts.push({ label: 'Wallet Deduction', amount: order.walletDeductionAmount });
  }

  const hasExtras = fees.length > 0 || discounts.length > 0 || !!order.taxAmount || order.isManuallyAdjusted;
  // Nothing beyond the plain total — the existing Amount row already shows this; don't duplicate.
  if (!hasExtras) return null;

  const adjustmentDiff =
    order.isManuallyAdjusted && order.calculatedAmount != null
      ? Math.round((order.billAmount - order.calculatedAmount) * 100) / 100
      : 0;

  return (
    <div className="mt-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 space-y-1">
      <div className="flex justify-between text-slate-500">
        <span>Items Subtotal</span>
        <span>₹{baseAmount.toFixed(2)}</span>
      </div>
      {!!order.taxAmount && (
        <div className="flex justify-between text-slate-500">
          <span>GST</span>
          <span>₹{order.taxAmount.toFixed(2)}</span>
        </div>
      )}
      {fees.map((f) => (
        <div key={f.label} className="flex justify-between text-slate-500">
          <span>{f.label}</span>
          <span>₹{f.amount.toFixed(2)}</span>
        </div>
      ))}
      {discounts.map((d) => (
        <div key={d.label} className="flex justify-between text-green-700">
          <span>{d.label}</span>
          <span>-₹{d.amount.toFixed(2)}</span>
        </div>
      ))}
      {order.isManuallyAdjusted && (
        <div className="flex justify-between text-amber-700 font-semibold">
          <span>Admin Price Adjustment</span>
          <span>{adjustmentDiff >= 0 ? '+' : ''}₹{adjustmentDiff.toFixed(2)}</span>
        </div>
      )}
      <div className="border-t border-slate-200 dark:border-white/10 pt-1 mt-1 flex justify-between font-black text-slate-900 dark:text-white">
        <span>Total Payable</span>
        <span>₹{order.billAmount.toFixed(2)}</span>
      </div>
    </div>
  );
};
