import { create } from 'zustand';
import { usersApi } from '../api/usersApi';
import type { User, UsersPage, UserAddress, UserAddressPayload, UserRole } from '../api/usersApi';

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;

  // Server-side pagination + counts
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  search: string;
  stats: UsersPage['stats'];

  // Address management
  addressModalUserId: string | null;
  addresses: UserAddress[];
  addressesLoading: boolean;
  addressesError: string | null;

  // Profile edit (name / email / mobile)
  editUserId: string | null;
  editUserSaving: boolean;
  editUserError: string | null;

  fetchUsers: (opts?: { page?: number; limit?: number; search?: string; silent?: boolean }) => Promise<void>;
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  changeRole: (id: string, role: UserRole) => Promise<void>;

  openEditUser: (userId: string) => void;
  closeEditUser: () => void;
  updateUser: (payload: { name?: string; email?: string; mobileNumber?: string }) => Promise<void>;

  openAddressModal: (userId: string) => Promise<void>;
  closeAddressModal: () => void;
  addAddress: (payload: UserAddressPayload) => Promise<void>;
  updateAddress: (addressId: string, payload: Partial<UserAddressPayload>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  search: '',
  stats: { totalUsers: 0, activeUsers: 0, deliveryPartners: 0 },

  addressModalUserId: null,
  addresses: [],
  addressesLoading: false,
  addressesError: null,

  editUserId: null,
  editUserSaving: false,
  editUserError: null,

  fetchUsers: async (opts = {}) => {
    const page = opts.page ?? get().page;
    const limit = opts.limit ?? get().limit;
    const search = opts.search ?? get().search;
    if (!opts.silent) set({ isLoading: true });
    set({ error: null });
    try {
      const res = await usersApi.getUsersPage({ page, limit, search });
      set({
        users: res.items,
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
        search,
        stats: res.stats,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message || err.response?.data?.message || 'Failed to fetch users', isLoading: false });
    }
  },

  blockUser: async (id: string) => {
    try {
      const updatedUser = await usersApi.blockUser(id);
      set({ users: get().users.map((u) => (u._id === id ? updatedUser : u)) });
      void get().fetchUsers({ silent: true }); // keep header counts accurate
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to block user' });
    }
  },

  unblockUser: async (id: string) => {
    try {
      const updatedUser = await usersApi.unblockUser(id);
      set({ users: get().users.map((u) => (u._id === id ? updatedUser : u)) });
      void get().fetchUsers({ silent: true }); // keep header counts accurate
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to unblock user' });
    }
  },

  changeRole: async (id: string, role: UserRole) => {
    try {
      const updatedUser = await usersApi.changeRole(id, role);
      set({ users: get().users.map((u) => (u._id === id ? updatedUser : u)) });
      void get().fetchUsers({ silent: true }); // keep header counts accurate
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to change role' });
    }
  },

  openEditUser: (userId: string) => {
    set({ editUserId: userId, editUserError: null });
  },

  closeEditUser: () => {
    set({ editUserId: null, editUserError: null });
  },

  updateUser: async (payload) => {
    const userId = get().editUserId;
    if (!userId) return;
    set({ editUserSaving: true, editUserError: null });
    try {
      const updated = await usersApi.updateUser(userId, payload);
      set({
        users: get().users.map((u) => (u._id === userId ? updated : u)),
        editUserSaving: false,
        editUserId: null,
      });
    } catch (err: any) {
      // apiClient throws a plain Error(message) — not axios — so the
      // server's message (e.g. "Email is already in use...") lives on
      // err.message, not err.response.data.message.
      set({
        editUserError: err.message || 'Failed to update user',
        editUserSaving: false,
      });
    }
  },

  openAddressModal: async (userId: string) => {
    set({ addressModalUserId: userId, addresses: [], addressesLoading: true, addressesError: null });
    try {
      const addresses = await usersApi.getAddresses(userId);
      set({ addresses, addressesLoading: false });
    } catch (err: any) {
      set({ addressesError: err.response?.data?.message || 'Failed to load addresses', addressesLoading: false });
    }
  },

  closeAddressModal: () => {
    set({ addressModalUserId: null, addresses: [], addressesError: null });
  },

  addAddress: async (payload: UserAddressPayload) => {
    const userId = get().addressModalUserId;
    if (!userId) return;
    set({ addressesLoading: true, addressesError: null });
    try {
      const created = await usersApi.addAddress(userId, payload);
      const prev = get().addresses;
      const updated = payload.isDefault
        ? [...prev.map((a) => ({ ...a, isDefault: false })), created]
        : [...prev, created];
      set({ addresses: updated, addressesLoading: false });
    } catch (err: any) {
      set({ addressesError: err.response?.data?.message || 'Failed to add address', addressesLoading: false });
    }
  },

  updateAddress: async (addressId: string, payload: Partial<UserAddressPayload>) => {
    const userId = get().addressModalUserId;
    if (!userId) return;
    set({ addressesLoading: true, addressesError: null });
    try {
      const updated = await usersApi.updateAddress(userId, addressId, payload);
      set({
        addresses: get().addresses.map((a) =>
          a.id === addressId ? updated : payload.isDefault ? { ...a, isDefault: false } : a,
        ),
        addressesLoading: false,
      });
    } catch (err: any) {
      set({ addressesError: err.response?.data?.message || 'Failed to update address', addressesLoading: false });
    }
  },

  deleteAddress: async (addressId: string) => {
    const userId = get().addressModalUserId;
    if (!userId) return;
    set({ addressesLoading: true, addressesError: null });
    try {
      await usersApi.deleteAddress(userId, addressId);
      const remaining = get().addresses.filter((a) => a.id !== addressId);
      set({ addresses: remaining, addressesLoading: false });
    } catch (err: any) {
      set({ addressesError: err.response?.data?.message || 'Failed to delete address', addressesLoading: false });
    }
  },

  setDefaultAddress: async (addressId: string) => {
    const userId = get().addressModalUserId;
    if (!userId) return;
    set({ addressesLoading: true, addressesError: null });
    try {
      await usersApi.setDefaultAddress(userId, addressId);
      set({
        addresses: get().addresses.map((a) => ({ ...a, isDefault: a.id === addressId })),
        addressesLoading: false,
      });
    } catch (err: any) {
      set({ addressesError: err.response?.data?.message || 'Failed to set default', addressesLoading: false });
    }
  },
}));
