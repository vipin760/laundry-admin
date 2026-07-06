import { apiClient } from './client';

export type ClothTypeCategory = 'ironing' | 'shoeCleaning' | 'dryCleaning';
export type ClothTypeSubcategory =
  | 'unisex'
  | 'men'
  | 'women'
  | 'kids'
  | 'household'
  | 'delicate';

export interface ClothType {
  _id: string;
  name: string;
  instantRate: number;
  scheduledRate: number;
  discountInstantRate?: number;
  discountScheduledRate?: number;
  description?: string;
  category?: ClothTypeCategory;
  subcategory?: ClothTypeSubcategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClothTypeDto {
  name: string;
  instantRate: number;
  scheduledRate: number;
  discountInstantRate?: number;
  discountScheduledRate?: number;
  description?: string;
  category?: ClothTypeCategory;
  subcategory?: ClothTypeSubcategory;
  isActive?: boolean;
}

export interface UpdateClothTypeDto {
  name?: string;
  instantRate?: number;
  scheduledRate?: number;
  discountInstantRate?: number;
  discountScheduledRate?: number;
  description?: string;
  category?: ClothTypeCategory;
  subcategory?: ClothTypeSubcategory;
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
