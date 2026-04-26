import { apiClient } from './client';

export interface LaundryService {
  _id: string;
  name: string;
  description: string;
  price: number;
  icon?: string;
  isActive?: boolean;
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
  icon?: string;
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
};
