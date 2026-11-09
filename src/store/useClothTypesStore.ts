import { create } from 'zustand';
import { clothTypesApi, type ClothType, type CreateClothTypeDto, type UpdateClothTypeDto } from '../api/clothTypesApi';

interface ClothTypesState {
  clothTypes: ClothType[];
  isLoading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  search: string;
  fetchClothTypes: (opts?: { page?: number; limit?: number; search?: string; silent?: boolean }) => Promise<void>;
  createClothType: (dto: CreateClothTypeDto) => Promise<void>;
  updateClothType: (id: string, dto: UpdateClothTypeDto) => Promise<void>;
  deleteClothType: (id: string) => Promise<void>;
}

export const useClothTypesStore = create<ClothTypesState>((set, get) => ({
  clothTypes: [],
  isLoading: false,
  error: null,
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  search: '',

  fetchClothTypes: async (opts = {}) => {
    const page = opts.page ?? get().page;
    const limit = opts.limit ?? get().limit;
    const search = opts.search ?? get().search;
    if (!opts.silent) set({ isLoading: true });
    set({ error: null });
    try {
      const res = await clothTypesApi.getClothTypesPage({ page, limit, search });
      set({ clothTypes: res.items, page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages, search, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch cloth types', isLoading: false });
    }
  },

  createClothType: async (dto: CreateClothTypeDto) => {
    set({ isLoading: true, error: null });
    try {
      await clothTypesApi.createClothType(dto);
      await get().fetchClothTypes({ silent: true });
      set({ isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create cloth type', isLoading: false });
      throw error;
    }
  },

  updateClothType: async (id: string, dto: UpdateClothTypeDto) => {
    set({ isLoading: true, error: null });
    try {
      const updatedClothType = await clothTypesApi.updateClothType(id, dto);
      set((state) => ({
        clothTypes: state.clothTypes.map((ct) => (ct._id === id ? updatedClothType : ct)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update cloth type', isLoading: false });
      throw error;
    }
  },

  deleteClothType: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await clothTypesApi.deleteClothType(id);
      await get().fetchClothTypes({ silent: true });
      set({ isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete cloth type', isLoading: false });
      throw error;
    }
  },
}));
