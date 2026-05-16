import { create } from 'zustand';
import { servicesApi } from '../api/servicesApi';
import type { LaundryService, GetServicesParams, CreateServicePayload } from '../api/servicesApi';

interface ServicesState {
  services: LaundryService[];
  total: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchServices: (params?: GetServicesParams) => Promise<void>;
  addService: (payload: CreateServicePayload) => Promise<void>;
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchServices: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await servicesApi.getServices(params);
      set({ 
        services: response.data, 
        total: response.total || response.data.length,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch services', isLoading: false });
    }
  },

  addService: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await servicesApi.createService(payload);
      // Re-fetch existing after add to reflect changes
      const response = await servicesApi.getServices({ page: 1, limit: 10 });
      set({
        services: response.data,
        total: response.total || response.data.length,
        isLoading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add service', isLoading: false });
      throw error; // Let the component handle UI error state if needed
    }
  }
}));
