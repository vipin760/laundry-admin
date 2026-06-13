import React, { useEffect, useMemo, useState } from 'react';
import GooglePlacesAutocomplete, { geocodeByPlaceId } from 'react-google-places-autocomplete';
import { MapPin, Plus, Save, X, Loader2, Power, PowerOff, CalendarDays } from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  defaultWorkingSchedule,
} from '../api/locationsApi';
import type { DaySchedule, LocationEntity, PaymentMethod, ServiceAreaType, TimeSlot } from '../api/locationsApi';
import { useLocationsStore } from '../store/useLocationsStore';

type LocationFormState = {
  shopName: string;
  city: string;
  fullAddress: string;
  contactNumber: string;
  latitude: string;
  longitude: string;
  serviceAreaType: ServiceAreaType;
  serviceRadiusKm: string;
  polygonText: string;
  timezone: string;
  dailyBookingLimit: string;
  pricingProfileKey: string;
  enabledPaymentMethods: PaymentMethod[];
  workingSchedule: DaySchedule[];
  pickupSlotsText: string;
  deliverySlotsText: string;
};

const emptyForm = (): LocationFormState => ({
  shopName: '',
  city: '',
  fullAddress: '',
  contactNumber: '',
  latitude: '',
  longitude: '',
  serviceAreaType: 'radius',
  serviceRadiusKm: '8',
  polygonText: '',
  timezone: 'Asia/Kolkata',
  dailyBookingLimit: '200',
  pricingProfileKey: '',
  enabledPaymentMethods: ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'],
  workingSchedule: defaultWorkingSchedule.map((item) => ({ ...item })),
  pickupSlotsText: 'Morning|09:00|11:00|40\nAfternoon|12:00|15:00|60\nEvening|16:00|19:00|50',
  deliverySlotsText: 'Same Day|14:00|18:00|40\nNext Day Morning|09:00|12:00|60',
});

