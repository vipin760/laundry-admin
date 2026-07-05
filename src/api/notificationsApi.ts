import { apiClient } from './client';

export interface AppNotification {
  _id: string;
  audience: 'user' | 'admin';
  userId?: string;
  title: string;
  body: string;
  type?: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsResponse {
  data: AppNotification[];
  unread: number;
}

export const notificationsApi = {
  getAdminNotifications: async (): Promise<GetNotificationsResponse> => {
    return apiClient('/notifications/admin');
  },

  markAdminRead: async (): Promise<{ success: boolean }> => {
    return apiClient('/notifications/admin/read', { method: 'PATCH' });
  },

  markAdminOneRead: async (id: string): Promise<{ success: boolean }> => {
    return apiClient(`/notifications/admin/${id}/read`, { method: 'PATCH' });
  },

  deleteAdminOne: async (id: string): Promise<{ success: boolean }> => {
    return apiClient(`/notifications/admin/${id}`, { method: 'DELETE' });
  },

  clearAdmin: async (): Promise<{ success: boolean }> => {
    return apiClient('/notifications/admin', { method: 'DELETE' });
  },
};
