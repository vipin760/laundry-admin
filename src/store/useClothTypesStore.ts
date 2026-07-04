import { create } from 'zustand';
import { clothTypesApi, type ClothType, type CreateClothTypeDto, type UpdateClothTypeDto } from '../api/clothTypesApi';

interface ClothTypesState {
  clothTypes: ClothType[];
  isLoading: boolean;
  error: string | null;
  fetchClothTypes: () => Promise<void>;
  createClothType: (dto: CreateClothTypeDto) => Promise<void>;
  updateClothType: (id: string, dto: UpdateClothTypeDto) => Promise<void>;
  deleteClothType: (id: string) => Promise<void>;
}

export const useClothTypesStore = create<ClothTypesState>((set) => ({
  clothTypes: [],
  isLoading: false,
  error: null,

  fetchClothTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const clothTypes = await clothTypesApi.getClothTypes();
      set({ clothTypes, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch cloth types', isLoading: false });
    }
  },

  createClothType: async (dto: CreateClothTypeDto) => {
    set({ isLoading: true, error: null });
    try {
      const newClothType = await clothTypesApi.createClothType(dto);
      set((state) => ({ clothTypes: [...state.clothTypes, newClothType], isLoading: false }));
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
      set((state) => ({
        clothTypes: state.clothTypes.filter((ct) => ct._id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete cloth type', isLoading: false });
      throw error;
    }
  },
}));
