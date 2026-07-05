import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  Trash2,
  Clock,
  CheckCircle2,
  Undo2,
  Search,
  Download,
  Loader2,
  History,
  X,
} from 'lucide-react';
import {
  accountDeletionApi,
  DELETE_STATUS_LABELS,
  type AuditEntry,
  type DeleteDashboard,
  type DeleteRequest,
  type DeleteRequestStatus,
} from '../api/accountDeletionApi';

const STATUS_STYLES: Record<DeleteRequestStatus, string> = {
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-red-100 text-red-700',
  CLEANED: 'bg-gray-200 text-gray-600',
  REJECTED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export const DeleteRequestsPage: React.FC = () => {
  const [summary, setSummary] = useState<DeleteDashboard | null>(null);
  const [rows, setRows] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{ id: string; entries: AuditEntry[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, list] = await Promise.all([
        accountDeletionApi.dashboard(),
        accountDeletionApi.history({ search, status: statusFilter, page, limit: 20 }),
      ]);
      setSummary(dash);
      setRows(list.data);
      setTotalPages(list.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

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

  const openTimeline = async (id: string) => {
    try {
      const entries = await accountDeletionApi.timeline(id);
      setTimeline({ id, entries });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const cards = useMemo(
    () => [
      { label: 'Total Requests', value: summary?.totalRequests ?? 0, icon: Trash2, color: 'text-blue-600' },
      { label: 'Completed', value: summary?.completed ?? 0, icon: CheckCircle2, color: 'text-red-600' },
      { label: 'Pending', value: summary?.pending ?? 0, icon: Clock, color: 'text-amber-600' },
      { label: 'Rejected', value: summary?.rejected ?? 0, icon: Undo2, color: 'text-emerald-600' },
      { label: 'Avg Processing', value: `${summary?.avgProcessingMinutes ?? 0} min`, icon: Clock, color: 'text-indigo-600' },
    ],
    [summary],
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Account Deletion Requests</h1>
          <div className="flex gap-2">
            <a href={accountDeletionApi.exportUrl('csv', statusFilter)}
               className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
              <Download size={16} /> CSV
            </a>
            <a href={accountDeletionApi.exportUrl('excel', statusFilter)}
               className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
              <Download size={16} /> Excel
            </a>
          </div>
        </div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search name / email / mobile"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-72"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {Object.keys(DELETE_STATUS_LABELS).map((s) => (
              <option key={s} value={s}>{DELETE_STATUS_LABELS[s as DeleteRequestStatus]}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Requested</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No requests found</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.userName || '—'}</div>
                      <div className="text-xs text-gray-400">{r.userEmail || r.userMobile || r.userId.slice(-6)}</div>
                    </td>
                    <td className="p-3 text-gray-600">{r.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_STYLES[r.status]}`}>
                        {DELETE_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openTimeline(r._id)}
                          className="px-2 py-1 rounded text-xs border inline-flex items-center gap-1">
                          <History size={13} /> Timeline
                        </button>
                        <button
                          disabled={busyId === r._id || r.status === 'CLEANED' || r.status === 'REJECTED'}
                          onClick={() => {
                            const reason = prompt('Reason for restoring this account?') || '';
                            act(() => accountDeletionApi.reject(r._id, reason), r._id);
                          }}
                          className="px-2 py-1 rounded text-xs text-white bg-emerald-600 disabled:opacity-40">
                          Restore
                        </button>
                        <button
                          disabled={busyId === r._id || r.status !== 'COMPLETED'}
                          onClick={() => {
                            if (confirm('Force immediate anonymisation? This is irreversible.'))
                              act(() => accountDeletionApi.approve(r._id), r._id);
                          }}
                          className="px-2 py-1 rounded text-xs text-white bg-red-600 disabled:opacity-40">
                          Anonymise
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* Timeline drawer */}
      {timeline && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={() => setTimeline(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Delete Timeline</h2>
              <button onClick={() => setTimeline(null)}><X size={20} /></button>
            </div>
            {timeline.entries.length === 0 ? (
              <p className="text-sm text-gray-400">No audit entries.</p>
            ) : (
              <ol className="relative border-l ml-2">
                {timeline.entries.map((e) => (
                  <li key={e._id} className="mb-6 ml-4">
                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-1.5 mt-1.5" />
                    <div className="text-sm font-semibold">{e.action}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(e.createdAt).toLocaleString()} · {e.actor}
                    </div>
                    {e.message && <div className="text-sm text-gray-600 mt-1">{e.message}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
