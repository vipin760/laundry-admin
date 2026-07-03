import { apiClient, BASE_URL } from './client';

export interface SupportUser {
  _id: string;
  name?: string;
  email?: string;
  isActive?: boolean;
}

export interface SupportConversation {
  _id: string;
  userId: string;
  status: 'open' | 'resolved';
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadForUser: number;
  unreadForAdmin: number;
  createdAt?: string;
  updatedAt?: string;
  user?: SupportUser | null;
}

export interface SupportMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  body: string;
  readAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SendMessageResult {
  conversation: SupportConversation;
  message: SupportMessage;
}

export const supportSocketUrl = BASE_URL.replace(/\/$/, '');

export const supportApi = {
  async getConversations() {
    const response = await apiClient('/support/conversations?limit=50');
    return (response.items ?? []) as SupportConversation[];
  },

  async getMessages(conversationId: string) {
    return apiClient(
      `/support/conversations/${conversationId}/messages?limit=50`,
    ) as Promise<SupportMessage[]>;
  },

  async sendMessage(conversationId: string, body: string) {
    return apiClient('/support/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, body }),
    }) as Promise<SendMessageResult>;
  },

  async markRead(conversationId: string) {
    return apiClient(`/support/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }) as Promise<SupportConversation>;
  },

  async closeConversation(conversationId: string) {
    return apiClient(`/support/conversations/${conversationId}/close`, {
      method: 'PATCH',
    }) as Promise<SupportConversation>;
  },

  async reopenConversation(conversationId: string) {
    return apiClient(`/support/conversations/${conversationId}/reopen`, {
      method: 'PATCH',
    }) as Promise<SupportConversation>;
  },
};
