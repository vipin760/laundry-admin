import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useOrdersStore } from '../store/useOrdersStore';
import {
  Search, Loader2, PackageX, ChevronLeft, ChevronRight,
  X, Truck, Package, CheckCircle2, Clock, AlertCircle,
  Phone, User, Scale, Receipt, ShieldCheck,
} from 'lucide-react';
import type { Order, OrderStatus, UpdateStatusPayload } from '../api/ordersApi';
import { STATUS_LABELS, NEXT_STATUS } from '../api/ordersApi';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<OrderStatus, string> = {
  ORDER_PLACED:     'bg-blue-50  text-blue-700  border-blue-200',
  PICKUP_ASSIGNED:  'bg-violet-50 text-violet-700 border-violet-200',
  ITEMIZED:         'bg-amber-50 text-amber-700  border-amber-200',
  PROCESSING:       'bg-cyan-50  text-cyan-700   border-cyan-200',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border-orange-200',
  COMPLETED:        'bg-green-50 text-green-700  border-green-200',
  CANCELLED:        'bg-red-50   text-red-600    border-red-200',
};

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLE[status]}`}>
    {STATUS_LABELS[status] ?? status}
  </span>
);

// ── Tracking stepper ──────────────────────────────────────────────────────────

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'ORDER_PLACED',     label: 'Confirmed' },
  { key: 'PICKUP_ASSIGNED',  label: 'Pickup'    },
  { key: 'ITEMIZED',         label: 'Itemized'  },
  { key: 'PROCESSING',       label: 'Brewing'   },
  { key: 'COMPLETED',        label: 'Delivered' },
];

const STEP_INDEX: Partial<Record<OrderStatus, number>> = {
  ORDER_PLACED: 0, PICKUP_ASSIGNED: 1, ITEMIZED: 2,
  PROCESSING: 3, OUT_FOR_DELIVERY: 4, COMPLETED: 4,
};

const TrackingStepper: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const current = STEP_INDEX[status] ?? 0;
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${done   ? 'bg-blue-600 border-blue-600 text-white' :
                  active ? 'bg-white border-blue-600 text-blue-600' :
                           'bg-white border-slate-200 text-slate-400'}`}>
                {done ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap
                ${active ? 'text-blue-600' : done ? 'text-blue-500' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < current ? 'bg-blue-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Detail panel ──────────────────────────────────────────────────────────────

interface UpdateForm {
  driverName: string;
  driverPhone: string;
  weightKg: string;
  itemCount: string;
  billAmount: string;
}

const OrderDetailPanel: React.FC<{
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ order, onClose, onUpdated }) => {
  const { updateStatus } = useOrdersStore();
  const nextStatus = NEXT_STATUS[order.status];
  const [form, setForm] = useState<UpdateForm>({
    driverName:  order.driverName  ?? '',
    driverPhone: order.driverPhone ?? '',
    weightKg:    order.weightKg    != null ? String(order.weightKg)  : '',
    itemCount:   order.itemCount   != null ? String(order.itemCount) : '',
    billAmount:  order.billAmount  != null ? String(order.billAmount): '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const set = (k: keyof UpdateForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setSaving(true); setErr(null);
    try {
      const payload: UpdateStatusPayload = { status: nextStatus };
      if (nextStatus === 'PICKUP_ASSIGNED') {
        payload.driverName  = form.driverName;
        payload.driverPhone = form.driverPhone;
      }
      if (nextStatus === 'ITEMIZED') {
        if (form.weightKg)   payload.weightKg   = parseFloat(form.weightKg);
        if (form.itemCount)  payload.itemCount   = parseInt(form.itemCount);
        if (form.billAmount) payload.billAmount  = parseFloat(form.billAmount);
      }
      await updateStatus(order._id, payload);
      onUpdated();
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const pickupDateStr = order.pickupDate
    ? new Date(order.pickupDate).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white dark:bg-[#141414] h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Details</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-colors">
            <X size={16} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Stepper */}
          <TrackingStepper status={order.status} />

          {/* Current status badge */}
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs text-slate-400">{new Date(order.updatedAt).toLocaleString('en-IN')}</span>
          </div>

          {/* Order info */}
          <div className="rounded-xl border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
            <Row icon={<Package size={14} />} label="Items">
              {order.items.map((i, idx) => (
                <span key={idx} className="block text-xs text-slate-600 dark:text-slate-300">
                  {i.serviceName ?? i.name} × {i.quantity}
                </span>
              ))}
            </Row>
            <Row icon={<Receipt size={14} />} label="Amount">
              ₹{order.billAmount ?? order.totalAmount}
              {order.billAmount && order.billAmount !== order.totalAmount && (
                <span className="ml-2 text-xs text-slate-400 line-through">₹{order.totalAmount}</span>
              )}
            </Row>
            {order.address && (
              <Row icon={<Truck size={14} />} label="Address">
                <span className="text-xs">{order.address}</span>
              </Row>
            )}
            {order.pickupDate && (
              <Row icon={<Clock size={14} />} label="Pickup">
                {pickupDateStr}
                {order.pickupSlot && <span className="ml-2 text-xs text-slate-400">· {order.pickupSlot}</span>}
              </Row>
            )}
          </div>

          {/* Driver details (read only if already set) */}
          {(order.driverName || order.driverPhone) && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-4">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-2 uppercase tracking-wide">Driver</p>
              {order.driverName  && <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2"><User size={13}/>{order.driverName}</p>}
              {order.driverPhone && <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-1"><Phone size={13}/>{order.driverPhone}</p>}
            </div>
          )}

          {/* Weight / items / bill (read only if set) */}
          {(order.weightKg != null || order.itemCount != null) && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4">
              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">Itemization</p>
              <div className="flex gap-6">
                {order.weightKg  != null && <Stat icon={<Scale size={13}/>}  label="Weight"  value={`${order.weightKg} kg`} />}
                {order.itemCount != null && <Stat icon={<Package size={13}/>} label="Items"   value={String(order.itemCount)} />}
                {order.billAmount != null && <Stat icon={<Receipt size={13}/>} label="Bill"   value={`₹${order.billAmount}`} />}
              </div>
            </div>
          )}

          {/* OTP (read only) */}
          {order.deliveryOtp && (
            <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4">
              <p className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck size={13}/> Delivery OTP (share with customer)
              </p>
              <div className="flex gap-3">
                {order.deliveryOtp.split('').map((d, i) => (
                  <div key={i}
                    className="w-12 h-14 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border-2 border-green-300 text-2xl font-black text-green-700 shadow-sm">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Advance status form ─────────────────────────────────────── */}
          {nextStatus && order.status !== 'CANCELLED' && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Advance to: <span className="text-blue-600">{STATUS_LABELS[nextStatus]}</span>
              </p>

              {/* Driver fields */}
              {nextStatus === 'PICKUP_ASSIGNED' && (
                <div className="space-y-3">
                  <Field label="Driver Name" icon={<User size={14}/>}
                    value={form.driverName} onChange={(v) => set('driverName', v)}
                    placeholder="e.g. Rohit Kumar" />
                  <Field label="Driver Phone" icon={<Phone size={14}/>}
                    value={form.driverPhone} onChange={(v) => set('driverPhone', v)}
                    placeholder="+91 98765 43210" />
                </div>
              )}

              {/* Itemization fields */}
              {nextStatus === 'ITEMIZED' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Weight (kg)" icon={<Scale size={14}/>}
                      value={form.weightKg} onChange={(v) => set('weightKg', v)}
                      placeholder="e.g. 3.2" type="number" />
                    <Field label="Item Count" icon={<Package size={14}/>}
                      value={form.itemCount} onChange={(v) => set('itemCount', v)}
                      placeholder="e.g. 12" type="number" />
                  </div>
                  <Field label="Bill Amount (₹)" icon={<Receipt size={14}/>}
                    value={form.billAmount} onChange={(v) => set('billAmount', v)}
                    placeholder="e.g. 350" type="number" />
                </div>
              )}

              {nextStatus === 'OUT_FOR_DELIVERY' && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-green-500"/>
                  A 4-digit OTP will be auto-generated and shown here.
                </p>
              )}

              {err && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle size={13}/>{err}
                </p>
              )}

              <button onClick={handleAdvance} disabled={saving}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                {saving ? 'Updating…' : `Mark as ${STATUS_LABELS[nextStatus]}`}
              </button>
            </div>
          )}

          {order.status === 'COMPLETED' && (
            <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 p-4 text-center">
              <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2"/>
              <p className="font-bold text-green-700">Order Delivered</p>
              <p className="text-xs text-green-600 mt-1">Customer confirmed delivery via OTP.</p>
            </div>
          )}

          {order.status === 'CANCELLED' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
              <X size={24} className="text-red-500 mx-auto mb-2"/>
              <p className="font-bold text-red-600">Order Cancelled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Small helpers ──────────────────────────────────────────────────────────────

const Row: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 px-4 py-3">
    <span className="text-slate-400 mt-0.5">{icon}</span>
    <div className="flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-slate-800 dark:text-white">{children}</div>
    </div>
  </div>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-amber-600">{icon}</span>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-sm font-black text-slate-800 dark:text-white">{value}</p>
  </div>
);

const Field: React.FC<{
  label: string; icon: React.ReactNode;
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}> = ({ label, icon, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
      {icon}{label}
    </label>
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
    />
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export const OrdersPage: React.FC = () => {
  const { orders, total, isLoading, error, fetchOrders } = useOrdersStore();
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const limit = 10;

  const load = () => fetchOrders({ page, limit });

  useEffect(() => { load(); }, [page]);

  const filtered = orders.filter((o) =>
    (o.orderNumber ?? o._id).toLowerCase().includes(search.toLowerCase()) ||
    o.userId.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Track, update, and manage customer orders</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order # or user…"
            className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/5 rounded-xl w-64 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-blue-600" size={32}/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <PackageX size={40} className="mb-3 opacity-40"/>
            <p className="font-semibold">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                {['Order #', 'Items', 'Amount', 'Pickup Date', 'Status', 'Updated', ''].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filtered.map((order) => (
                <tr key={order._id}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  onClick={() => setSelected(order)}>
                  <td className="px-5 py-4 font-mono font-bold text-slate-800 dark:text-white text-xs">
                    #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                    {order.items.map((i) => i.serviceName ?? i.name).join(', ')}
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800 dark:text-white">
                    ₹{order.billAmount ?? order.totalAmount}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {order.pickupDate
                      ? new Date(order.pickupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={order.status}/></td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {new Date(order.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-4">
                    <button className="text-xs font-bold text-blue-600 hover:underline">Details →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16}/>
              </button>
              <span className="text-xs font-semibold text-slate-600">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            // Reflect update in panel
            const updated = useOrdersStore.getState().orders.find((o) => o._id === selected._id);
            if (updated) setSelected(updated);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
};
