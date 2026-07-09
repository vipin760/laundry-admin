import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { Loader2, TrendingUp, Percent, IndianRupee, ShieldAlert } from 'lucide-react';
import { referralApi, type ReportResponse } from '../api/referralApi';

/**
 * Referral analytics: time-series volume + conversion / reward-cost / fraud-rate
 * summary. Uses a lightweight CSS bar chart (no extra chart dependency).
 */
export const ReferralAnalyticsPage: React.FC = () => {
  const [granularity, setGranularity] =
    useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    referralApi
      .report({ granularity })
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [granularity]);

  const maxTotal = useMemo(
    () => Math.max(1, ...(report?.series ?? []).map((s) => s.total)),
    [report],
  );

  const summaryCards = [
    {
      label: 'Total Referrals',
      value: report?.summary.totalReferrals ?? 0,
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      label: 'Conversion Rate',
      value: `${report?.summary.conversionRate ?? 0}%`,
      icon: Percent,
      color: 'text-emerald-600',
    },
    {
      label: 'Reward Cost',
      value: `₹${report?.summary.rewardCost ?? 0}`,
      icon: IndianRupee,
      color: 'text-amber-600',
    },
    {
      label: 'Fraud Rate',
      value: `${report?.summary.fraudRate ?? 0}%`,
      icon: ShieldAlert,
      color: 'text-red-600',
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Referral Analytics</h1>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1 rounded-md text-sm capitalize ${
                  granularity === g ? 'bg-white shadow font-semibold' : 'text-gray-500'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <c.icon className={`${c.color} mb-2`} size={20} />
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Referral volume</h3>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (report?.series.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">No data in this range.</p>
          ) : (
            <div className="flex items-end gap-2 h-56 overflow-x-auto">
              {report!.series.map((s) => (
                <div key={s.period} className="flex flex-col items-center gap-1 min-w-[36px]">
                  <div className="flex flex-col justify-end h-44 w-6">
                    <div
                      className="bg-emerald-400 rounded-t"
                      style={{ height: `${(s.completed / maxTotal) * 100}%` }}
                      title={`${s.completed} completed`}
                    />
                    <div
                      className="bg-blue-400"
                      style={{
                        height: `${((s.total - s.completed) / maxTotal) * 100}%`,
                      }}
                      title={`${s.total} total`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                    {s.period}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-6 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-400 inline-block rounded" /> Total
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-emerald-400 inline-block rounded" /> Completed
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
