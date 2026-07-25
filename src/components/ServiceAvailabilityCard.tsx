import React, { useEffect, useState } from 'react';
import { Zap, Calendar, Loader2 } from 'lucide-react';
import { serviceAvailabilityApi, type ServiceAvailabilityConfig } from '../api/serviceAvailabilityApi';

/**
 * Admin control for whether Instant/Scheduled bookings are accepted right
 * now, and during what daily window. Replaces the old "Instant is always
 * available" static notice — this is now a live, editable config backed by
 * ServiceAvailabilityService on the backend.
 */
export const ServiceAvailabilityCard: React.FC = () => {
  const [config, setConfig] = useState<ServiceAvailabilityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    serviceAvailabilityApi
      .get()
      .then(setConfig)
      .catch((e) => setError(e.message ?? 'Failed to load service availability'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch: Partial<ServiceAvailabilityConfig>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await serviceAvailabilityApi.update(patch);
      setConfig(saved);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
      setConfig(config); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-6">
        <Loader2 size={18} className="animate-spin text-slate-400" />
      </div>
    );
  }
  if (!config) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ServiceRow
        icon={<Zap size={18} className="text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-100 dark:bg-amber-900/40"
        title="Instant Service"
        enabled={config.instantEnabled}
        startTime={config.instantStartTime}
        endTime={config.instantEndTime}
        saving={saving}
        onToggle={(v) => save({ instantEnabled: v })}
        onStartTime={(v) => save({ instantStartTime: v })}
        onEndTime={(v) => save({ instantEndTime: v })}
      />
      <ServiceRow
        icon={<Calendar size={18} className="text-blue-600 dark:text-blue-400" />}
        iconBg="bg-blue-100 dark:bg-blue-900/40"
        title="Scheduled Service"
        enabled={config.scheduledEnabled}
        startTime={config.scheduledStartTime}
        endTime={config.scheduledEndTime}
        saving={saving}
        onToggle={(v) => save({ scheduledEnabled: v })}
        onStartTime={(v) => save({ scheduledStartTime: v })}
        onEndTime={(v) => save({ scheduledEndTime: v })}
      />
      {error && (
        <div className="md:col-span-2 text-xs text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
};

const ServiceRow: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  saving: boolean;
  onToggle: (v: boolean) => void;
  onStartTime: (v: string) => void;
  onEndTime: (v: string) => void;
}> = ({ icon, iconBg, title, enabled, startTime, endTime, saving, onToggle, onStartTime, onEndTime }) => (
  <div className="flex items-start gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
    <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>{icon}</div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800 dark:text-white">{title}</p>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 dark:bg-white/10 peer-checked:bg-brand rounded-full peer transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
        </label>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="time"
          value={startTime}
          disabled={!enabled || saving}
          onChange={(e) => onStartTime(e.target.value)}
          className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 disabled:opacity-50"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="time"
          value={endTime}
          disabled={!enabled || saving}
          onChange={(e) => onEndTime(e.target.value)}
          className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 disabled:opacity-50"
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        {enabled ? `Bookings accepted ${startTime}–${endTime} daily (IST)` : 'Disabled — hidden from customers, cannot be booked'}
      </p>
    </div>
  </div>
);
