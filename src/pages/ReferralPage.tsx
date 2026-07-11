import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Search,
  Download,
  Settings as SettingsIcon,
  Loader2,
} from 'lucide-react';
import {
  referralApi,
  STATUS_LABELS,
  REWARD_TYPE_LABELS,
  type DashboardSummary,
  type Referral,
  type ReferralSettings,
  type ReferralStatus,
  type RewardType,
} from '../api/referralApi';

const STATUS_STYLES: Record<ReferralStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  REGISTERED: 'bg-blue-100 text-blue-700',
  FIRST_ORDER_COMPLETED: 'bg-cyan-100 text-cyan-700',
  PAYMENT_COMPLETED: 'bg-indigo-100 text-indigo-700',
  REWARD_RELEASED: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-gray-200 text-gray-600',
  REJECTED: 'bg-red-100 text-red-700',
};

export const ReferralPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, list] = await Promise.all([
        referralApi.dashboard(),
        referralApi.list({ search, status: statusFilter, page, limit: 20 }),
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

  const act = async (
    fn: () => Promise<unknown>,
    id: string,
  ) => {
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

  const cards = useMemo(
    () => [
      { label: 'Total Referrals', value: summary?.totalReferrals ?? 0, icon: Users, color: 'text-blue-600' },
      { label: 'Pending', value: summary?.pendingReferrals ?? 0, icon: Clock, color: 'text-amber-600' },
      { label: 'Completed', value: summary?.completedReferrals ?? 0, icon: CheckCircle2, color: 'text-emerald-600' },
      { label: 'Rejected', value: summary?.rejectedReferrals ?? 0, icon: XCircle, color: 'text-red-600' },
      { label: 'Reward Paid', value: `₹${summary?.rewardPaid ?? 0}`, icon: IndianRupee, color: 'text-emerald-600' },
      { label: 'Reward Pending', value: `₹${summary?.rewardPending ?? 0}`, icon: IndianRupee, color: 'text-amber-600' },
    ],
    [summary],
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Refer &amp; Earn</h1>
          <div className="flex gap-2">
            <a
              href={referralApi.exportUrl('csv', statusFilter)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              <Download size={16} /> CSV
            </a>
            <a
              href={referralApi.exportUrl('excel', statusFilter)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              <Download size={16} /> Excel
            </a>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            >
              <SettingsIcon size={16} /> Settings
            </button>
          </div>
        </div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <c.icon className={`${c.color} mb-2`} size={20} />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Most active referrers + top cities */}
        <div className="grid md:grid-cols-2 gap-4">
          <MiniList
            title="Most Active Referrers"
            items={(summary?.mostActiveReferrers ?? []).map((r) => ({
              label: r.name,
              value: `${r.count}`,
            }))}
          />
          <MiniList
            title="Top Cities"
            items={(summary?.topCities ?? []).map((c) => ({
              label: c.city,
              value: `${c.count}`,
            }))}
          />
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
              placeholder="Search code / user id"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_LABELS).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s as ReferralStatus]}
              </option>
            ))}
          </select>
        </div>

        {/* Management table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Referee</th>
                <th className="p-3">Status</th>
                <th className="p-3">First Order</th>
                <th className="p-3">Fraud</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="animate-spin inline" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No referrals found
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3 font-mono">{r.code}</td>
                    <td className="p-3 text-gray-500">{r.refereeId.slice(-6)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_STYLES[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.firstOrderValue ? `₹${r.firstOrderValue}` : '—'}
                    </td>
                    <td className="p-3">
                      {r.fraudSuspected ? (
                        <span className="text-red-600" title={(r.fraudReasons || []).join(', ')}>
                          ⚠ {r.fraudReasons?.length ?? 0}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <ActionBtn
                          label="Release"
                          disabled={busyId === r._id || r.status === 'REWARD_RELEASED'}
                          onClick={() => act(() => referralApi.release(r._id), r._id)}
                          className="bg-emerald-600"
                        />
                        <ActionBtn
                          label="Reject"
                          disabled={busyId === r._id}
                          onClick={() => {
                            const reason = prompt('Reject reason?') || '';
                            act(() => referralApi.reject(r._id, reason), r._id);
                          }}
                          className="bg-red-600"
                        />
                        <ActionBtn
                          label="Reverse"
                          disabled={busyId === r._id || r.status !== 'REWARD_RELEASED'}
                          onClick={() => {
                            const reason = prompt('Reverse reason?') || '';
                            act(() => referralApi.reverse(r._id, reason), r._id);
                          }}
                          className="bg-orange-600"
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

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </AdminLayout>
  );
};

const MiniList: React.FC<{
  title: string;
  items: Array<{ label: string; value: string }>;
}> = ({ title, items }) => (
  <div className="bg-white rounded-xl border p-4">
    <h3 className="font-semibold mb-3">{title}</h3>
    {items.length === 0 ? (
      <p className="text-sm text-gray-400">No data</p>
    ) : (
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span>{it.label}</span>
            <span className="font-semibold">{it.value}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ActionBtn: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ label, onClick, disabled, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-2 py-1 rounded text-xs text-white disabled:opacity-40 ${className}`}
  >
    {label}
  </button>
);

// ── Settings modal ────────────────────────────────────────────────────────────

/** Field metadata: label + hint + bounds. Bounds mirror the backend DTO. */
const NUM_FIELDS: Array<{
  key: keyof ReferralSettings;
  label: string;
  hint?: string;
  min: number;
  max?: number;
}> = [
  { key: 'referrerRewardAmount', label: 'Referrer reward (₹)', hint: 'Paid to the inviter', min: 0 },
  { key: 'refereeRewardAmount', label: 'New user reward (₹)', hint: 'Welcome bonus for the friend', min: 0 },
  { key: 'rewardPercentage', label: 'Reward percentage (%)', hint: 'Only for “% of first order”', min: 0, max: 100 },
  { key: 'minimumOrderValue', label: 'Min. first order (₹)', hint: 'Order value needed to qualify', min: 0 },
  { key: 'maximumReferralReward', label: 'Max reward cap (₹)', hint: '0 = no cap', min: 0 },
  { key: 'codeLength', label: 'Referral code length', hint: 'New codes only (4–12 chars)', min: 4, max: 12 },
  { key: 'referralExpiryDays', label: 'Reward expiry (days)', hint: 'Window after friend joins', min: 1 },
  { key: 'dailyLimit', label: 'Daily referral limit', hint: '0 = unlimited', min: 0 },
  { key: 'monthlyLimit', label: 'Monthly referral limit', hint: '0 = unlimited', min: 0 },
  { key: 'lifetimeLimit', label: 'Max referrals per user', hint: '0 = unlimited', min: 0 },
];

const BOOL_FIELDS: Array<{ key: keyof ReferralSettings; label: string }> = [
  { key: 'blockSameDevice', label: 'Block same-device referrals' },
  { key: 'blockSameIp', label: 'Block same-IP referrals' },
  { key: 'vpnDetectionEnabled', label: 'VPN detection' },
  { key: 'pushNotificationsEnabled', label: 'Push notifications' },
  { key: 'emailNotificationsEnabled', label: 'Email notifications' },
];

/** Only these keys are sent to the backend (mirrors UpdateReferralSettingsDto). */
const DTO_KEYS: Array<keyof ReferralSettings> = [
  'referralEnabled',
  'codeLength',
  'rewardType',
  'referrerRewardAmount',
  'refereeRewardAmount',
  'rewardPercentage',
  'minimumOrderValue',
  'maximumReferralReward',
  'referralExpiryDays',
  'dailyLimit',
  'monthlyLimit',
  'lifetimeLimit',
  'blockSameDevice',
  'blockSameIp',
  'vpnDetectionEnabled',
  'pushNotificationsEnabled',
  'emailNotificationsEnabled',
];

const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    referralApi
      .getSettings()
      .then((s) => setSettings({ ...s, codeLength: s.codeLength ?? 7 }))
      .catch((e) => setLoadError((e as Error).message));
  }, []);

  const set = <K extends keyof ReferralSettings>(k: K, v: ReferralSettings[K]) =>
    setSettings((s) => (s ? { ...s, [k]: v } : s));

  /** Client-side validation matching the backend DTO bounds. */
  const validationError = useMemo(() => {
    if (!settings) return null;
    for (const f of NUM_FIELDS) {
      const v = Number(settings[f.key]);
      if (Number.isNaN(v)) return `${f.label} must be a number`;
      if (v < f.min) return `${f.label} must be at least ${f.min}`;
      if (f.max !== undefined && v > f.max)
        return `${f.label} must be at most ${f.max}`;
      if (f.key !== 'rewardPercentage' && !Number.isFinite(v))
        return `${f.label} is invalid`;
    }
    if (
      settings.rewardType === 'PERCENTAGE' &&
      settings.rewardPercentage <= 0
    ) {
      return 'Reward percentage must be above 0 for “% of first order”';
    }
    return null;
  }, [settings]);

  const save = async () => {
    if (!settings || validationError) return;
    setSaving(true);
    setError(null);
    try {
      // Send only DTO-whitelisted fields — never _id/key/timestamps.
      const payload: Partial<ReferralSettings> = {};
      for (const k of DTO_KEYS) {
        (payload as Record<string, unknown>)[k] = settings[k];
      }
      await referralApi.updateSettings(payload);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isPercentage = settings?.rewardType === 'PERCENTAGE';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold mb-4">Referral Settings</h2>
        {loadError ? (
          <p className="text-sm text-red-600">
            Failed to load settings: {loadError}
          </p>
        ) : !settings ? (
          <Loader2 className="animate-spin" />
        ) : (
          <div className="space-y-5">
            {/* Master switch */}
            <label className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-3">
              <div>
                <div className="font-medium text-sm">Referral programme</div>
                <div className="text-xs text-gray-500">
                  Turning this off hides Refer &amp; Earn and blocks new referrals
                  immediately.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.referralEnabled}
                onChange={(e) => set('referralEnabled', e.target.checked)}
                className="h-5 w-5 accent-indigo-600"
              />
            </label>

            {/* Reward type */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Rewards</h3>
              <label className="block mb-3">
                <span className="text-xs text-gray-500">Reward type</span>
                <select
                  value={settings.rewardType}
                  onChange={(e) => set('rewardType', e.target.value as RewardType)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  {(Object.keys(REWARD_TYPE_LABELS) as RewardType[]).map((t) => (
                    <option key={t} value={t}>
                      {REWARD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {NUM_FIELDS.filter(
                  (f) =>
                    ['referrerRewardAmount', 'refereeRewardAmount', 'rewardPercentage', 'minimumOrderValue', 'maximumReferralReward'].includes(f.key) &&
                    (f.key !== 'rewardPercentage' || isPercentage),
                ).map((f) => (
                  <NumField key={f.key} field={f} settings={settings} set={set} />
                ))}
              </div>
            </div>

            {/* Codes, expiry & limits */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Codes, expiry &amp; limits</h3>
              <div className="grid grid-cols-2 gap-3">
                {NUM_FIELDS.filter((f) =>
                  ['codeLength', 'referralExpiryDays', 'dailyLimit', 'monthlyLimit', 'lifetimeLimit'].includes(f.key),
                ).map((f) => (
                  <NumField key={f.key} field={f} settings={settings} set={set} />
                ))}
              </div>
            </div>

            {/* Fraud & notifications */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Fraud &amp; notifications</h3>
              <div className="grid grid-cols-2 gap-2">
                {BOOL_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(settings[f.key])}
                      onChange={(e) => set(f.key, e.target.checked as never)}
                      className="accent-indigo-600"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Live user-side preview — mirrors the app's Refer & Earn hero card */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">
                User sees (Refer &amp; Earn)
              </div>
              {settings.referralEnabled ? (
                <p className="text-sm text-indigo-900">
                  Get{' '}
                  <strong>
                    {isPercentage
                      ? `${settings.rewardPercentage}% (max ₹${settings.maximumReferralReward || '∞'})`
                      : `₹${settings.referrerRewardAmount}`}
                  </strong>{' '}
                  when a friend completes their first order of{' '}
                  <strong>₹{settings.minimumOrderValue}</strong> or more. They
                  get <strong>₹{settings.refereeRewardAmount}</strong> too!
                </p>
              ) : (
                <p className="text-sm text-indigo-900">
                  Referral programme is currently <strong>paused</strong> — users
                  cannot apply codes.
                </p>
              )}
              <p className="text-[11px] text-indigo-400 mt-2">
                The app refreshes these values within ~1 minute of saving.
              </p>
            </div>

            {(validationError || error) && (
              <p className="text-sm text-red-600">{validationError || error}</p>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !settings || Boolean(validationError)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const NumField: React.FC<{
  field: { key: keyof ReferralSettings; label: string; hint?: string; min: number; max?: number };
  settings: ReferralSettings;
  set: <K extends keyof ReferralSettings>(k: K, v: ReferralSettings[K]) => void;
}> = ({ field, settings, set }) => (
  <label className="block">
    <span className="text-xs text-gray-600">{field.label}</span>
    <input
      type="number"
      min={field.min}
      max={field.max}
      value={Number(settings[field.key] ?? 0)}
      onChange={(e) => set(field.key, Number(e.target.value) as never)}
      className="w-full border rounded px-2 py-1.5 text-sm"
    />
    {field.hint && (
      <span className="text-[11px] text-gray-400">{field.hint}</span>
    )}
  </label>
);
