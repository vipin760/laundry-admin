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
  isLoading: boolean;
  error: string | null;
  closuresByLocation: Record<string, LocationClosure[]>;

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
  isLoading: false,
  error: null,
  closuresByLocation: {},

  fetchLocations: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await locationsApi.getLocations(params);
      set({
        items: response.items,
        total: response.total,
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
      await get().fetchLocations({ page: 1, limit: 20, includeInactive: true });
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
      await get().fetchLocations({ page: 1, limit: 20, includeInactive: true });
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
      await get().fetchLocations({ page: 1, limit: 20, includeInactive: true });
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
