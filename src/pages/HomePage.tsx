import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  Users,
  UserPlus,
  PackageOpen,
  Loader2,
  IndianRupee,
  WashingMachine,
  ClipboardList,
  ShoppingBag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usersApi } from '../api/usersApi';
import type { User } from '../api/usersApi';
import { ordersApi, STATUS_LABELS } from '../api/ordersApi';
import type { Order, OrderStatus } from '../api/ordersApi';
import { servicesApi } from '../api/servicesApi';

// Donut / legend colours per order status
const STATUS_COLORS: Record<OrderStatus, { hex: string; bg: string }> = {
  ORDER_PLACED:     { hex: '#3b82f6', bg: 'bg-blue-500' },
  PICKUP_ASSIGNED:  { hex: '#8b5cf6', bg: 'bg-violet-500' },
  ITEMIZED:         { hex: '#06b6d4', bg: 'bg-cyan-500' },
  PROCESSING:       { hex: '#f59e0b', bg: 'bg-amber-500' },
  OUT_FOR_DELIVERY: { hex: '#6366f1', bg: 'bg-indigo-500' },
  COMPLETED:        { hex: '#10b981', bg: 'bg-emerald-500' },
  CANCELLED:        { hex: '#ef4444', bg: 'bg-red-500' },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  'ORDER_PLACED', 'PICKUP_ASSIGNED', 'ITEMIZED', 'PROCESSING', 'OUT_FOR_DELIVERY',
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersRes, ordersRes, servicesRes] = await Promise.all([
          usersApi.getUsers(),
          ordersApi.getOrders({ page: 1, limit: 1000, sortField: 'createdAt', sortDir: 'desc' }),
          servicesApi.getServices(),
        ]);
        if (cancelled) return;
        setUsers(usersRes);
        setOrders(ordersRes.data);
        setOrdersTotal(ordersRes.total || ordersRes.data.length);
        setServicesTotal(servicesRes.total || servicesRes.data.length);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const customers = users.filter((u) => u.role === 'user');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = customers.filter(
      (u) => new Date(u.createdAt) >= monthStart,
    ).length;

    const activeOrders = orders.filter((o) =>
      ACTIVE_STATUSES.includes(o.status),
    ).length;

    const revenue = orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + (o.billAmount ?? o.totalAmount ?? 0), 0);

    return { customers: customers.length, newThisMonth, activeOrders, revenue };
  }, [users, orders]);

  // Customer growth — new customers per month, last 12 months
  const growth = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('en', { month: 'short' }),
        count: 0,
      });
    }
    const startIndex = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    users
      .filter((u) => u.role === 'user')
      .forEach((u) => {
        const created = new Date(u.createdAt);
        if (created >= startIndex) {
          const idx =
            (created.getFullYear() - startIndex.getFullYear()) * 12 +
            (created.getMonth() - startIndex.getMonth());
          if (idx >= 0 && idx < 12) months[idx].count++;
        }
      });
    const max = Math.max(1, ...months.map((m) => m.count));
    return { months, max };
  }, [users]);

  // Orders by status — donut segments + legend
  const byStatus = useMemo(() => {
    const counts = new Map<OrderStatus, number>();
    orders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    const total = orders.length;
    const entries = (Object.keys(STATUS_LABELS) as OrderStatus[])
      .filter((s) => (counts.get(s) ?? 0) > 0)
      .map((s) => ({
        status: s,
        label: STATUS_LABELS[s],
        count: counts.get(s)!,
        pct: total > 0 ? Math.round(((counts.get(s) ?? 0) / total) * 100) : 0,
      }));

    // conic-gradient string for the donut
    let acc = 0;
    const segments = entries.map((e) => {
      const from = acc;
      acc += total > 0 ? (e.count / total) * 360 : 0;
      return `${STATUS_COLORS[e.status].hex} ${from}deg ${acc}deg`;
    });
    const gradient = segments.length > 0
      ? `conic-gradient(${segments.join(', ')})`
      : 'conic-gradient(#e2e8f0 0deg 360deg)';

    return { entries, total, gradient };
  }, [orders]);

  const fmtINR = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const stats = [
    { label: 'Total Customers', value: String(metrics.customers), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'New This Month', value: String(metrics.newThisMonth), icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Total Orders', value: String(ordersTotal), icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Active Orders', value: String(metrics.activeOrders), icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Revenue (Completed)', value: fmtINR(metrics.revenue), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Services', value: String(servicesTotal), icon: WashingMachine, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  ];

  return (
    <AdminLayout>
      {/* Page Title */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Live overview of customers, orders and revenue</p>
      </div>

      {/* Quick nav */}
      <div className="flex items-center justify-end gap-3 mb-8">
        <button
          onClick={() => navigate('/users')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-white/5 rounded-lg hover:bg-slate-50 transition-all"
        >
          <Users size={16} />
          <span>Customers</span>
        </button>
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-hover transition-all shadow-lg shadow-brand/20"
        >
          <PackageOpen size={16} />
          <span>Orders</span>
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-100 dark:border-red-500/20 rounded-2xl font-semibold">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-brand animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading dashboard…</p>
        </div>
      ) : (
        <>
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="premium-card !p-5 flex items-center gap-4 group hover:border-brand/30 transition-all"
              >
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={22} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer growth bar chart */}
            <div className="lg:col-span-2">
              <div className="premium-card h-full min-h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Customer Growth (Last 12 Months)</h2>
                </div>
                <div className="h-64 flex items-end justify-between px-4 mt-16 gap-2">
                  {growth.months.map((m, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 flex-1 h-full justify-end">
                      <span className="text-[10px] font-black text-slate-500">{m.count > 0 ? m.count : ''}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, (m.count / growth.max) * 100)}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5 }}
                        className={`w-full max-w-[26px] rounded-t-md ${m.count > 0 ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-white/5'}`}
                      />
                      <span className="text-[10px] font-bold text-slate-400">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-8 px-4">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                  <span className="text-[11px] font-bold text-slate-500">New Customers</span>
                </div>
              </div>
            </div>

            {/* Orders by status donut */}
            <div className="lg:col-span-1">
              <div className="premium-card h-full min-h-[450px]">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Orders by Status</h2>
                </div>

                <div className="relative w-56 h-56 mx-auto mt-6">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: byStatus.gradient }}
                  />
                  {/* Donut hole */}
                  <div className="absolute inset-[18px] rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{byStatus.total}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orders</span>
                  </div>
                </div>

                <div className="mt-10 space-y-3">
                  {byStatus.entries.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center">No orders yet</p>
                  ) : (
                    byStatus.entries.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[item.status].bg}`}></div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {item.count} <span className="text-slate-400 font-bold">({item.pct}%)</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};
