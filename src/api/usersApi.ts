import { apiClient } from './client';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    return apiClient('/users');
  },

  getUserById: async (id: string): Promise<User> => {
    return apiClient(`/users/${id}`);
  },

  blockUser: async (id: string): Promise<User> => {
    return apiClient(`/users/${id}/block`, {
      method: 'POST',
    });
  },

  unblockUser: async (id: string): Promise<User> => {
    return apiClient(`/users/${id}/unblock`, {
      method: 'POST',
    });
  },
};
