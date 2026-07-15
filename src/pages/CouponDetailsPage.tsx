import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  IndianRupee,
  Percent,
  Pencil,
  Power,
  Trash2,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import {
  couponApi,
  formatDiscount,
  EFFECTIVE_STATUS_LABELS,
  BULK_CONDITION_LABELS,
  type CouponDetail,
  type CouponReport,
  type AssignedUser,
  type AuditLogEntry,
  type CouponEffectiveStatus,
  type CouponBulkCondition,
  type AssignUsersResult,
  type BulkAssignResult,
} from '../api/couponApi';
import { usersApi, type User } from '../api/usersApi';

const STATUS_STYLES: Record<CouponEffectiveStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-gray-200 text-gray-600',
  disabled: 'bg-red-100 text-red-700',
};

export const CouponDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState<CouponDetail | null>(null);
  const [report, setReport] = useState<CouponReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedTotalPages, setAssignedTotalPages] = useState(1);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedStatusFilter, setAssignedStatusFilter] = useState<'' | 'active' | 'removed'>('');
  const [assignedUsageFilter, setAssignedUsageFilter] = useState<'' | 'used' | 'unused'>('');
  const [assignedLoading, setAssignedLoading] = useState(true);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadCoupon = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, r] = await Promise.all([couponApi.getById(id), couponApi.report(id)]);
      setCoupon(c);
      setReport(r);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAssignedUsers = useCallback(async () => {
    if (!id) return;
    setAssignedLoading(true);
    try {
      const res = await couponApi.listUsers(id, {
        search: assignedSearch,
        status: assignedStatusFilter,
        usage: assignedUsageFilter,
        page: assignedPage,
        limit: 20,
      });
      setAssignedUsers(res.data);
      setAssignedTotal(res.pagination.total);
      setAssignedTotalPages(res.pagination.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setAssignedLoading(false);
    }
  }, [id, assignedSearch, assignedStatusFilter, assignedUsageFilter, assignedPage]);

  useEffect(() => {
    loadCoupon();
  }, [loadCoupon]);

  useEffect(() => {
    loadAssignedUsers();
  }, [loadAssignedUsers]);

  const loadAuditLogs = useCallback(async () => {
    if (!id) return;
    setAuditLoading(true);
    try {
      const res = await couponApi.auditLogs(id, 1, 50);
      setAuditLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (auditOpen && auditLogs.length === 0) {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditOpen]);

  const refreshAll = async () => {
    await Promise.all([loadCoupon(), loadAssignedUsers()]);
  };

  const handleDisableEnable = async () => {
    if (!coupon || !id) return;
    const enabling = coupon.status === 'disabled';
    const verb = enabling ? 'enable' : 'disable';
    if (!window.confirm(`Are you sure you want to ${verb} coupon "${coupon.couponCode}"?`)) return;
    setBusy(true);
    try {
      await (enabling ? couponApi.enable(id) : couponApi.disable(id));
      await loadCoupon();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!coupon || !id) return;
    if (!window.confirm(`Delete coupon "${coupon.couponCode}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await couponApi.remove(id);
      navigate('/coupons');
    } catch (e) {
      alert((e as Error).message);
      setBusy(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!id) return;
    if (!window.confirm('Remove this user from the coupon?')) return;
    setRowBusyId(userId);
    try {
      await couponApi.removeUser(id, userId);
      await refreshAll();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleReassignUser = async (userId: string) => {
    if (!id) return;
    setRowBusyId(userId);
    try {
      await couponApi.reassignUser(id, userId);
      await refreshAll();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleExport = async () => {
    if (!id || !coupon) return;
    try {
      await couponApi.exportUsers(id, coupon.couponCode);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const statsCards = useMemo(
    () => [
      { label: 'Assigned Users', value: report?.assignedUsers ?? 0, icon: Users, color: 'text-blue-600' },
      { label: 'Used Users', value: report?.usedUsers ?? 0, icon: CheckCircle2, color: 'text-emerald-600' },
      { label: 'Remaining Users', value: report?.remainingUsers ?? 0, icon: Clock, color: 'text-amber-600' },
      {
        label: 'Total Discount Given',
        value: `₹${report?.totalDiscountGiven ?? 0}`,
        icon: IndianRupee,
        color: 'text-emerald-600',
      },
      {
        label: 'Redemption Rate',
        value: `${report?.redemptionRate ?? 0}%`,
        icon: Percent,
        color: 'text-indigo-600',
      },
    ],
    [report],
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Loader2 className="animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (loadError || !coupon) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-sm text-red-600">Failed to load coupon: {loadError}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/coupons')}
              className="p-2 rounded-lg border text-gray-500 hover:bg-gray-50 mt-1"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-mono">{coupon.couponCode}</h1>
                <span className={`px-2 py-1 rounded-full text-xs ${STATUS_STYLES[coupon.effectiveStatus]}`}>
                  {EFFECTIVE_STATUS_LABELS[coupon.effectiveStatus]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{coupon.couponName}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDiscount(coupon.discountType, coupon.discountValue)} discount ·{' '}
                {coupon.minimumOrderAmount ? `Min order ₹${coupon.minimumOrderAmount} · ` : ''}
                Usage/user {coupon.usagePerUser}
                {coupon.totalUsageLimit ? ` · Limit ${coupon.totalUsageLimit}` : ''} · Expires{' '}
                {new Date(coupon.expiryDate).toLocaleDateString()}
              </p>
              {coupon.description && <p className="text-xs text-gray-400 mt-1">{coupon.description}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/coupons/${id}/edit`)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={handleDisableEnable}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Power size={14} /> {coupon.status === 'disabled' ? 'Enable' : 'Disable'}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statsCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <c.icon className={`${c.color} mb-2`} size={20} />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Assign Users panel */}
        <AssignUsersPanel couponId={id!} onAssigned={refreshAll} />

        {/* Assigned users table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
            <h3 className="font-semibold">Assigned Users</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={assignedSearch}
                  onChange={(e) => {
                    setAssignedPage(1);
                    setAssignedSearch(e.target.value);
                  }}
                  placeholder="Search name / mobile / email"
                  className="pl-8 pr-3 py-1.5 border rounded-lg text-xs w-56"
                />
              </div>
              <select
                value={assignedStatusFilter}
                onChange={(e) => {
                  setAssignedPage(1);
                  setAssignedStatusFilter(e.target.value as '' | 'active' | 'removed');
                }}
                className="border rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="removed">Removed</option>
              </select>
              <select
                value={assignedUsageFilter}
                onChange={(e) => {
                  setAssignedPage(1);
                  setAssignedUsageFilter(e.target.value as '' | 'used' | 'unused');
                }}
                className="border rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="">Used &amp; unused</option>
                <option value="used">Used</option>
                <option value="unused">Unused</option>
              </select>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Assigned Date</th>
                <th className="p-3">Used</th>
                <th className="p-3">Used Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignedLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="animate-spin inline" />
                  </td>
                </tr>
              ) : assignedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No assigned users found
                  </td>
                </tr>
              ) : (
                assignedUsers.map((u) => (
                  <tr key={u.userId} className="border-t">
                    <td className="p-3">
                      <div>{u.customerName}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="p-3">{u.mobileNumber}</td>
                    <td className="p-3">{new Date(u.assignedAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      {u.usedCount > 0 ? (
                        <span className="text-emerald-700">Yes ({u.usedCount})</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="p-3">{u.lastUsedAt ? new Date(u.lastUsedAt).toLocaleDateString() : '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {u.status === 'active' ? (
                          <button
                            title="Remove"
                            disabled={rowBusyId === u.userId}
                            onClick={() => handleRemoveUser(u.userId)}
                            className="p-2 rounded-lg border text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            <UserMinus size={14} />
                          </button>
                        ) : (
                          <button
                            title="Reassign"
                            disabled={rowBusyId === u.userId}
                            onClick={() => handleReassignUser(u.userId)}
                            className="p-2 rounded-lg border text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            <UserPlus size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-gray-500">{assignedTotal} user(s)</span>
            <div className="flex gap-2">
              <button
                disabled={assignedPage <= 1}
                onClick={() => setAssignedPage((p) => p - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm">
                {assignedPage} / {assignedTotalPages}
              </span>
              <button
                disabled={assignedPage >= assignedTotalPages}
                onClick={() => setAssignedPage((p) => p + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Audit log */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <button
            onClick={() => setAuditOpen((o) => !o)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h3 className="font-semibold">Audit Log</h3>
            {auditOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {auditOpen && (
            <div className="border-t">
              {auditLoading ? (
                <div className="p-6">
                  <Loader2 className="animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">No audit log entries yet.</p>
              ) : (
                <ul className="divide-y">
                  {auditLogs.map((log, i) => (
                    <li key={i} className="p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{log.message || log.action}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Admin: {log.adminId} {log.ipAddress ? `· IP: ${log.ipAddress}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

// ── Assign Users panel (manual + bulk) ────────────────────────────────────────

const BULK_CONDITIONS: CouponBulkCondition[] = [
  'missed_first_cashback',
  'failed_payment',
  'completed_first_order',
  'no_orders_30_days',
  'wallet_balance_below_100',
  'city',
  'custom_user_ids',
];

const AssignUsersPanel: React.FC<{ couponId: string; onAssigned: () => void }> = ({
  couponId,
  onAssigned,
}) => {
  const [mode, setMode] = useState<'manual' | 'bulk'>('manual');

  // Manual mode state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manualAssigning, setManualAssigning] = useState(false);
  const [manualResult, setManualResult] = useState<AssignUsersResult | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // Bulk mode state
  const [condition, setCondition] = useState<CouponBulkCondition>('missed_first_cashback');
  const [city, setCity] = useState('');
  const [customIds, setCustomIds] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkAssignResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'manual' || allUsers.length > 0) return;
    setUsersLoading(true);
    usersApi
      .getUsers()
      .then(setAllUsers)
      .catch((e) => setManualError((e as Error).message))
      .finally(() => setUsersLoading(false));
  }, [mode, allUsers.length]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return allUsers.slice(0, 50);
    return allUsers
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.mobileNumber?.toLowerCase().includes(term) ||
          u._id.toLowerCase().includes(term),
      )
      .slice(0, 50);
  }, [allUsers, userSearch]);

  const toggleSelected = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleManualAssign = async () => {
    if (selectedIds.size === 0) return;
    setManualAssigning(true);
    setManualError(null);
    setManualResult(null);
    try {
      const res = await couponApi.assignUsers(couponId, Array.from(selectedIds));
      setManualResult(res);
      setSelectedIds(new Set());
      onAssigned();
    } catch (e) {
      setManualError((e as Error).message);
    } finally {
      setManualAssigning(false);
    }
  };

  const bulkValidationError = useMemo(() => {
    if (condition === 'city' && !city.trim()) return 'City is required for this condition';
    if (condition === 'custom_user_ids' && !customIds.trim()) {
      return 'Provide at least one user ID';
    }
    return null;
  }, [condition, city, customIds]);

  const handleBulkAssign = async () => {
    if (bulkValidationError) return;
    setBulkAssigning(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const body: { condition: CouponBulkCondition; city?: string; userIds?: string[] } = { condition };
      if (condition === 'city') body.city = city.trim();
      if (condition === 'custom_user_ids') {
        body.userIds = customIds
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const res = await couponApi.bulkAssign(couponId, body);
      setBulkResult(res);
      onAssigned();
    } catch (e) {
      setBulkError((e as Error).message);
    } finally {
      setBulkAssigning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Assign Users</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['manual', 'bulk'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-sm capitalize ${
                mode === m ? 'bg-white shadow font-semibold' : 'text-gray-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {mode === 'manual' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name / mobile / email / user ID"
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full max-w-md"
              />
            </div>

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {usersLoading ? (
                <div className="p-4">
                  <Loader2 className="animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No matching users</p>
              ) : (
                <ul className="divide-y">
                  {filteredUsers.map((u) => (
                    <li key={u._id} className="p-2.5 flex items-center gap-3 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u._id)}
                        onChange={() => toggleSelected(u._id)}
                        className="accent-indigo-600"
                      />
                      <div className="flex-1 text-sm">
                        <span className="font-medium">{u.name}</span>{' '}
                        <span className="text-gray-400">
                          {u.mobileNumber || '—'} {u.email ? `· ${u.email}` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{selectedIds.size} user(s) selected</span>
              <button
                onClick={handleManualAssign}
                disabled={selectedIds.size === 0 || manualAssigning}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {manualAssigning ? 'Assigning…' : 'Assign Coupon'}
              </button>
            </div>

            {manualError && <p className="text-sm text-red-600">{manualError}</p>}
            {manualResult && (
              <p className="text-sm text-emerald-700">
                Assigned {manualResult.newlyAssigned} new user(s) · {manualResult.alreadyAssigned} already
                assigned
                {manualResult.skippedInvalid > 0 ? ` · ${manualResult.skippedInvalid} invalid skipped` : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-lg">
            <label className="block">
              <span className="text-xs text-gray-600">Condition</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as CouponBulkCondition)}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                {BULK_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {BULK_CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>

            {condition === 'city' && (
              <label className="block">
                <span className="text-xs text-gray-600">City</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </label>
            )}

            {condition === 'custom_user_ids' && (
              <label className="block">
                <span className="text-xs text-gray-600">User IDs (comma or newline separated)</span>
                <textarea
                  value={customIds}
                  onChange={(e) => setCustomIds(e.target.value)}
                  rows={4}
                  placeholder={'64f...\n64a...'}
                  className="w-full border rounded px-3 py-2 text-sm mt-1 font-mono"
                />
              </label>
            )}

            <button
              onClick={handleBulkAssign}
              disabled={bulkAssigning || Boolean(bulkValidationError)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {bulkAssigning ? 'Assigning…' : 'Assign Coupon'}
            </button>

            {(bulkValidationError || bulkError) && (
              <p className="text-sm text-red-600">{bulkError || bulkValidationError}</p>
            )}
            {bulkResult && (
              <p className="text-sm text-emerald-700">
                Matched {bulkResult.matched} user(s) · {bulkResult.newlyAssigned} newly assigned ·{' '}
                {bulkResult.alreadyAssigned} already assigned
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
