import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Check, Share2, ExternalLink, QrCode, Loader2, X, History } from 'lucide-react';
import { ordersApi, type Order } from '../api/ordersApi';
import { paymentLinksApi, type PaymentLink, type PaymentLinksResponse, type PaymentLinkStatus } from '../api/paymentLinksApi';

/** Order statuses in which a confirmed bill exists and can be collected (mirrors the backend gate). */
const PAYABLE = new Set(['ITEMIZED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']);
const POLL_MS = 8000;

const STATUS_STYLE: Record<PaymentLinkStatus, { label: string; cls: string }> = {
  pending:        { label: 'Awaiting payment',          cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed_attempt: { label: 'Last attempt failed — can retry', cls: 'bg-red-50 text-red-700 border-red-200' },
  paid:           { label: 'Paid',                      cls: 'bg-green-50 text-green-700 border-green-200' },
  expired:        { label: 'Expired',                   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled:      { label: 'Cancelled',                 cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  superseded:     { label: 'Replaced (bill changed)',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const inr = (n: number) => `₹${n.toFixed(2)}`;
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN') : '—');

const StatusChip: React.FC<{ status: PaymentLinkStatus }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUS_STYLE[status].cls}`}>
    {STATUS_STYLE[status].label}
  </span>
);

/**
 * Staff-facing payment link for an order: generate, copy/share, and show a QR
 * to the customer. The amount is whatever the backend priced from the order's
 * own final bill — this component never sends or computes one. Payment status
 * comes only from the backend (which learns it from the verified gateway
 * webhook), so nothing here can mark an order paid.
 */
export const PaymentLinkPanel: React.FC<{ order: Order; onOrderChange: (o: Order) => void }> = ({ order, onOrderChange }) => {
  const [active, setActive] = useState<PaymentLink | null>(null);
  const [history, setHistory] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const sawPaid = useRef(false);

  const eligible = order.billAmount != null && order.paymentStatus !== 'COMPLETED' && PAYABLE.has(order.status);

  const applyResponse = useCallback(
    async (res: PaymentLinksResponse) => {
      setActive(res.active);
      setHistory(res.history);
      setError(null);
      setLoading(false);
      // A payment landed (server-confirmed): pull the fresh order so status, transaction ref, amount and time all update.
      if (!sawPaid.current && res.history.some((l) => l.status === 'paid')) {
        sawPaid.current = true;
        onOrderChange(await ordersApi.getOrder(order._id));
      }
    },
    [order._id, onOrderChange],
  );

  const load = useCallback(
    () =>
      paymentLinksApi
        .get(order._id)
        .then(applyResponse)
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Could not load payment link');
          setLoading(false);
        }),
    [order._id, applyResponse],
  );

  // The parent keys this component by order id, so state starts fresh per order;
  // re-run when the bill changes so a replaced link shows up straight away.
  useEffect(() => {
    load();
  }, [order.billAmount, load]);

  // Watch for the customer's payment while a live link exists.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [active, load]);

  if (!eligible && history.length === 0) return null;

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await paymentLinksApi.createOrGet(order._id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create payment link');
    } finally {
      setCreating(false);
    }
  };

  const message = (l: PaymentLink) =>
    `LaundryBrew order ${order.orderNumber ?? ''}: please pay ${inr(l.amount)} using this secure link: ${l.shortUrl}`;

  const copy = async (l: PaymentLink) => {
    try {
      await navigator.clipboard.writeText(l.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed — select the link and copy it manually');
    }
  };

  const share = async (l: PaymentLink) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'LaundryBrew payment', text: message(l), url: l.shortUrl }); } catch { /* dismissed */ }
      return;
    }
    const phone = (order.customerPhone ?? '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message(l))}`, '_blank', 'noopener');
  };

  const past = history.filter((l) => l.id !== active?.id);

  return (
    <div className="mt-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><QrCode size={13} /> Payment link</span>
        {active && <StatusChip status={active.status} />}
      </div>

      {loading && <div className="text-slate-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</div>}

      {!loading && eligible && !active && (
        <>
          <p className="text-slate-500">
            Collect <b className="text-slate-800 dark:text-slate-100">{inr(order.billAmount!)}</b> with a link and QR code the customer can pay from any UPI/card app.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {creating && <Loader2 size={12} className="animate-spin" />}
            {history.length > 0 ? 'Generate new link' : 'Generate payment link'}
          </button>
        </>
      )}

      {active && (
        <div className="space-y-2">
          <div className="flex justify-between text-slate-500">
            <span>Amount on this link</span>
            <span className="font-black text-slate-900 dark:text-white">{inr(active.amount)}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={active.shortUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px]"
            />
            <button onClick={() => copy(active)} title="Copy link" className="p-1.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10">
              {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            </button>
            <button onClick={() => share(active)} title="Share link" className="p-1.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10">
              <Share2 size={13} />
            </button>
            <a href={active.shortUrl} target="_blank" rel="noopener noreferrer" title="Open link" className="p-1.5 rounded-md border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10">
              <ExternalLink size={13} />
            </a>
          </div>

          {active.qrCodeDataUrl && (
            <button onClick={() => setShowQr(true)} className="block mx-auto" title="Show to customer">
              <img src={active.qrCodeDataUrl} alt={`Payment QR for ${inr(active.amount)}`} className="w-32 h-32 rounded-lg border border-slate-200 bg-white p-1" />
              <span className="block text-center text-[10px] text-blue-600 font-bold mt-1">Tap to show full screen</span>
            </button>
          )}

          <div className="text-slate-400">Expires {fmt(active.expireBy)}</div>
          {active.failedAttempts > 0 && (
            <div className="text-red-600">
              {active.failedAttempts} failed attempt{active.failedAttempts > 1 ? 's' : ''}
              {active.lastFailureReason ? ` · ${active.lastFailureReason}` : ''} — the customer can retry on this link.
            </div>
          )}
        </div>
      )}

      {error && <div className="text-red-600">{error}</div>}

      {past.length > 0 && (
        <div>
          <button onClick={() => setShowHistory((v) => !v)} className="text-slate-500 font-semibold flex items-center gap-1">
            <History size={12} /> {showHistory ? 'Hide' : 'Show'} link history ({past.length})
          </button>
          {showHistory && (
            <ul className="mt-1.5 space-y-1.5">
              {past.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-2 border-t border-slate-200 dark:border-white/10 pt-1.5">
                  <div className="text-slate-500">
                    <div>{inr(l.amount)} · created {fmt(l.createdAt)}</div>
                    {l.status === 'paid' && <div className="text-green-700">Paid {inr(l.amountPaid ?? l.amount)} · {l.razorpayPaymentId} · {fmt(l.paidAt)}</div>}
                    {l.endedReason && l.status !== 'paid' && <div className="text-slate-400">{l.endedReason}</div>}
                  </div>
                  <StatusChip status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showQr && active?.qrCodeDataUrl && (
        <div className="fixed inset-0 z-80 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mt-2 -mr-2">
              <button onClick={() => setShowQr(false)} className="p-1 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>
            <p className="text-sm font-bold text-slate-800">Scan to pay</p>
            <p className="text-3xl font-black text-slate-900 my-1">{inr(active.amount)}</p>
            <p className="text-xs text-slate-500 mb-3">Order {order.orderNumber}</p>
            <img src={active.qrCodeDataUrl} alt="Payment QR code" className="w-full max-w-[280px] mx-auto" />
            <p className="text-[11px] text-slate-400 mt-3">Open any UPI or camera app and scan. This code collects exactly {inr(active.amount)}.</p>
          </div>
        </div>
      )}
    </div>
  );
};
