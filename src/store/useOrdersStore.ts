import { create } from 'zustand';
import { ordersApi } from '../api/ordersApi';
import type { Order, OrderStatus, UpdateStatusPayload, SortField, SortDir } from '../api/ordersApi';

interface OrdersState {
  orders: Order[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetchOrders: (params?: { page?: number; limit?: number; status?: OrderStatus | ''; sortField?: SortField; sortDir?: SortDir; search?: string }) => Promise<void>;
  updateStatus: (id: string, payload: UpdateStatusPayload) => Promise<void>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchOrders: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ordersApi.getOrders(params);
      set({ orders: response.data, total: response.total, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch orders', isLoading: false });
    }
  },

  updateStatus: async (id, payload) => {
    try {
      const updated = await ordersApi.updateOrderStatus(id, payload);
      set({ orders: get().orders.map((o) => (o._id === id ? updated : o)) });
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update order status');
    }
  },
}));
