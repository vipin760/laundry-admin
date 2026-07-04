import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, PackageOpen, XCircle, CreditCard, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { notificationsApi } from '../api/notificationsApi';
import type { AppNotification } from '../api/notificationsApi';

const POLL_MS = 30_000;

const typeIcon = (type?: string) => {
  switch (type) {
    case 'order_created':   return <PackageOpen size={16} className="text-blue-500" />;
    case 'order_cancelled': return <XCircle size={16} className="text-red-500" />;
    case 'order_completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
    case 'payment_success': return <CreditCard size={16} className="text-emerald-500" />;
    default:                return <Bell size={16} className="text-slate-400" />;
  }
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const NotificationBell: React.FC = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getAdminNotifications();
      setItems(res.data);
      setUnread(res.unread);
    } catch {
      // silent — the bell simply shows no badge if the fetch fails
    }
  }, []);

  // Initial load + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAdminRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-slate-400 hover:text-brand relative"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#0C0C0C]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-96 max-h-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Notifications</h3>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="py-14 text-center">
                  <Bell size={32} className="mx-auto text-slate-200 dark:text-slate-700" />
                  <p className="mt-3 text-xs font-semibold text-slate-400">No notifications yet</p>
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n._id}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-white/5 ${
                      n.isRead ? '' : 'bg-blue-50/50 dark:bg-blue-500/5'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                      {typeIcon(n.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">{n.title}</p>
                        {!n.isRead && <span className="w-1.5 h-1.5 bg-brand rounded-full flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
