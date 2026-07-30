import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import type { Order } from '../api/ordersApi';

const MILESTONE_LABELS: Record<string, string> = {
  PICKUP: 'Pickup due',
  DELIVERY: 'Delivery due',
  COMPLETION: 'Completion due',
};

const STATUS_STYLE: Record<string, string> = {
  ON_TIME: 'bg-green-50 text-green-700 border-green-200',
  DUE_SOON: 'bg-amber-50 text-amber-700 border-amber-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  ON_TIME: 'On Time',
  DUE_SOON: 'Due Soon',
  OVERDUE: 'Overdue',
};

function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const totalMinutes = Math.floor(abs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  const label = parts.join(' ');
  return ms < 0 ? `${label} overdue` : `${label} left`;
}

/**
 * Live SLA countdown — ticks locally every 30s against the server-computed
 * deadline (order.slaDeadline/slaStatus). No polling for the tick itself;
 * the underlying deadline/status only change when the order's status does,
 * which already triggers a refresh via the existing 'order:updated' socket
 * event (see OrdersPage.tsx) and re-renders this with fresh props.
 */
export const SlaCountdown: React.FC<{ order: Order }> = ({ order }) => {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!order.slaDeadline) return;
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [order.slaDeadline]);

  if (!order.slaMilestone || !order.slaDeadline || !order.slaStatus) return null;

  const deadline = new Date(order.slaDeadline);
  const msRemaining = deadline.getTime() - Date.now();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
        <Timer size={13} className="text-slate-400" />
        {MILESTONE_LABELS[order.slaMilestone]}: {deadline.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
      </span>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUS_STYLE[order.slaStatus]}`}>
        {STATUS_LABEL[order.slaStatus]} · {formatRemaining(msRemaining)}
      </span>
    </div>
  );
};
