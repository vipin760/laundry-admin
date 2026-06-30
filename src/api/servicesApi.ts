import { apiClient, BASE_URL } from './client';

export interface LaundryService {
  _id: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  duration?: string;
  icon?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface GetServicesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetServicesResponse {
  data: LaundryService[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CreateServicePayload {
  name: string;
  price: number;
  description: string;
  category?: string;
  duration?: string;
  icon?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export const servicesApi = {
  getServices: async (params?: GetServicesParams): Promise<GetServicesResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/services?${queryString}` : '/services';

    return apiClient(endpoint);
  },

  createService: async (payload: CreateServicePayload): Promise<LaundryService> => {
    return apiClient('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadImage: async (file: File): Promise<{ url: string; imageId: string }> => {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Image upload failed');
    }

    return response.json();
  },
};
