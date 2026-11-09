import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, CreditCard, Loader2, QrCode, RefreshCw } from 'lucide-react';
import type { Order } from '../api/ordersApi';
import { paymentQrApi, QR_ELIGIBLE_STATUSES, type PaymentEventRow, type PaymentQr } from '../api/paymentQrApi';
import { PaymentQrModal } from './PaymentQrModal';

const money = (n?: number) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN') : '—');

/** Display label for the payment state — paymentStatus stays the source of truth; the QR state only refines "pending". */
function paymentLabel(order: Pick<Order, 'paymentStatus' | 'paymentQrStatus'>): { text: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (order.paymentStatus === 'COMPLETED') return { text: 'Paid', tone: 'green' };
  if (order.paymentStatus === 'FAILED') return { text: 'Payment Failed', tone: 'red' };
  if (order.paymentQrStatus === 'QR_GENERATED') return { text: 'Awaiting Payment (QR)', tone: 'amber' };
  if (order.paymentQrStatus === 'EXPIRED') return { text: 'QR Expired', tone: 'red' };
  return { text: 'Payment Pending', tone: 'slate' };
}

const TONES = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
} as const;

export const PaymentBadge: React.FC<{ order: Pick<Order, 'paymentStatus' | 'paymentQrStatus'> }> = ({ order }) => {
  const { text, tone } = paymentLabel(order);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${TONES[tone]}`}>
      {tone === 'green' ? <CheckCircle2 size={11} /> : tone === 'amber' ? <Clock size={11} /> : <CreditCard size={11} />} {text}
    </span>
  );
};

/**
 * Payment section of the order detail panel: current state, the delivery-time
 * "Generate Payment QR" action (state-aware), payment details once paid, and
 * the QR/transaction history.
 */
export const OrderPaymentCard: React.FC<{
  order: Order;
  /** Refresh the parent's copy of the order (after a QR is generated or paid). */
  onChanged: () => void;
}> = ({ order, onChanged }) => {
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ qrs: PaymentQr[]; events: PaymentEventRow[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isPaid = order.paymentStatus === 'COMPLETED';
  const amount = order.billAmount ?? order.totalAmount;
  const eligible =
    !isPaid &&
    order.status !== 'CANCELLED' &&
    (QR_ELIGIBLE_STATUSES as readonly string[]).includes(order.status) &&
    !!order.billAmount && order.billAmount > 0;

  const action =
    order.paymentQrStatus === 'QR_GENERATED' ? 'Show Payment QR'
    : order.paymentQrStatus === 'EXPIRED' || order.paymentQrStatus === 'CLOSED' ? 'Regenerate Payment QR'
    : 'Generate Payment QR';

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await paymentQrApi.history(order._id));
    } catch (e) {
      setHistoryError(e instanceof Error && e.message ? e.message : 'Could not load payment history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [order._id]);

  // Reload whenever the panel is open and the order's payment state moves.
  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, order.paymentStatus, order.paymentQrStatus, loadHistory]);

  return (
    <div className="rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <CreditCard size={14} /> Payment
        </div>
        <PaymentBadge order={order} />
      </div>

      <div className="px-4 py-3 space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-slate-500">Payable amount</span><span className="font-bold text-slate-900 dark:text-white">{money(amount)}</span></div>

        {isPaid && (
          <>
            <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-semibold">{order.paymentMethod ?? (order.paymentChannel === 'ONLINE' ? 'Online' : '—')}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Transaction</span><span className="font-mono font-semibold break-all text-right">{order.paymentTransactionId ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid at</span><span className="font-semibold">{when(order.paymentCompletedAt)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Collected via</span><span className="font-semibold">{order.paymentChannel === 'QR' ? 'Delivery QR' : 'In-app checkout'}</span></div>
          </>
        )}

        {eligible && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
          >
            {action.startsWith('Regen') ? <RefreshCw size={15} /> : <QrCode size={15} />} {action}
          </button>
        )}

        {!isPaid && !eligible && order.status !== 'CANCELLED' && (
          <p className="text-[11px] text-slate-400">
            A payment QR becomes available once the order is being processed and the bill is confirmed.
          </p>
        )}

        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between pt-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <span>Payment details &amp; transaction history</span>
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showHistory && (
          <div className="pt-1 space-y-3">
            {historyLoading && <div className="flex items-center gap-1.5 text-slate-400"><Loader2 size={12} className="animate-spin" /> Loading…</div>}
            {historyError && <p className="text-red-600">{historyError}</p>}
            {history && (
              <>
                <div>
                  <p className="font-bold text-slate-600 mb-1">QR attempts</p>
                  {history.qrs.length === 0 && <p className="text-slate-400">No QR generated yet.</p>}
                  {history.qrs.map((q) => (
                    <div key={q.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-mono text-[10px] text-slate-500">{q.paymentReference}</p>
                        <p className="text-[10px] text-slate-400">{when(q.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{money(q.amount)}</p>
                        <p className={`text-[10px] font-bold ${q.status === 'PAID' ? 'text-green-600' : q.status === 'ACTIVE' ? 'text-amber-600' : 'text-slate-400'}`}>{q.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-bold text-slate-600 mb-1">Audit trail</p>
                  {history.events.length === 0 && <p className="text-slate-400">No payment events yet.</p>}
                  {history.events.map((e) => (
                    <div key={e._id} className="flex items-start justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-semibold text-slate-700">{e.eventType}</p>
                        <p className="text-[10px] text-slate-400">{e.source} · {when(e.createdAt)}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 text-right">{e.outcome.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <PaymentQrModal
          order={order}
          onClose={() => { setShowModal(false); onChanged(); }}
          onPaid={onChanged}
        />
      )}
    </div>
  );
};
