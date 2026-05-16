import { create } from 'zustand';
import { usersApi } from '../api/usersApi';
import type { User } from '../api/usersApi';

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await usersApi.getUsers();
      set({ users, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch users', isLoading: false });
    }
  },

  blockUser: async (id: string) => {
    try {
      const updatedUser = await usersApi.blockUser(id);
      set({
        users: get().users.map((u) => (u._id === id ? updatedUser : u)),
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to block user' });
    }
  },

  unblockUser: async (id: string) => {
    try {
      const updatedUser = await usersApi.unblockUser(id);
      set({
        users: get().users.map((u) => (u._id === id ? updatedUser : u)),
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to unblock user' });
    }
  },
}));
