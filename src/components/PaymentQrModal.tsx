import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Loader2, QrCode, RefreshCw, X, AlertCircle, Ban } from 'lucide-react';
import type { Order } from '../api/ordersApi';
import { paymentQrApi, type PaymentQr, type QrOrderSummary } from '../api/paymentQrApi';
import { useOrderSiren } from '../context/OrderSirenContext';

const POLL_MS = 4000;
const AUTO_CLOSE_AFTER_PAID_MS = 4000;

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Shows the dynamic UPI QR for one order to the customer at the door.
 *
 * Nothing here decides whether the order is paid — the modal only *displays*
 * what the server reports. A payment is confirmed by the backend (signed
 * webhook / direct Razorpay lookup); this modal learns about it from the
 * realtime socket event and a 4s poll of the verified-status endpoint, and
 * then flips to the success state on its own.
 */
export const PaymentQrModal: React.FC<{
  order: Order;
  onClose: () => void;
  /** Called once the server confirms the payment, so the parent can refresh its copy of the order. */
  onPaid: () => void;
}> = ({ order, onClose, onPaid }) => {
  const [qr, setQr] = useState<PaymentQr | null>(null);
  const [summary, setSummary] = useState<QrOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const paidNotified = useRef(false);

  const { lastPaymentEvent } = useOrderSiren();

  const applyState = useCallback((nextQr: PaymentQr | null, nextSummary?: QrOrderSummary) => {
    setQr(nextQr);
    if (nextSummary) setSummary(nextSummary);
    if (nextQr) setRemaining(nextQr.secondsRemaining);
    const paid = nextQr?.status === 'PAID' || nextSummary?.paymentStatus === 'COMPLETED';
    if (paid && !paidNotified.current) {
      paidNotified.current = true;
      onPaid();
    }
  }, [onPaid]);

  // Generate (idempotent — reuses the live QR if one exists) on open.
  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await paymentQrApi.generate(order._id);
      applyState(res.qr);
    } catch (e) {
      setError(errMsg(e, 'Could not generate the payment QR.'));
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, [order._id, applyState]);

  useEffect(() => { generate(); }, [generate]);

  const refresh = useCallback(async () => {
    try {
      const res = await paymentQrApi.get(order._id);
      applyState(res.qr, res.order);
    } catch {
      /* transient — the next poll or socket event retries; never show a stale "paid" */
    }
  }, [order._id, applyState]);

  // Poll the verified status while a QR is live (covers a dropped socket).
  useEffect(() => {
    if (qr?.status !== 'ACTIVE') return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [qr?.status, refresh]);

  // Realtime: refetch the instant the server says something changed for this order.
  useEffect(() => {
    if (lastPaymentEvent && lastPaymentEvent.orderId === order._id) refresh();
  }, [lastPaymentEvent, order._id, refresh]);

  // Local countdown tick (display only — expiry itself is decided server-side).
  useEffect(() => {
    if (qr?.status !== 'ACTIVE') return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [qr?.status]);

  // Reaching 0 locally: ask the server for the truth rather than assuming.
  useEffect(() => {
    if (qr?.status === 'ACTIVE' && remaining === 0) {
      const t = setTimeout(refresh, 1500);
      return () => clearTimeout(t);
    }
  }, [remaining, qr?.status, refresh]);

  const isPaid = qr?.status === 'PAID' || summary?.paymentStatus === 'COMPLETED';

  // Auto-close shortly after success.
  useEffect(() => {
    if (!isPaid) return;
    const t = setTimeout(onClose, AUTO_CLOSE_AFTER_PAID_MS);
    return () => clearTimeout(t);
  }, [isPaid, onClose]);

  const closeQr = async () => {
    setBusy(true);
    try {
      await paymentQrApi.close(order._id, 'closed by staff');
      await refresh();
      onClose();
    } catch (e) {
      setError(errMsg(e, 'Could not close the QR.'));
    } finally {
      setBusy(false);
    }
  };

  const amount = qr?.amount ?? order.billAmount ?? order.totalAmount;
  const orderLabel = `#${order.orderNumber ?? order._id.slice(-6).toUpperCase()}`;
  const expired = qr?.status === 'EXPIRED' || qr?.status === 'CLOSED';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Payment QR">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-[#141414] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-blue-600" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payment QR</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">Order {orderLabel}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-colors">
            <X size={16} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col items-center text-center">
          {/* Order facts — always visible */}
          <div className="w-full flex items-center justify-between text-xs mb-4">
            <span className="text-slate-500">{order.customerName ?? 'Customer'}</span>
            <span className="text-slate-400">{order.customerPhone ?? ''}</span>
          </div>

          {loading && (
            <div className="py-16 flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={28} />
              <span className="text-xs">Generating secure QR…</span>
            </div>
          )}

          {!loading && error && !qr && (
            <div className="py-6 flex flex-col items-center gap-3">
              <AlertCircle className="text-red-500" size={32} />
              <p className="text-sm text-red-600 font-semibold">{error}</p>
              <button onClick={generate} disabled={busy}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1.5">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Try again
              </button>
            </div>
          )}

          {/* Paid */}
          {!loading && isPaid && (
            <div className="py-4 flex flex-col items-center gap-2" role="status">
              <CheckCircle2 className="text-green-500" size={56} />
              <p className="text-lg font-black text-green-700">Payment Successful</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{money(amount)}</p>
              <dl className="mt-2 w-full text-left text-xs rounded-xl bg-green-50 border border-green-200 divide-y divide-green-100">
                <div className="flex justify-between px-3 py-2"><dt className="text-green-700">Method</dt><dd className="font-bold text-green-900">{qr?.paymentMethod ?? summary?.paymentMethod ?? 'UPI'}</dd></div>
                <div className="flex justify-between px-3 py-2"><dt className="text-green-700">Reference</dt><dd className="font-mono font-bold text-green-900 break-all text-right ml-3">{qr?.transactionId ?? summary?.paymentTransactionId ?? '—'}</dd></div>
                <div className="flex justify-between px-3 py-2"><dt className="text-green-700">Paid at</dt><dd className="font-bold text-green-900">{(qr?.paidAt ?? summary?.paymentCompletedAt) ? new Date((qr?.paidAt ?? summary?.paymentCompletedAt)!).toLocaleString('en-IN') : '—'}</dd></div>
              </dl>
              <p className="text-[11px] text-slate-400 mt-1">Closing automatically…</p>
            </div>
          )}

          {/* Live QR */}
          {!loading && !isPaid && qr?.status === 'ACTIVE' && (
            <>
              <div className="rounded-2xl border-2 border-slate-100 p-3 bg-white">
                {qr.imageUrl
                  ? <img src={qr.imageUrl} alt={`UPI QR for ${money(qr.amount)}`} className="w-60 h-60 object-contain" />
                  : <div className="w-60 h-60 flex items-center justify-center text-xs text-slate-500 break-all p-3">{qr.upiUri}</div>}
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{money(qr.amount)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Scan with any UPI app to pay</p>

              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${remaining <= 60 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <Clock size={12} /> Expires in {formatCountdown(remaining)}
              </div>
              <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Awaiting payment — this updates by itself
              </p>
              <p className="mt-2 text-[10px] font-mono text-slate-400 break-all">{qr.paymentReference}</p>

              <button onClick={closeQr} disabled={busy}
                className="mt-4 text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 disabled:opacity-50">
                <Ban size={12} /> Cancel this QR
              </button>
            </>
          )}

          {/* Expired / closed */}
          {!loading && !isPaid && expired && (
            <div className="py-4 flex flex-col items-center gap-3">
              <Clock className="text-amber-500" size={40} />
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {qr?.status === 'EXPIRED' ? 'This QR has expired' : 'This QR was closed'}
              </p>
              <p className="text-xs text-slate-500">No payment was received. Generate a fresh QR to continue.</p>
              {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
              <button onClick={generate} disabled={busy}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1.5">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate QR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
