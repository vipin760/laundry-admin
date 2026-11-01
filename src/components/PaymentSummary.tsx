import React from 'react';
import type { Order } from '../api/ordersApi';

const inr = (n: number) => `₹${n.toFixed(2)}`;

const STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Paid',    cls: 'bg-green-50 text-green-700 border-green-200' },
  PENDING:   { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  FAILED:    { label: 'Failed',  cls: 'bg-red-50 text-red-700 border-red-200' },
};

/** What the gateway actually confirmed: status, transaction reference, amount received and when. */
export const PaymentSummary: React.FC<{ order: Order }> = ({ order }) => {
  const s = STATUS[order.paymentStatus] ?? STATUS.PENDING;
  const paid = order.paymentStatus === 'COMPLETED';
  return (
    <div className="mt-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-bold text-slate-700 dark:text-slate-200">Payment</span>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ${s.cls}`}>{s.label}</span>
      </div>
      {paid && (
        <>
          <div className="flex justify-between text-slate-500">
            <span>Transaction reference</span>
            <span className="font-mono text-slate-800 dark:text-slate-100">{order.razorpayPaymentId ?? '—'}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Amount paid</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {order.amountPaid != null ? inr(order.amountPaid) : order.billAmount != null ? inr(order.billAmount) : '—'}
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Paid at</span>
            <span className="text-slate-800 dark:text-slate-100">{order.paidAt ? new Date(order.paidAt).toLocaleString('en-IN') : '—'}</span>
          </div>
        </>
      )}
    </div>
  );
};
