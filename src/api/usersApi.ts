import { apiClient } from './client';

export type UserRole = 'admin' | 'user' | 'delivery_partner';

export interface User {
  _id: string;
  name: string;
  email?: string;          // may be absent for mobile-only users
  mobileNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddress {
  id: string;
  houseNo?: string;
  buildingName?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  type?: string;
  instructions?: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
}

export type UserAddressPayload = Omit<UserAddress, 'id'>;

export interface GeocodeCandidate {
  displayName: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  type: string;
}

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    return apiClient('/users');
  },

  getUserById: async (id: string): Promise<User> => {
    return apiClient(`/users/${id}`);
  },

  blockUser: async (id: string): Promise<User> => {
    return apiClient(`/users/${id}/block`, { method: 'POST' });
  },

  unblockUser: async (id: string): Promise<User> => {
    return apiClient(`/users/${id}/unblock`, { method: 'POST' });
  },

  changeRole: async (id: string, role: UserRole): Promise<User> => {
    return apiClient(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  // ── Address management ───────────────────────────────────────────────────

  getAddresses: async (userId: string): Promise<UserAddress[]> => {
    return apiClient(`/users/${userId}/addresses`);
  },

  addAddress: async (userId: string, payload: UserAddressPayload): Promise<UserAddress> => {
    return apiClient(`/users/${userId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAddress: async (
    userId: string,
    addressId: string,
    payload: Partial<UserAddressPayload>,
  ): Promise<UserAddress> => {
    return apiClient(`/users/${userId}/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteAddress: async (userId: string, addressId: string): Promise<void> => {
    return apiClient(`/users/${userId}/addresses/${addressId}`, { method: 'DELETE' });
  },

  setDefaultAddress: async (userId: string, addressId: string): Promise<UserAddress> => {
    return apiClient(`/users/${userId}/addresses/${addressId}/default`, { method: 'PUT' });
  },

  // ── Geocode (auto-fetch) ─────────────────────────────────────────────────

  geocode: async (query: string, city?: string): Promise<GeocodeCandidate[]> => {
    return apiClient('/locations/geocode', {
      method: 'POST',
      body: JSON.stringify({ query, city, limit: 5 }),
    });
  },
};
