import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  Ticket,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Power,
  Loader2,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react';
import {
  couponApi,
  formatDiscount,
  EFFECTIVE_STATUS_LABELS,
  type CouponListItem,
  type DashboardCounts,
  type CouponEffectiveStatus,
} from '../api/couponApi';

const STATUS_STYLES: Record<CouponEffectiveStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-gray-200 text-gray-600',
  disabled: 'bg-red-100 text-red-700',
};

const SORT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'couponCode', label: 'Coupon Code' },
  { key: 'couponName', label: 'Coupon Name' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'assignedUsersCount', label: 'Assigned Users' },
  { key: 'usedUsersCount', label: 'Used Users' },
  { key: 'createdAt', label: 'Created Date' },
];

export const CouponsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardCounts | null>(null);
  const [rows, setRows] = useState<CouponListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CouponEffectiveStatus | ''>('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, list] = await Promise.all([
        couponApi.dashboard(),
        couponApi.list({
          search,
          status: statusFilter,
          expiryFrom,
          expiryTo,
          page,
          limit: 20,
          sortBy,
          sortOrder,
        }),
      ]);
      setSummary(dash);
      setRows(list.data);
      setTotalPages(list.pagination.totalPages || 1);
      setTotal(list.pagination.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, expiryFrom, expiryTo, page, sortBy, sortOrder]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (key: string) => {
    setPage(1);
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const cards = useMemo(
    () => [
      { label: 'Active', value: summary?.active ?? 0, icon: CheckCircle2, color: 'text-emerald-600' },
      { label: 'Expired', value: summary?.expired ?? 0, icon: XCircle, color: 'text-gray-500' },
      { label: 'Disabled', value: summary?.disabled ?? 0, icon: Ban, color: 'text-red-600' },
      { label: 'Total', value: summary?.total ?? 0, icon: Ticket, color: 'text-blue-600' },
    ],
    [summary],
  );

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (row: CouponListItem) => {
    if (!window.confirm(`Delete coupon "${row.couponCode}"? This cannot be undone.`)) return;
    act(() => couponApi.remove(row.id), row.id);
  };

  const handleToggleStatus = (row: CouponListItem) => {
    const enabling = row.status === 'disabled';
    const verb = enabling ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${verb} coupon "${row.couponCode}"?`)) return;
    act(() => (enabling ? couponApi.enable(row.id) : couponApi.disable(row.id)), row.id);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Coupons</h1>
          <button
            onClick={() => navigate('/coupons/new')}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          >
            <Plus size={16} /> New Coupon
          </button>
        </div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <c.icon className={`${c.color} mb-2`} size={20} />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search coupon code / name"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as CouponEffectiveStatus | '');
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {(Object.keys(EFFECTIVE_STATUS_LABELS) as CouponEffectiveStatus[]).map((s) => (
              <option key={s} value={s}>
                {EFFECTIVE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Expiry:</span>
            <input
              type="date"
              value={expiryFrom}
              onChange={(e) => {
                setPage(1);
                setExpiryFrom(e.target.value);
              }}
              className="border rounded-lg px-2 py-2 text-sm"
            />
            <span>to</span>
            <input
              type="date"
              value={expiryTo}
              onChange={(e) => {
                setPage(1);
                setExpiryTo(e.target.value);
              }}
              className="border rounded-lg px-2 py-2 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {SORT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="p-3 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown
                        size={12}
                        className={sortBy === col.key ? 'text-indigo-600' : 'text-gray-300'}
                      />
                    </span>
                  </th>
                ))}
                <th className="p-3 whitespace-nowrap">Discount Type</th>
                <th className="p-3 whitespace-nowrap">Discount Value</th>
                <th className="p-3 whitespace-nowrap">Status</th>
                <th className="p-3 whitespace-nowrap">Created By</th>
                <th className="p-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center">
                    <Loader2 className="animate-spin inline" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-400">
                    No coupons found
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono">{r.couponCode}</td>
                    <td className="p-3">{r.couponName}</td>
                    <td className="p-3">{new Date(r.expiryDate).toLocaleDateString()}</td>
                    <td className="p-3">{r.assignedUsersCount}</td>
                    <td className="p-3">{r.usedUsersCount}</td>
                    <td className="p-3">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 capitalize">{r.discountType}</td>
                    <td className="p-3">{formatDiscount(r.discountType, r.discountValue)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_STYLES[r.effectiveStatus]}`}>
                        {EFFECTIVE_STATUS_LABELS[r.effectiveStatus]}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{r.createdBy?.slice?.(-6) ?? r.createdBy}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <IconBtn
                          title="View"
                          onClick={() => navigate(`/coupons/${r.id}`)}
                          icon={Eye}
                        />
                        <IconBtn
                          title="Edit"
                          onClick={() => navigate(`/coupons/${r.id}/edit`)}
                          icon={Pencil}
                        />
                        <IconBtn
                          title={r.status === 'disabled' ? 'Enable' : 'Disable'}
                          onClick={() => handleToggleStatus(r)}
                          disabled={busyId === r.id}
                          icon={Power}
                        />
                        <IconBtn
                          title="Delete"
                          onClick={() => handleDelete(r)}
                          disabled={busyId === r.id}
                          icon={Trash2}
                          className="text-red-600 hover:bg-red-50"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{total} coupon(s)</span>
          <div className="flex justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const IconBtn: React.FC<{
  title: string;
  onClick: () => void;
  icon: LucideIcon;
  disabled?: boolean;
  className?: string;
}> = ({ title, onClick, icon: Icon, disabled, className }) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-lg border text-gray-500 hover:bg-gray-50 disabled:opacity-40 ${className ?? ''}`}
  >
    <Icon size={14} />
  </button>
);
