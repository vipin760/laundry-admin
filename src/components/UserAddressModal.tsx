import React, { useState, useEffect } from 'react';
import {
  X, Plus, Pencil, Trash2, Star, StarOff, Search, MapPin,
  Home, Building2, Loader2, CheckCircle2,
} from 'lucide-react';
import { useUsersStore } from '../store/useUsersStore';
import { usersApi } from '../api/usersApi';
import type { UserAddress, UserAddressPayload, GeocodeCandidate } from '../api/usersApi';

// ─── blank form ──────────────────────────────────────────────────────────────
const BLANK: UserAddressPayload = {
  houseNo: '', buildingName: '', street: '', area: '',
  landmark: '', city: '', state: '', pincode: '',
  type: 'Home', instructions: '', isDefault: false,
  lat: undefined, lng: undefined,
};

// ─── Address type options ─────────────────────────────────────────────────────
const ADDRESS_TYPES = ['Home', 'Work', 'Hotel', 'Other'];

// ─── Address form ─────────────────────────────────────────────────────────────
interface AddressFormProps {
  initial?: UserAddressPayload;
  onSave: (data: UserAddressPayload) => void;
  onCancel: () => void;
  saving: boolean;
}

const AddressForm: React.FC<AddressFormProps> = ({ initial = BLANK, onSave, onCancel, saving }) => {
  const [form, setForm] = useState<UserAddressPayload>({ ...BLANK, ...initial });
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const set = (key: keyof UserAddressPayload, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Auto-fetch: debounced geocode on query change
  const handleGeocodeSearch = async () => {
    if (!geocodeQuery.trim()) { setCandidates([]); return; }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const results = await usersApi.geocode(geocodeQuery, form.city || undefined);
      setCandidates(results);
    } catch {
      setGeocodeError('Geocode failed. Enter location manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const applyCandidate = (c: GeocodeCandidate) => {
    const parts = c.displayName.split(',').map((s) => s.trim());
    setForm((f) => ({
      ...f,
      street: parts[0] ?? f.street,
      area: parts[1] ?? f.area,
      city: c.city ?? f.city,
      lat: c.latitude,
      lng: c.longitude,
    }));
    setCandidates([]);
    setGeocodeQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Auto-fetch section ── */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-3">
        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
          <Search size={12} /> Auto-fetch from address
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={geocodeQuery}
            onChange={(e) => setGeocodeQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocodeSearch())}
            placeholder="e.g. Mappala House, Ponnani"
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={handleGeocodeSearch}
            disabled={geocoding || !geocodeQuery.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            {geocoding ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Search
          </button>
        </div>
        {geocodeError && <p className="text-xs text-red-500 mt-1">{geocodeError}</p>}
        {candidates.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-36 overflow-y-auto">
            {candidates.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => applyCandidate(c)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg bg-white dark:bg-[#252525] hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-start gap-2"
                >
                  <MapPin size={12} className="mt-0.5 shrink-0 text-blue-500" />
                  <span className="line-clamp-2 text-slate-700 dark:text-slate-300">{c.displayName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Manual fields ── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="House / Flat No." value={form.houseNo ?? ''} onChange={(v) => set('houseNo', v)} />
        <Field label="Building Name" value={form.buildingName ?? ''} onChange={(v) => set('buildingName', v)} />
        <Field label="Street" value={form.street ?? ''} onChange={(v) => set('street', v)} />
        <Field label="Area / Locality" value={form.area ?? ''} onChange={(v) => set('area', v)} />
        <Field label="Landmark" value={form.landmark ?? ''} onChange={(v) => set('landmark', v)} />
        <Field label="City" value={form.city ?? ''} onChange={(v) => set('city', v)} />
        <Field label="State" value={form.state ?? ''} onChange={(v) => set('state', v)} />
        <Field label="Pincode" value={form.pincode ?? ''} onChange={(v) => set('pincode', v)} />
      </div>

      {/* Lat / Lng */}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Latitude (auto-filled)"
          value={form.lat !== undefined ? String(form.lat) : ''}
          onChange={(v) => set('lat', v ? parseFloat(v) : undefined)}
          type="number"
        />
        <Field
          label="Longitude (auto-filled)"
          value={form.lng !== undefined ? String(form.lng) : ''}
          onChange={(v) => set('lng', v ? parseFloat(v) : undefined)}
          type="number"
        />
      </div>

      {/* Type + Default */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Type</label>
          <div className="flex gap-2 flex-wrap">
            {ADDRESS_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  form.type === t
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white dark:bg-[#1A1A1A] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-brand'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isDefault ?? false}
            onChange={(e) => set('isDefault', e.target.checked)}
            className="rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Set as default</span>
        </label>
      </div>

      {/* Delivery instructions */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
          Delivery Instructions
        </label>
        <textarea
          value={form.instructions ?? ''}
          onChange={(e) => set('instructions', e.target.value)}
          rows={2}
          placeholder="e.g. Ring doorbell twice"
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-brand resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-bold text-white bg-brand rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Save Address
        </button>
      </div>
    </form>
  );
};

// ─── Simple field ─────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void; type?: string;
}> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      step={type === 'number' ? 'any' : undefined}
      className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-brand"
    />
  </div>
);

// ─── Address card ─────────────────────────────────────────────────────────────
interface AddressCardProps {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  busy: boolean;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, onEdit, onDelete, onSetDefault, busy }) => {
  const lines = [
    [address.houseNo, address.buildingName].filter(Boolean).join(', '),
    [address.street, address.area].filter(Boolean).join(', '),
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <div className={`relative rounded-xl border p-4 transition-all ${
      address.isDefault
        ? 'border-brand/40 bg-brand/5 dark:bg-brand/10'
        : 'border-slate-100 dark:border-white/5 bg-white dark:bg-[#1A1A1A]'
    }`}>
      {/* Type badge + default star */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {address.type === 'Work' ? (
            <Building2 size={14} className="text-brand" />
          ) : (
            <Home size={14} className="text-brand" />
          )}
          <span className="text-xs font-bold text-brand uppercase tracking-wider">{address.type || 'Home'}</span>
          {address.isDefault && (
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              Default
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!address.isDefault && (
            <button
              onClick={onSetDefault}
              disabled={busy}
              title="Set as default"
              className="p-1.5 text-slate-400 hover:text-amber-500 disabled:opacity-50 transition-colors rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              <StarOff size={14} />
            </button>
          )}
          {address.isDefault && (
            <span className="p-1.5 text-amber-400">
              <Star size={14} fill="currentColor" />
            </span>
          )}
          <button
            onClick={onEdit}
            disabled={busy}
            title="Edit"
            className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            title="Delete"
            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-50 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Address lines */}
      <div className="space-y-0.5">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-slate-700 dark:text-slate-300">{line}</p>
        ))}
        {address.landmark && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Near: {address.landmark}</p>
        )}
        {address.instructions && (
          <p className="text-xs italic text-slate-400 dark:text-slate-500 mt-1">"{address.instructions}"</p>
        )}
        {address.lat !== undefined && address.lng !== undefined && (
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            {address.lat.toFixed(5)}, {address.lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────
export const UserAddressModal: React.FC<{ userName: string }> = ({ userName }) => {
  const {
    addresses, addressesLoading, addressesError, addressModalUserId,
    closeAddressModal, addAddress, updateAddress, deleteAddress, setDefaultAddress,
  } = useUsersStore();

  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  // Reset to list whenever the modal opens for a different user
  useEffect(() => {
    setMode('list');
    setEditingAddress(null);
  }, [addressModalUserId]);

  if (!addressModalUserId) return null;

  const handleSave = async (payload: UserAddressPayload) => {
    if (mode === 'edit' && editingAddress) {
      await updateAddress(editingAddress.id, payload);
    } else {
      await addAddress(payload);
    }
    if (!useUsersStore.getState().addressesError) {
      setMode('list');
      setEditingAddress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-[#141414] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === 'list' ? 'Manage Addresses' : mode === 'add' ? 'Add Address' : 'Edit Address'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{userName}</p>
          </div>
          <button
            onClick={closeAddressModal}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {addressesError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 text-sm rounded-xl border border-red-100 dark:border-red-500/20">
              {addressesError}
            </div>
          )}

          {mode === 'list' ? (
            <>
              {addressesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 size={28} className="animate-spin text-brand" />
                  <p className="text-xs font-bold uppercase tracking-widest">Loading addresses...</p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <MapPin size={36} className="opacity-20" />
                  <p className="text-sm font-medium">No addresses yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <AddressCard
                      key={addr.id}
                      address={addr}
                      busy={addressesLoading}
                      onEdit={() => { setEditingAddress(addr); setMode('edit'); }}
                      onDelete={() => deleteAddress(addr.id)}
                      onSetDefault={() => setDefaultAddress(addr.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <AddressForm
              initial={mode === 'edit' && editingAddress
                ? { ...editingAddress }
                : undefined}
              onSave={handleSave}
              onCancel={() => { setMode('list'); setEditingAddress(null); }}
              saving={addressesLoading}
            />
          )}
        </div>

        {/* Footer (list mode only) */}
        {mode === 'list' && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={() => setMode('add')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all"
            >
              <Plus size={16} />
              Add New Address
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
