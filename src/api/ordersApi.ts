import { apiClient } from './client';

export const OrderStatus = {
  ORDER_PLACED: 'ORDER_PLACED',
  PICKUP_ASSIGNED: 'PICKUP_ASSIGNED',
  PROCESSING: 'PROCESSING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUSES = Object.values(OrderStatus) as OrderStatus[];

export interface OrderItem {
  serviceId: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.ORDER_PLACED]: 'Order placed',
  [OrderStatus.PICKUP_ASSIGNED]: 'Pickup assigned',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.OUT_FOR_DELIVERY]: 'Out for delivery',
  [OrderStatus.COMPLETED]: 'Completed',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

export const ordersApi = {
  getOrders: async (): Promise<Order[]> => {
    return apiClient('/orders');
  },

  updateOrderStatus: async (
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> => {
    return apiClient(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
