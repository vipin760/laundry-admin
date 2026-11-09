import { apiClient } from './client';

export type ClothTypeCategory =
  | 'ironing'
  | 'shoeCleaning'
  | 'dryCleaning'
  | 'washFold'
  | 'washIron'
  | 'membership';
export type ClothTypeSubcategory =
  | 'unisex'
  | 'men'
  | 'women'
  | 'kids'
  | 'household'
  | 'delicate'
  | 'package'
  | 'plan'
  | 'ironPass'
  | 'smartPass'
  | 'combo';

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
  includes?: string[];
  excludedItems?: string[];
  validityDays?: number;
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
  includes?: string[];
  excludedItems?: string[];
  validityDays?: number;
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
  includes?: string[];
  excludedItems?: string[];
  validityDays?: number;
}

export interface ClothTypesPage {
  items: ClothType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const clothTypesApi = {
  /** One server-side page (never loads the whole catalogue). */
  getClothTypesPage: async (params: { page: number; limit: number; search?: string }): Promise<ClothTypesPage> => {
    const q = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.search?.trim()) q.set('search', params.search.trim());
    return apiClient(`/cloth-types?${q.toString()}`);
  },

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