export const LocationsPage: React.FC = () => {
  const {
    items,
    total,
    isLoading,
    error,
    closuresByLocation,
    fetchLocations,
    addLocation,
    updateLocation,
    toggleLocationStatus,
    fetchClosures,
    addClosure,
  } = useLocationsStore();

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [selected, setSelected] = useState<LocationEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<LocationFormState>(emptyForm());
  const [closureForm, setClosureForm] = useState({ startDate: '', endDate: '', reason: '', note: '' });

  useEffect(() => {
    void fetchLocations({ includeInactive: true, page: 1, limit: 50 });
  }, [fetchLocations]);

  useEffect(() => {
    if (selected) {
      void fetchClosures(selected._id);
    }
  }, [selected, fetchClosures]);

  const filteredItems = useMemo(() => {
    const key = search.trim().toLowerCase();
    const city = cityFilter.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !key ||
        item.shopName.toLowerCase().includes(key) ||
        item.fullAddress.toLowerCase().includes(key);
      const matchesCity = !city || item.city.toLowerCase().includes(city);
      return matchesSearch && matchesCity;
    });
  }, [items, search, cityFilter]);

  const selectedClosures = selected ? closuresByLocation[selected._id] || [] : [];

  function openCreateModal() {
    setIsEditMode(false);
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  function openEditModal(location: LocationEntity) {
    setIsEditMode(true);
    setForm(mapLocationToForm(location));
    setSelected(location);
    setIsModalOpen(true);
  }

  async function onSubmitLocation(event: React.FormEvent) {
    event.preventDefault();
    const payload = parseFormToPayload(form);

    if (isEditMode && selected) {
      await updateLocation(selected._id, payload);
    } else {
      await addLocation(payload);
    }

    setIsModalOpen(false);
    setForm(emptyForm());
  }

  async function onToggleStatus(location: LocationEntity) {
    await toggleLocationStatus(location._id, !location.isActive);
  }

  async function onAddClosure(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await addClosure(selected._id, closureForm);
    setClosureForm({ startDate: '', endDate: '', reason: '', note: '' });
  }

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Multi-Location Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage branches, schedules, closures, service zones, and capacity.</p>
        </div>
        <button onClick={openCreateModal} className="btn-brand text-sm">
          <Plus size={16} />
          <span>Add Location</span>
        </button>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <section className="premium-card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search location"
              className="input-premium"
            />
            <input
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              placeholder="Filter by city"
              className="input-premium"
            />
          </div>

          <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {isLoading && items.length === 0 ? (
              <div className="p-8 flex items-center justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No locations found.</div>
            ) : (
              filteredItems.map((location) => (
                <div
                  key={location._id}
                  className={`p-4 cursor-pointer transition ${selected?._id === location._id ? 'bg-brand/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  onClick={() => setSelected(location)}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{location.shopName}</p>
                      <p className="text-xs text-slate-500">{location.city}</p>
                      <p className="text-xs text-slate-400 mt-1">{location.fullAddress}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black ${location.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                      {location.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="btn-ghost text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(location);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-ghost text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        void onToggleStatus(location);
                      }}
                    >
                      {location.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                      <span>{location.isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 text-xs text-slate-500 border-t border-slate-100 dark:border-white/5">
            Total Locations: {total}
          </div>
        </section>

        <section className="premium-card">
          {selected ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="text-brand" size={18} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selected.shopName}</h2>
              </div>
              <p className="text-sm text-slate-500 mb-2">{selected.fullAddress}</p>
              <p className="text-xs text-slate-500 mb-4">Capacity/day: {selected.dailyBookingLimit}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {(selected.enabledPaymentMethods || []).map((method) => (
                  <span key={method} className="px-2 py-1 rounded-full text-[10px] font-black bg-brand/10 text-brand">
                    {paymentMethodLabel(method)}
                  </span>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-3">Temporary Closures</h3>
                <form onSubmit={onAddClosure} className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" required value={closureForm.startDate} onChange={(e) => setClosureForm((p) => ({ ...p, startDate: e.target.value }))} className="input-premium" />
                    <input type="date" required value={closureForm.endDate} onChange={(e) => setClosureForm((p) => ({ ...p, endDate: e.target.value }))} className="input-premium" />
                  </div>
                  <input placeholder="Reason" required value={closureForm.reason} onChange={(e) => setClosureForm((p) => ({ ...p, reason: e.target.value }))} className="input-premium" />
                  <input placeholder="Note (optional)" value={closureForm.note} onChange={(e) => setClosureForm((p) => ({ ...p, note: e.target.value }))} className="input-premium" />
                  <button className="btn-brand text-xs" type="submit">
                    <CalendarDays size={14} />
                    <span>Add Closure</span>
                  </button>
                </form>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedClosures.length === 0 ? (
                    <p className="text-xs text-slate-500">No closures configured.</p>
                  ) : (
                    selectedClosures.map((closure) => (
                      <div key={closure._id} className="p-2 rounded-lg border border-slate-200 dark:border-white/10">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{closure.reason}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(closure.startDate).toLocaleDateString()} - {new Date(closure.endDate).toLocaleDateString()}
                        </p>
                        {closure.note && <p className="text-xs text-slate-400">{closure.note}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">Select a location to view closure and branch details.</div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] p-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/45" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={onSubmitLocation} className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditMode ? 'Update Location' : 'Create Location'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="Shop Name" value={form.shopName} onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))} className="input-premium" />
              <input required placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="input-premium" />
              <input required placeholder="Contact Number" value={form.contactNumber} onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))} className="input-premium" />
              <input required placeholder="Timezone" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} className="input-premium" />
              {/* Google Places Autocomplete for Address */}
              <div className="col-span-2">
                <GooglePlacesAutocomplete
                  apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                  selectProps={{
                    placeholder: 'Search Address',
                    onChange: async (val: any) => {
                      if (!val) return;
                      const results = await geocodeByPlaceId(val.value.place_id);
                      if (results && results[0]) {
                        const loc = results[0].geometry.location;
                        setForm((p) => ({
                          ...p,
                          fullAddress: results[0].formatted_address,
                          latitude: String(loc.lat()),
                          longitude: String(loc.lng()),
                        }));
                      }
                    },
                    value: form.fullAddress ? { label: form.fullAddress, value: form.fullAddress } : null,
                  }}
                />
              </div>
              {/* Hide manual lat/lng fields, but keep for debugging or fallback */}
              {/*
              <input required placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} className="input-premium" />
              <input required placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} className="input-premium" />
              */}
              <select value={form.serviceAreaType} onChange={(e) => setForm((p) => ({ ...p, serviceAreaType: e.target.value as ServiceAreaType }))} className="input-premium">
                <option value="radius">Radius</option>
                <option value="polygon">Polygon</option>
              </select>
              <input placeholder="Radius (km)" value={form.serviceRadiusKm} onChange={(e) => setForm((p) => ({ ...p, serviceRadiusKm: e.target.value }))} className="input-premium" />
              <input required placeholder="Daily Booking Limit" value={form.dailyBookingLimit} onChange={(e) => setForm((p) => ({ ...p, dailyBookingLimit: e.target.value }))} className="input-premium" />
              <input placeholder="Pricing Profile Key" value={form.pricingProfileKey} onChange={(e) => setForm((p) => ({ ...p, pricingProfileKey: e.target.value }))} className="input-premium" />
            </div>

            <textarea required placeholder="Full Address" value={form.fullAddress} onChange={(e) => setForm((p) => ({ ...p, fullAddress: e.target.value }))} className="input-premium mt-3 h-16" />

            {form.serviceAreaType === 'polygon' && (
              <textarea
                placeholder='Polygon points JSON (example: [[[77.1,12.9],[77.2,12.9],[77.2,13.0],[77.1,12.9]]])'
                value={form.polygonText}
                onChange={(e) => setForm((p) => ({ ...p, polygonText: e.target.value }))}
                className="input-premium mt-3 h-20"
                required
              />
            )}

            <div className="mt-5">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Working Schedule</h4>
              <div className="space-y-2">
                {form.workingSchedule.map((day, index) => (
                  <div key={day.day} className="grid grid-cols-[100px_80px_1fr_1fr] gap-2 items-center">
                    <span className="text-xs font-semibold capitalize text-slate-600 dark:text-slate-300">{day.day}</span>
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(event) => {
                          const next = [...form.workingSchedule];
                          next[index] = { ...next[index], isOpen: event.target.checked };
                          setForm((prev) => ({ ...prev, workingSchedule: next }));
                        }}
                      />
                      Open
                    </label>
                    <input
                      type="time"
                      value={day.openTime || '09:00'}
                      disabled={!day.isOpen}
                      onChange={(event) => {
                        const next = [...form.workingSchedule];
                        next[index] = { ...next[index], openTime: event.target.value };
                        setForm((prev) => ({ ...prev, workingSchedule: next }));
                      }}
                      className="input-premium"
                    />
                    <input
                      type="time"
                      value={day.closeTime || '20:00'}
                      disabled={!day.isOpen}
                      onChange={(event) => {
                        const next = [...form.workingSchedule];
                        next[index] = { ...next[index], closeTime: event.target.value };
                        setForm((prev) => ({ ...prev, workingSchedule: next }));
                      }}
                      className="input-premium"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Pickup Slots</h4>
                <textarea
                  value={form.pickupSlotsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, pickupSlotsText: event.target.value }))}
                  className="input-premium h-28"
                  placeholder="Label|09:00|11:00|40"
                />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Delivery Slots</h4>
                <textarea
                  value={form.deliverySlotsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliverySlotsText: event.target.value }))}
                  className="input-premium h-28"
                  placeholder="Label|14:00|18:00|40"
                />
              </div>
            </div>

            <div className="mt-5">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Payment Methods</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {paymentMethodOptions.map((method) => (
                  <label key={method.value} className="text-xs flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-white/10">
                    <input
                      type="checkbox"
                      checked={form.enabledPaymentMethods.includes(method.value)}
                      onChange={(event) => {
                        setForm((prev) => ({
                          ...prev,
                          enabledPaymentMethods: event.target.checked
                            ? [...prev.enabledPaymentMethods, method.value]
                            : prev.enabledPaymentMethods.filter((item) => item !== method.value),
                        }));
                      }}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-5 gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-brand">
                <Save size={16} />
                <span>{isEditMode ? 'Save Changes' : 'Create Location'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

function mapLocationToForm(location: LocationEntity): LocationFormState {
  const [longitude, latitude] = location.geoPoint.coordinates;
  return {
    shopName: location.shopName,
    city: location.city,
    fullAddress: location.fullAddress,
    contactNumber: location.contactNumber,
    latitude: String(latitude),
    longitude: String(longitude),
    serviceAreaType: location.serviceAreaType,
    serviceRadiusKm: String(location.serviceRadiusKm ?? 8),
    polygonText: location.servicePolygon ? JSON.stringify(location.servicePolygon.coordinates) : '',
    timezone: location.timezone,
    dailyBookingLimit: String(location.dailyBookingLimit),
    pricingProfileKey: location.pricingProfileKey ?? '',
    enabledPaymentMethods: location.enabledPaymentMethods?.length
      ? location.enabledPaymentMethods
      : ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'],
    workingSchedule: location.workingSchedule.map((item) => ({ ...item })),
    pickupSlotsText: stringifySlots(location.pickupSlots),
    deliverySlotsText: stringifySlots(location.deliverySlots),
  };
}

function stringifySlots(slots: TimeSlot[]) {
  return slots
    .map((slot) => `${slot.label}|${slot.startTime}|${slot.endTime}|${slot.capacity ?? ''}`)
    .join('\n');
}

function parseSlots(text: string): TimeSlot[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, startTime, endTime, capacity] = line.split('|').map((part) => part?.trim());
      return {
        label,
        startTime,
        endTime,
        capacity: capacity ? Number(capacity) : undefined,
      };
    });
}

function parseFormToPayload(form: LocationFormState) {
  let servicePolygon: number[][][] | undefined;
  if (form.serviceAreaType === 'polygon') {
    try {
      servicePolygon = JSON.parse(form.polygonText);
    } catch {
      throw new Error('Invalid polygon JSON');
    }
  }

  return {
    shopName: form.shopName.trim(),
    city: form.city.trim(),
    fullAddress: form.fullAddress.trim(),
    contactNumber: form.contactNumber.trim(),
    geoPoint: {
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    },
    serviceAreaType: form.serviceAreaType,
    serviceRadiusKm:
      form.serviceAreaType === 'radius' ? Number(form.serviceRadiusKm || 0) : undefined,
    servicePolygon,
    timezone: form.timezone.trim(),
    dailyBookingLimit: Number(form.dailyBookingLimit),
    pricingProfileKey: form.pricingProfileKey.trim() || undefined,
    enabledPaymentMethods: form.enabledPaymentMethods,
    workingSchedule: form.workingSchedule,
    pickupSlots: parseSlots(form.pickupSlotsText),
    deliverySlots: parseSlots(form.deliverySlotsText),
  };
}

const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'wallet', label: 'Wallets' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
];

function paymentMethodLabel(value: PaymentMethod) {
  return paymentMethodOptions.find((item) => item.value === value)?.label ?? value;
}
