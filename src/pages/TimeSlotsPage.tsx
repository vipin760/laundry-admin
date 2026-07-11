import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { timeSlotsApi } from '../api/timeSlotsApi';
import type { SlotStat, CreateSlotPayload, SlotType } from '../api/timeSlotsApi';
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Zap,
  X,
  Loader2,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  pickup: 'Pickup', delivery: 'Delivery', both: 'Both',
};

const EMPTY_FORM: CreateSlotPayload = {
  label: '',
  startTime: '',
  endTime: '',
  type: 'both',
  daysAvailable: [...ALL_DAYS],
  capacity: undefined,
  expectedTurnaround: '',
  isActive: true,
  sortOrder: 0,
};

/** Returns today's date as YYYY-MM-DD in local time */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns current HH:MM time string */
function currentHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Maps a YYYY-MM-DD date string to its day-of-week key, in local time. */
function dayKeyForDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  return ALL_DAYS[day === 0 ? 6 : day - 1];
}

// ── Deactivation confirmation modal ──────────────────────────────────────────

interface DeactivateModalProps {
  slotLabel: string;
  orderCount: number;
  onConfirm: (graceMinutes: number) => void;
  onCancel: () => void;
}

const DeactivateModal: React.FC<DeactivateModalProps> = ({
  slotLabel,
  orderCount,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">
              Deactivate "{slotLabel}"?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Users will no longer see this slot for new bookings.
            </p>
          </div>
        </div>

        {orderCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2.5 mb-4">
            <ShoppingBag size={14} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>{orderCount} order{orderCount !== 1 ? 's' : ''}</strong> already placed in this slot today.
            </p>
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400">
          If a user is currently selecting this slot in the app, deactivating now will
          remove it from their screen mid-checkout. A <strong>5-minute grace period</strong> keeps
          the slot visible for users already in the booking flow.
        </p>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-2">
        <button
          onClick={() => onConfirm(5)}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Clock size={15} />
          Deactivate in 5 minutes (recommended)
        </button>
        <button
          onClick={() => onConfirm(0)}
          className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Deactivate now
        </button>
        <button
          onClick={onCancel}
          className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const TimeSlotsPage: React.FC = () => {
  const [slots, setSlots] = useState<SlotStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsDate, setStatsDate] = useState(todayStr());

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSlotPayload>(EMPTY_FORM);

  // Deactivation confirmation
  const [deactivatingSlot, setDeactivatingSlot] = useState<SlotStat | null>(null);

  const fetchSlots = useCallback(async (date = statsDate) => {
    setLoading(true);
    setError(null);
    try {
      const data = await timeSlotsApi.stats(date);
      setSlots(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }, [statsDate]);

  useEffect(() => { fetchSlots(statsDate); }, [statsDate, fetchSlots]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (slot: SlotStat) => {
    setEditingId(slot._id);
    setForm({
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      daysAvailable: slot.daysAvailable,
      capacity: slot.capacity,
      expectedTurnaround: slot.expectedTurnaround ?? '',
      isActive: slot.isActive,
      sortOrder: slot.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.startTime || !form.endTime) {
      setError('Label, start time, and end time are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: CreateSlotPayload = {
        ...form,
        label: form.label.trim(),
        expectedTurnaround: form.expectedTurnaround?.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      if (editingId) {
        await timeSlotsApi.update(editingId, payload);
      } else {
        await timeSlotsApi.create(payload);
      }
      setShowModal(false);
      fetchSlots(statsDate);
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /**
   * When toggling OFF (deactivating), show the confirmation modal.
   * When toggling ON (activating), do it immediately — no risk to users.
   */
  const handleToggleRequest = (slot: SlotStat) => {
    if (slot.isActive) {
      setDeactivatingSlot(slot);
    } else {
      void doToggle(slot._id, true, 0);
    }
  };

  const doToggle = async (id: string, isActive: boolean, graceMinutes: number) => {
    setDeactivatingSlot(null);
    try {
      await timeSlotsApi.toggle(id, isActive, graceMinutes);
      fetchSlots(statsDate);
    } catch (e: any) {
      setError(e.message ?? 'Toggle failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this time slot permanently?')) return;
    try {
      await timeSlotsApi.remove(id);
      fetchSlots(statsDate);
    } catch (e: any) {
      setError(e.message ?? 'Delete failed');
    }
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      daysAvailable: f.daysAvailable.includes(day)
        ? f.daysAvailable.filter((d) => d !== day)
        : [...f.daysAvailable, day],
    }));
  };

  const now = currentHHMM();
  const isViewingToday = statsDate === todayStr();
  const viewedDayKey = dayKeyForDateStr(statsDate);
  const hasCoverageForViewedDay = slots.some(
    (s) => s.isActive && s.daysAvailable.includes(viewedDayKey),
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Standard Time Slots
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage pickup &amp; delivery slots shown to users. Past slots are hidden automatically.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold hover:bg-brand/90 transition-colors"
          >
            <Plus size={16} />
            Add Slot
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Instant slot info card */}
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              Instant Option (always available)
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              The <strong>Instant</strong> slot is automatically shown to users — delivery partner
              reaches in ~15 minutes. You cannot edit or delete it here.
            </p>
          </div>
        </div>

        {/* Date selector for stats */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Showing orders for:
          </label>
          <input
            type="date"
            value={statsDate}
            onChange={(e) => setStatsDate(e.target.value)}
            className="text-sm border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          {!isViewingToday && (
            <button
              onClick={() => setStatsDate(todayStr())}
              className="text-xs text-brand hover:underline font-semibold"
            >
              Back to today
            </button>
          )}
        </div>

        {/* Warn when no active slot covers the viewed day — users fall back to the generic "Full Day" slot on that day */}
        {!loading && slots.length > 0 && !hasCoverageForViewedDay && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>No active slots cover {DAY_LABELS[viewedDayKey]}</strong> ({statsDate}).
              Users booking on this date will see the generic "Full Day" fallback instead of
              your configured slots.
            </p>
          </div>
        )}

        {/* Slots table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No slots yet</p>
            <p className="text-sm mt-1">Click "Add Slot" to create the first one.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0A0A0A] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Label</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Days</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Capacity</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">
                    Orders {isViewingToday ? 'Today' : statsDate.slice(5)}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-black text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {slots.map((slot) => {
                  const isPast = isViewingToday && slot.endTime <= now;
                  const isGrace = !slot.isActive && slot.effectiveUntil && new Date(slot.effectiveUntil) > new Date();
                  const capacityFull = slot.capacity != null && slot.orderCount >= slot.capacity;

                  return (
                    <tr
                      key={slot._id}
                      className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${isPast ? 'opacity-50' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Clock size={14} className="text-brand shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white">{slot.label}</span>
                          {isPast && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                              PAST
                            </span>
                          )}
                          {isGrace && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              GRACE UNTIL {new Date(slot.effectiveUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {slot.expectedTurnaround && (
                          <p className="text-xs text-slate-400 mt-0.5 pl-5">{slot.expectedTurnaround}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {slot.startTime} – {slot.endTime}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                          ${slot.type === 'pickup' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : slot.type === 'delivery' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                          {SLOT_TYPE_LABELS[slot.type]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {ALL_DAYS.map((d) => (
                            <span
                              key={d}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                                ${slot.daysAvailable.includes(d)
                                  ? 'bg-brand/10 text-brand'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600'}`}
                            >
                              {DAY_LABELS[d]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {slot.capacity != null ? (
                          <span className={capacityFull ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                            {slot.capacity}
                            {capacityFull && ' (FULL)'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unlimited</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-black ${slot.orderCount > 0 ? 'text-brand' : 'text-slate-300 dark:text-slate-600'}`}>
                            {slot.orderCount}
                          </span>
                          {slot.capacity != null && (
                            <div className="flex-1 min-w-[48px] max-w-[80px]">
                              <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${capacityFull ? 'bg-red-500' : 'bg-brand'}`}
                                  style={{ width: `${Math.min(100, (slot.orderCount / slot.capacity!) * 100)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{slot.orderCount}/{slot.capacity}</p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => handleToggleRequest(slot)} className="flex items-center gap-1.5 group">
                          {slot.isActive ? (
                            <>
                              <ToggleRight size={22} className="text-brand" />
                              <span className="text-xs font-bold text-brand">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={22} className="text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">
                                {isGrace ? 'Grace…' : 'Inactive'}
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(slot)}
                            className="p-1.5 rounded-lg hover:bg-brand/10 text-slate-400 hover:text-brand transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(slot._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deactivation confirmation modal */}
      {deactivatingSlot && (
        <DeactivateModal
          slotLabel={deactivatingSlot.label}
          orderCount={deactivatingSlot.orderCount}
          onConfirm={(graceMinutes) => doToggle(deactivatingSlot._id, false, graceMinutes)}
          onCancel={() => setDeactivatingSlot(null)}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {editingId ? 'Edit Time Slot' : 'New Time Slot'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 text-xs rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {/* Label */}
              <Field label="Label *">
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Morning, Evening"
                  className={inputCls}
                />
              </Field>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Time *">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="End Time *">
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Past-time warning when creating a slot that's already over today */}
              {form.startTime && form.endTime && form.endTime <= currentHHMM() && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This slot's end time ({form.endTime}) has already passed today. It will not be shown to users until tomorrow.
                  </p>
                </div>
              )}

              {/* Type */}
              <Field label="Slot Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SlotType }))}
                  className={inputCls}
                >
                  <option value="both">Both (Pickup & Delivery)</option>
                  <option value="pickup">Pickup only</option>
                  <option value="delivery">Delivery only</option>
                </select>
              </Field>

              {/* Days */}
              <Field label="Available Days">
                <div className="flex flex-wrap gap-2 mt-1">
                  {ALL_DAYS.map((d) => {
                    const isToday = d === ALL_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                    const isSelected = form.daysAvailable.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border relative
                          ${isSelected
                            ? 'bg-brand text-white border-brand'
                            : isToday
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-400 border-dashed'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent hover:border-brand/30'}`}
                      >
                        {DAY_LABELS[d]}
                        {isToday && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const todayIdx = new Date().getDay(); // 0=Sun..6=Sat
                  const todayKey = ALL_DAYS[todayIdx === 0 ? 6 : todayIdx - 1];
                  if (!form.daysAvailable.includes(todayKey)) {
                    return (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Today ({DAY_LABELS[todayKey]}) is not selected — this slot won't appear for today's bookings.
                      </p>
                    );
                  }
                  return null;
                })()}
                {form.daysAvailable.length === 0 && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    No days selected — this slot will never appear to users.
                  </p>
                )}
              </Field>

              {/* Turnaround + Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expected Turnaround">
                  <input
                    value={form.expectedTurnaround ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, expectedTurnaround: e.target.value }))}
                    placeholder="e.g. 2–3 hrs"
                    className={inputCls}
                  />
                </Field>
                <Field label="Capacity (optional)">
                  <input
                    type="number"
                    min={1}
                    value={form.capacity ?? ''}
                    onChange={(e) => setForm((f) => ({
                      ...f, capacity: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                    placeholder="Unlimited"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Sort order + Active */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort Order">
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Active">
                  <div className="flex items-center h-[38px] gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    >
                      {form.isActive
                        ? <ToggleRight size={28} className="text-brand" />
                        : <ToggleLeft size={28} className="text-slate-400" />}
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {form.isActive ? 'Yes' : 'No'}
                    </span>
                  </div>
                </Field>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-brand text-white rounded-lg text-sm font-bold hover:bg-brand/90 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    {children}
  </div>
);
