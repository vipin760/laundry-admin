import { create } from 'zustand';
import {
  locationsApi,
} from '../api/locationsApi';
import type {
  CreateOrUpdateLocationPayload,
  LocationClosure,
  LocationEntity,
} from '../api/locationsApi';

interface LocationsState {
  items: LocationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  cities: string[];
  /** Last list query, so create/update/toggle refresh the SAME page + filters. */
  query: { city: string; search: string };
  isLoading: boolean;
  error: string | null;
  closuresByLocation: Record<string, LocationClosure[]>;

  fetchCities: () => Promise<void>;
  fetchLocations: (params?: {
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) => Promise<void>;
  addLocation: (payload: CreateOrUpdateLocationPayload) => Promise<void>;
  updateLocation: (
    id: string,
    payload: Partial<CreateOrUpdateLocationPayload>,
  ) => Promise<void>;
  toggleLocationStatus: (id: string, isActive: boolean) => Promise<void>;
  fetchClosures: (locationId: string) => Promise<void>;
  addClosure: (
    locationId: string,
    payload: { startDate: string; endDate: string; reason: string; note?: string },
  ) => Promise<void>;
}

export const useLocationsStore = create<LocationsState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  cities: [],
  query: { city: '', search: '' },
  isLoading: false,
  error: null,
  closuresByLocation: {},

  fetchCities: async () => {
    try {
      set({ cities: await locationsApi.getCities() });
    } catch {
      /* the dropdown just stays as it was */
    }
  },

  fetchLocations: async (params = {}) => {
    const cur = get();
    const city = params.city ?? cur.query.city;
    const search = params.search ?? cur.query.search;
    const page = params.page ?? cur.page;
    const limit = params.limit ?? cur.limit;
    set({ isLoading: true, error: null });
    try {
      const response = await locationsApi.getLocations({ city, search, page, limit, includeInactive: true });
      set({
        items: response.items,
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: Math.max(1, response.totalPages),
        query: { city, search },
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to load locations' });
    }
  },

  addLocation: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await locationsApi.createLocation(payload);
      await get().fetchLocations();
      void get().fetchCities();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to create location' });
      throw error;
    }
  },

  updateLocation: async (id, payload) => {
    set({ isLoading: true, error: null });
    try {
      await locationsApi.updateLocation(id, payload);
      await get().fetchLocations();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update location' });
      throw error;
    }
  },

  toggleLocationStatus: async (id, isActive) => {
    set({ isLoading: true, error: null });
    try {
      await locationsApi.setLocationStatus(id, isActive);
      await get().fetchLocations();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update location status' });
      throw error;
    }
  },

  fetchClosures: async (locationId) => {
    try {
      const closures = await locationsApi.getClosures(locationId);
      set((state) => ({
        closuresByLocation: {
          ...state.closuresByLocation,
          [locationId]: closures,
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to load closures' });
    }
  },

  addClosure: async (locationId, payload) => {
    try {
      await locationsApi.createClosure(locationId, payload);
      await get().fetchClosures(locationId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to create closure' });
      throw error;
    }
  },
}));
