import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Plus, Save, X, Loader2, Power, PowerOff, CalendarDays, Search, Navigation, Map, LocateFixed } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usersApi } from '../api/usersApi';
import type { GeocodeCandidate } from '../api/usersApi';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  defaultWorkingSchedule,
} from '../api/locationsApi';
import type { CapacityStats, DaySchedule, LocationEntity, PaymentMethod, ServiceAreaType, TimeSlot } from '../api/locationsApi';
import { locationsApi } from '../api/locationsApi';
import { useLocationsStore } from '../store/useLocationsStore';

// ─── Map picker modal (plain Leaflet via useEffect — avoids react-leaflet/StrictMode crash) ───
interface MapPickerProps {
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number, address?: string) => void;
  onClose: () => void;
}

const MapPicker: React.FC<MapPickerProps> = ({ initialLat, initialLng, onConfirm, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const LeafletRef = useRef<typeof L | null>(null);

  const [pin, setPin] = useState<{ lat: number; lng: number }>({ lat: initialLat, lng: initialLng });
  const [reverseAddr, setReverseAddr] = useState<string | null>(null);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Search inside map picker
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep refs so Leaflet callbacks always see latest values
  const setPinRef = useRef(setPin);
  setPinRef.current = setPin;

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseAddr(null);
    setLoadingAddr(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json() as { display_name?: string };
      setReverseAddr(data.display_name ?? null);
    } catch {
      // ignore
    } finally {
      setLoadingAddr(false);
    }
  }, []);

  // Place / move the marker and pan map to a location
  const placePin = useCallback((lat: number, lng: number) => {
    const Leaflet = LeafletRef.current;
    const map = mapRef.current;
    if (!Leaflet || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = Leaflet.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], 16);
    setPinRef.current({ lat, lng });
    void reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const placePinRef = useRef(placePin);
  placePinRef.current = placePin;

  // Search Nominatim
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json() as Array<{ display_name: string; lat: string; lon: string }>;
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => void runSearch(val), 500);
  };

  // GPS: get current position
  const handleGPS = useCallback(() => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        placePinRef.current(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? 'Location access denied. Please allow in browser settings.' : 'Could not get location.');
      },
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    import('leaflet').then((Lmod) => {
      const Leaflet = Lmod.default;
      if (mapRef.current) return; // StrictMode guard

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      LeafletRef.current = Leaflet;
      const center: [number, number] = initialLat ? [initialLat, initialLng] : [20.5937, 78.9629];
      const zoom = initialLat ? 15 : 5;

      const map = Leaflet.map(containerRef.current!, { center, zoom });
      mapRef.current = map;

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (initialLat) {
        markerRef.current = Leaflet.marker([initialLat, initialLng]).addTo(map);
      }

      map.on('click', (e: L.LeafletMouseEvent) => {
        placePinRef.current(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        LeafletRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Map size={16} className="text-brand" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Pick Shop Location on Map</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1"><X size={15} /></button>
        </div>

        {/* Search bar + GPS button */}
        <div className="px-4 pt-3 pb-2 relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void runSearch(searchQuery); } }}
                placeholder="Search for a place (e.g. Ponnani beach road)"
                className="input-premium pl-8 text-xs"
              />
              {searchLoading && (
                <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>
            <button
              type="button"
              onClick={handleGPS}
              disabled={gpsLoading}
              title="Use my current GPS location"
              className="btn-ghost text-xs flex items-center gap-1 shrink-0 border border-slate-200 dark:border-white/10 disabled:opacity-50"
            >
              {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
              <span className="hidden sm:inline">My Location</span>
            </button>
          </div>

          {/* Search dropdown */}
          {searchResults.length > 0 && (
            <ul className="absolute z-10 left-4 right-4 top-full mt-0.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl max-h-44 overflow-y-auto">
              {searchResults.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      placePin(parseFloat(r.lat), parseFloat(r.lon));
                      setSearchQuery(r.display_name.split(',')[0]);
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-brand/10 flex items-start gap-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                  >
                    <MapPin size={11} className="mt-0.5 shrink-0 text-brand" />
                    <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {gpsError && <p className="text-xs text-red-500 mt-1">{gpsError}</p>}
          <p className="text-xs text-slate-400 mt-1.5">Or click directly on the map to drop a pin.</p>
        </div>

        {/* Map */}
        <div ref={containerRef} style={{ height: 320, width: '100%' }} />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 space-y-1.5">
          {pin.lat !== 0 ? (
            <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span>Lat: <strong>{pin.lat.toFixed(6)}</strong></span>
              <span>Lng: <strong>{pin.lng.toFixed(6)}</strong></span>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No pin placed yet.</p>
          )}
          {loadingAddr && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Fetching address…
            </p>
          )}
          {reverseAddr && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{reverseAddr}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-xs">Cancel</button>
            <button
              type="button"
              disabled={pin.lat === 0}
              onClick={() => onConfirm(pin.lat, pin.lng, reverseAddr ?? undefined)}
              className="btn-brand text-xs disabled:opacity-50"
            >
              <MapPin size={13} />
              <span>Use This Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  dailyBookingLimit: '0',
  pricingProfileKey: '',
  enabledPaymentMethods: ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'],
  workingSchedule: defaultWorkingSchedule.map((item) => ({ ...item })),
  pickupSlotsText: 'Morning|09:00|11:00|40\nAfternoon|12:00|15:00|60\nEvening|16:00|19:00|50',
  deliverySlotsText: 'Same Day|14:00|18:00|40\nNext Day Morning|09:00|12:00|60',
});

// ─── Address search component ─────────────────────────────────────────────────
interface AddressSearchProps {
  city: string;
  onSelect: (address: string, lat: number, lng: number) => void;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ city, onSelect }) => {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    if (!q.trim()) { setCandidates([]); return; }
    setLoading(true);
    setError(null);
    try {
      const results = await usersApi.geocode(q, city || undefined);
      setCandidates(results);
      if (results.length === 0) setError('No results found. Try a different search or enter manually below.');
    } catch {
      setError('Search failed. Enter address manually below.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 600);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search(query))}
            placeholder="Search address (e.g. Mappala House, Ponnani)"
            className="input-premium pl-8"
          />
        </div>
        <button
          type="button"
          onClick={() => search(query)}
          disabled={loading || !query.trim()}
          className="btn-brand text-xs px-3 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
          <span>Fetch</span>
        </button>
      </div>

      {error && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{error}</p>}

      {candidates.length > 0 && (
        <ul className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl max-h-52 overflow-y-auto">
          {candidates.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c.displayName, c.latitude, c.longitude);
                  setQuery(c.displayName.split(',')[0]);
                  setCandidates([]);
                }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand/10 flex items-start gap-2 border-b border-slate-100 dark:border-white/5 last:border-0"
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-brand" />
                <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{c.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
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
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [capacityStats, setCapacityStats] = useState<CapacityStats | null>(null);

  useEffect(() => {
    void fetchLocations({ includeInactive: true, page: 1, limit: 50 });
  }, [fetchLocations]);

  useEffect(() => {
    if (selected) {
      void fetchClosures(selected._id);
      const today = new Date().toISOString().slice(0, 10);
      setCapacityStats(null);
      void locationsApi.getCapacity(selected._id, today).then(setCapacityStats).catch(() => {});
    } else {
      setCapacityStats(null);
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
    let payload: ReturnType<typeof parseFormToPayload>;
    try {
      payload = parseFormToPayload(form);
    } catch (err: any) {
      alert(err?.message ?? 'Invalid form data. Please check all fields.');
      return;
    }

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

  // Unique city list for dropdown filter
  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set(items.map((l) => l.city).filter(Boolean)));
    return cities.sort();
  }, [items]);

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

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
        {/* ── Left panel ── */}
        <section className="premium-card !p-0 overflow-hidden">
          {/* Search + city filter */}
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search location"
                className="input-premium pl-9"
              />
            </div>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="input-premium min-w-[140px]"
            >
              <option value="">Filter by city</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Location cards */}
          <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {isLoading && items.length === 0 ? (
              <div className="p-10 flex items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading locations…</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">No locations found.</div>
            ) : (
              filteredItems.map((location) => {
                const [lng, lat] = location.geoPoint?.coordinates ?? [];
                const hasCoords = lat != null && lng != null;
                const isSelected = selected?._id === location._id;
                return (
                  <div
                    key={location._id}
                    onClick={() => setSelected(location)}
                    className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500' : 'hover:bg-slate-50 dark:hover:bg-white/5 border-l-4 border-transparent'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Purple shop icon */}
                      <div className="shrink-0 w-11 h-11 rounded-full bg-violet-600 flex items-center justify-center shadow-sm">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight">{location.shopName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{location.city}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${location.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {location.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{location.fullAddress}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          <span className="flex items-center gap-1 text-xs text-rose-500">
                            <MapPin size={12} className="shrink-0" />
                            {location.serviceAreaType === 'radius'
                              ? `Service radius: ${location.serviceRadiusKm ?? '?'} km`
                              : 'Polygon zone'}
                          </span>
                          {hasCoords && (
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                              title="Open in Google Maps"
                            >
                              <Navigation size={11} className="shrink-0" />
                              {(lat as number).toFixed(5)}, {(lng as number).toFixed(5)}
                            </a>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-3 flex gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            onClick={(e) => { e.stopPropagation(); openEditModal(location); }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${location.isActive ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20'}`}
                            onClick={(e) => { e.stopPropagation(); void onToggleStatus(location); }}
                          >
                            {location.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                            {location.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 text-xs font-semibold text-slate-500 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/3">
            Total Locations: <span className="text-slate-700 dark:text-slate-300">{total}</span>
          </div>
        </section>

        {/* ── Right panel ── */}
        <section className="premium-card min-h-[400px]">
          {selected ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{selected.shopName}</h2>
                  <p className="text-xs text-slate-500">{selected.city}</p>
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-2">{selected.fullAddress}</p>

              {(() => {
                const [lng, lat] = selected.geoPoint?.coordinates ?? [];
                if (lat == null || lng == null) return (
                  <p className="text-xs text-red-500 mb-2 font-semibold">⚠️ No GPS coordinates stored</p>
                );
                return (
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand hover:underline mb-2"
                  >
                    <MapPin size={11} />
                    Verify on Google Maps ({lat.toFixed(5)}, {lng.toFixed(5)})
                  </a>
                );
              })()}

              <div className="mb-4">
                {capacityStats ? (
                  <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg w-fit font-semibold ${
                    capacityStats.isFull
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                  }`}>
                    {capacityStats.isFull && <span>🔴</span>}
                    Today: {capacityStats.usedToday} order{capacityStats.usedToday !== 1 ? 's' : ''} /{' '}
                    {capacityStats.isUnlimited ? 'unlimited' : `${capacityStats.limit} limit`}
                    {capacityStats.isFull && ' — FULL'}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Capacity/day: {selected.dailyBookingLimit === 0 ? 'Unlimited' : selected.dailyBookingLimit}
                  </p>
                )}
              </div>

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
            /* Empty state illustration */
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="relative mb-6">
                {/* Sparkle dots */}
                <div className="absolute -top-2 -right-2 w-2.5 h-2.5 rounded-full bg-violet-300 opacity-80" />
                <div className="absolute top-1 -left-3 w-1.5 h-1.5 rounded-full bg-indigo-300 opacity-70" />
                <div className="absolute -bottom-1 right-0 w-2 h-2 rounded-full bg-violet-200 opacity-60" />
                <div className="absolute bottom-2 -left-1 w-1 h-1 rounded-full bg-indigo-400 opacity-80" />
                {/* Map pin illustration */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Select a location</h3>
              <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed">
                Select a location to view closure and branch details.
              </p>
            </div>
          )}
        </section>
      </div>

      {isMapPickerOpen && (
        <MapPicker
          initialLat={parseFloat(form.latitude) || 0}
          initialLng={parseFloat(form.longitude) || 0}
          onConfirm={(lat, lng, address) => {
            setForm((p) => ({
              ...p,
              latitude: String(lat),
              longitude: String(lng),
              ...(address ? { fullAddress: address } : {}),
            }));
            setIsMapPickerOpen(false);
          }}
          onClose={() => setIsMapPickerOpen(false)}
        />
      )}

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
              <input
                type="tel"
                required
                placeholder="Contact Number (e.g. +919876543210)"
                value={form.contactNumber}
                onChange={(e) => setForm((p) => ({ ...p, contactNumber: e.target.value }))}
                pattern="^\+?[0-9]{8,15}$"
                title="Enter 8–15 digit phone number, optionally starting with +"
                className="input-premium"
              />
              <input required placeholder="Timezone" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} className="input-premium" />
              {/* Auto-fetch address */}
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Auto-fetch Address &amp; Coordinates
                </label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <AddressSearch
                      city={form.city}
                      onSelect={(address, lat, lng) =>
                        setForm((p) => ({
                          ...p,
                          fullAddress: address,
                          latitude: String(lat),
                          longitude: String(lng),
                        }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="btn-ghost text-xs flex items-center gap-1 shrink-0 mt-0.5 border border-slate-200 dark:border-white/10"
                    title="Pick exact location on map"
                  >
                    <Map size={13} />
                    <span>Map</span>
                  </button>
                </div>
              </div>
              {/* Show stored coords so the admin can spot wrong pins */}
              <div className="col-span-2 flex items-center gap-3 flex-wrap">
                {form.latitude && form.longitude ? (
                  <>
                    <span className="text-xs text-slate-500">
                      Pinned: <strong>{parseFloat(form.latitude).toFixed(5)}</strong>, <strong>{parseFloat(form.longitude).toFixed(5)}</strong>
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline flex items-center gap-1"
                    >
                      <MapPin size={11} /> Verify pin on Google Maps
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-red-500 font-semibold">⚠️ No coordinates set — use Address Search or Map picker above</span>
                )}
                <input type="hidden" value={form.latitude} />
                <input type="hidden" value={form.longitude} />
              </div>
              <select value={form.serviceAreaType} onChange={(e) => setForm((p) => ({ ...p, serviceAreaType: e.target.value as ServiceAreaType }))} className="input-premium">
                <option value="radius">Radius</option>
                <option value="polygon">Polygon</option>
              </select>
              {form.serviceAreaType === 'radius' ? (
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Service Radius <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      placeholder="e.g. 3"
                      required
                      value={form.serviceRadiusKm}
                      onChange={(e) => setForm((p) => ({ ...p, serviceRadiusKm: e.target.value }))}
                      className="input-premium pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none select-none">
                      km
                    </span>
                  </div>
                </div>
              ) : (
                <div /> /* placeholder to preserve grid layout */
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Daily Booking Limit <span className="text-slate-300">(0 = unlimited)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0 = unlimited, e.g. 50"
                  value={form.dailyBookingLimit}
                  onChange={(e) => setForm((p) => ({ ...p, dailyBookingLimit: e.target.value }))}
                  className="input-premium"
                />
              </div>
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
    serviceRadiusKm: (() => {
      if (form.serviceAreaType !== 'radius') return undefined;
      const km = Number(form.serviceRadiusKm);
      if (!km || km < 0.5) throw new Error('Service radius must be at least 0.5 km');
      return km;
    })(),
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
