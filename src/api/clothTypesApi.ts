import { apiClient } from './client';

export interface ClothType {
  _id: string;
  name: string;
  rate: number;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClothTypeDto {
  name: string;
  rate: number;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface UpdateClothTypeDto {
  name?: string;
  rate?: number;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export const clothTypesApi = {
  getClothTypes: async (): Promise<ClothType[]> => {
    return apiClient('/cloth-types');
  },

  createClothType: async (dto: CreateClothTypeDto): Promise<ClothType> => {
    return apiClient('/cloth-types', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  updateClothType: async (id: string, dto: UpdateClothTypeDto): Promise<ClothType> => {
    return apiClient(`/cloth-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  deleteClothType: async (id: string): Promise<void> => {
    return apiClient(`/cloth-types/${id}`, {
      method: 'DELETE',
    });
  },
};
