import { apiClient, BASE_URL } from './client';

export interface LaundryService {
  _id: string;
  name: string;
  instantDescription: string;
  scheduledDescription: string;
  instantOrderPlacedMessage: string;
  scheduledOrderPlacedMessage: string;
  price: number;
  categories?: string[];
  /** Estimated duration text shown to customers browsing the Instant (same-day) flow, e.g. "60-90 mins". */
  instantDuration?: string;
  /** Estimated duration text shown to customers browsing the Scheduled (time-slot) flow, e.g. "24-48 hrs". */
  scheduledDuration?: string;
  /** Hours between pickup and delivery for scheduled orders of this service (e.g. 24, 48). Defaults to 24. */
  turnaroundHours?: number;
  /** Minutes between pickup and delivery for instant orders of this service (e.g. 60, 90). Defaults to 90. */
  instantTurnaroundMinutes?: number;
  icon?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isPopular?: boolean;
  popularOrder?: number;
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
  instantDescription: string;
  scheduledDescription: string;
  instantOrderPlacedMessage: string;
  scheduledOrderPlacedMessage: string;
  categories?: string[];
  instantDuration?: string;
  scheduledDuration?: string;
  turnaroundHours?: number;
  instantTurnaroundMinutes?: number;
  icon?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isPopular?: boolean;
  popularOrder?: number;
}

export type UpdateServicePayload = Partial<CreateServicePayload>;

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

  updateService: async (id: string, payload: UpdateServicePayload): Promise<LaundryService> => {
    return apiClient(`/services/${id}`, {
      method: 'PATCH',
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
