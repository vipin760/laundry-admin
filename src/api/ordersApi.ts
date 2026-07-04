import { apiClient, BASE_URL } from './client';



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



export type OrderPhotoType = 'damage' | 'weighing';



export interface OrderPhoto {

  _id: string;

  url: string;

  imageId?: string;

  /** Only present on damage/findings photos */

  note?: string;

  uploadedAt: string;

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

  deliveryPartnerId?: string;

  deliveryPartnerName?: string;

  weightKg?: number;

  itemCount?: number;

  billAmount?: number;

  clothTypeBreakdown?: {
    clothTypeId: string;
    clothTypeName: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];

  calculatedAmount?: number;

  /** Findings / damage evidence photos taken at collection */

  damagePhotos?: OrderPhoto[];

  /** Weighing scale / bill proof photos */

  weighingPhotos?: OrderPhoto[];

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

  clothTypeBreakdown?: {
    clothTypeId: string;
    quantity: number;
  }[];

  pickupTime?: string;

  /** Delivery partner assignment — set when advancing PROCESSING to OUT_FOR_DELIVERY */

  deliveryPartnerId?: string;

  deliveryPartnerName?: string;

  /** OTP required when advancing OUT_FOR_DELIVERY to COMPLETED */

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



  getClothTypes: async (): Promise<any[]> => {

    return apiClient('/cloth-types');

  },



  /**

   * Upload photos (multipart). type = 'damage' | 'weighing'.

   * notes - optional array aligned with files (damage only).

   */

  uploadOrderPhotos: async (

    id: string,

    type: OrderPhotoType,

    files: File[],

    notes?: (string | undefined)[],

  ): Promise<Order> => {

    const fd = new FormData();

    files.forEach((f) => fd.append('files', f));

    fd.append('type', type);

    if (notes?.some((n) => n?.trim())) {

      fd.append('notes', JSON.stringify(notes.map((n) => n ?? '')));

    }

    const token = localStorage.getItem('authToken');

    const res = await fetch(`${BASE_URL}/orders/${id}/photos`, {

      method: 'POST',

      credentials: 'include',

      headers: token ? { Authorization: `Bearer ${token}` } : undefined,

      body: fd, // browser sets multipart boundary automatically

    });

    if (!res.ok) {

      const err = await res.json().catch(() => ({}));

      throw new Error(err.message || 'Photo upload failed');

    }

    return res.json();

  },



  deleteOrderPhoto: async (

    id: string,

    photoId: string,

    type: OrderPhotoType,

  ): Promise<Order> => {

    return apiClient(`/orders/${id}/photos/${photoId}?type=${type}`, {

      method: 'DELETE',

    });

  },

};

