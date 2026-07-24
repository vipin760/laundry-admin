import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { ordersApi, type PriceAdjustment } from '../api/ordersApi';

/** Collapsible admin price-override audit trail — same shape as the Coupon audit log viewer. */
export const PriceAdjustmentHistory: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<PriceAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getPriceAdjustments(orderId);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && !loaded) load();
  }, [open, loaded, load]);

  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Price Adjustment History
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="border-t border-slate-200 dark:border-white/10">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <p className="p-3 text-[11px] text-slate-400 italic">No manual price overrides on this order.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {logs.map((log) => (
                <li key={log._id} className="p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-amber-700">
                      ₹{log.previousAmount.toFixed(2)} → ₹{log.newAmount.toFixed(2)}
                      {' '}({log.diffAmount >= 0 ? '+' : ''}₹{log.diffAmount.toFixed(2)})
                    </span>
                    <span className="text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">{log.reason}</p>
                  <p className="text-slate-400 mt-1">
                    Admin: {log.adminId}{log.ipAddress ? ` · IP: ${log.ipAddress}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
