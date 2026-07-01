import { apiClient } from './client';

export type OrderStatus =
  | 'ORDER_PLACED'
  | 'PICKUP_ASSIGNED'
  | 'ITEMIZED'
  | 'PROCESSING'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type SortField = 'createdAt' | 'updatedAt' | 'billAmount' | 'totalAmount';
export type SortDir   = 'asc' | 'desc';

export interface OrderItem {
  serviceId: string;
  serviceName?: string;
  name?: string;
  price: number;
  quantity: number;
  category?: 'instant' | 'scheduled';
}

export interface Order {
  _id: string;
  userId: string;
  orderNumber?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: string;
  address?: string;
  pickupDate?: string;
  pickupSlot?: string;
  pickupTime?: string;
  deliverySlot?: string;
  // Tracking fields
  driverName?: string;
  driverPhone?: string;
  deliveryOtp?: string;
  weightKg?: number;
  itemCount?: number;
  billAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStatusPayload {
  status: OrderStatus;
  driverName?: string;
  driverPhone?: string;
  weightKg?: number;
  itemCount?: number;
  billAmount?: number;
  pickupTime?: string;
  /** OTP required when advancing OUT_FOR_DELIVERY → COMPLETED */
  otp?: string;
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
  status?: OrderStatus | '';
  sortField?: SortField;
  sortDir?: SortDir;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  ORDER_PLACED:     'Confirmed',
  PICKUP_ASSIGNED:  'Pickup',
  ITEMIZED:         'Itemized',
  PROCESSING:       'Brewing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED:        'Delivered',
  CANCELLED:        'Cancelled',
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  ORDER_PLACED:     'PICKUP_ASSIGNED',
  PICKUP_ASSIGNED:  'ITEMIZED',
  ITEMIZED:         'PROCESSING',
  PROCESSING:       'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'COMPLETED',
};

export const ordersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<GetOrdersResponse> => {
    const query = new URLSearchParams();
    if (params?.page)      query.append('page',   params.page.toString());
    if (params?.limit)     query.append('limit',  params.limit.toString());
    if (params?.status)    query.append('status', params.status);
    if (params?.sortField) query.append('sortField', params.sortField);
    if (params?.sortDir)   query.append('sortDir',   params.sortDir);
    const qs = query.toString();
    return apiClient(qs ? `/orders?${qs}` : '/orders');
  },

  getOrder: async (id: string): Promise<Order> => {
    return apiClient(`/orders/${id}`);
  },

  updateOrderStatus: async (id: string, payload: UpdateStatusPayload): Promise<Order> => {
    return apiClient(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
