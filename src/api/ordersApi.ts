import { apiClient } from './client';

export type OrderStatus = 
  | 'ORDER_PLACED' 
  | 'PICKUP_ASSIGNED' 
  | 'PROCESSING' 
  | 'OUT_FOR_DELIVERY' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface OrderItem {
  serviceId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetOrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export const ordersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<GetOrdersResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    
    const queryString = query.toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';
    
    return apiClient(endpoint);
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    return apiClient(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
