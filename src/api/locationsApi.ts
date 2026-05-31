import { apiClient } from './client';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ServiceAreaType = 'radius' | 'polygon';
export type PaymentMethod =
  | 'upi'
  | 'credit_card'
  | 'debit_card'
  | 'net_banking'
  | 'wallet'
  | 'cash_on_delivery';

export interface DaySchedule {
  day: DayOfWeek;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface TimeSlot {
  label: string;
  startTime: string;
  endTime: string;
  capacity?: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationEntity {
  _id: string;
  shopName: string;
  city: string;
  fullAddress: string;
  contactNumber: string;
  geoPoint: { type: 'Point'; coordinates: [number, number] };
  serviceAreaType: ServiceAreaType;
  serviceRadiusKm?: number;
  servicePolygon?: { type: 'Polygon'; coordinates: number[][][] };
  isActive: boolean;
  timezone: string;
  workingSchedule: DaySchedule[];
  pickupSlots: TimeSlot[];
  deliverySlots: TimeSlot[];
  dailyBookingLimit: number;
  pricingProfileKey?: string;
  supportedServiceIds: string[];
  enabledPaymentMethods: PaymentMethod[];
  createdAt: string;
  updatedAt: string;
}

export interface LocationClosure {
  _id: string;
  locationId: string;
  startDate: string;
  endDate: string;
  reason: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateOrUpdateLocationPayload {
  shopName: string;
  city: string;
  fullAddress: string;
  contactNumber: string;
  geoPoint: GeoPoint;
  serviceAreaType: ServiceAreaType;
  serviceRadiusKm?: number;
  servicePolygon?: number[][][];
  timezone: string;
  workingSchedule: DaySchedule[];
  pickupSlots: TimeSlot[];
  deliverySlots: TimeSlot[];
  dailyBookingLimit: number;
  pricingProfileKey?: string;
  supportedServiceIds?: string[];
  enabledPaymentMethods?: PaymentMethod[];
}

export interface ListLocationsResponse {
  items: LocationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const locationsApi = {
  async getLocations(params?: {
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }): Promise<ListLocationsResponse> {
    const query = new URLSearchParams();
    if (params?.city) query.append('city', params.city);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.includeInactive) query.append('includeInactive', 'true');

    const qs = query.toString();
    return apiClient(`/locations${qs ? `?${qs}` : ''}`);
  },

  async createLocation(payload: CreateOrUpdateLocationPayload): Promise<LocationEntity> {
    return apiClient('/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateLocation(
    id: string,
    payload: Partial<CreateOrUpdateLocationPayload>,
  ): Promise<LocationEntity> {
    return apiClient(`/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async setLocationStatus(id: string, isActive: boolean): Promise<LocationEntity> {
    return apiClient(`/locations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async getClosures(locationId: string): Promise<LocationClosure[]> {
    return apiClient(`/locations/${locationId}/closures`);
  },

  async createClosure(
    locationId: string,
    payload: { startDate: string; endDate: string; reason: string; note?: string },
  ): Promise<LocationClosure> {
    return apiClient(`/locations/${locationId}/closures`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateClosure(
    locationId: string,
    closureId: string,
    payload: Partial<{ startDate: string; endDate: string; reason: string; note?: string; isActive: boolean }>,
  ): Promise<LocationClosure> {
    return apiClient(`/locations/${locationId}/closures/${closureId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export const defaultWorkingSchedule: DaySchedule[] = [
  { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '20:00' },
  { day: 'sunday', isOpen: false, openTime: '09:00', closeTime: '20:00' },
];
