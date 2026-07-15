import { apiClient, BASE_URL } from './client';

// ── Types (mirror backend enums/contract — see laundry_be/src/coupons) ───────

export type CouponDiscountType = 'fixed' | 'percentage';

/** Admin-controlled lifecycle (what you can set). */
export type CouponStatus = 'active' | 'disabled';

/** Effective status shown to admins/customers — combines `status` with expiry. */
export type CouponEffectiveStatus = 'active' | 'expired' | 'disabled';

export type CouponAssignmentStatus = 'active' | 'removed';

export type CouponAssignmentSource = 'manual' | 'bulk_condition';

export type CouponBulkCondition =
  | 'missed_first_cashback'
  | 'failed_payment'
  | 'completed_first_order'
  | 'no_orders_30_days'
  | 'wallet_balance_below_100'
  | 'city'
  | 'custom_user_ids';

export interface CouponListItem {
  id: string;
  couponCode: string;
  couponName: string;
  discountType: CouponDiscountType;
  discountValue: number;
  assignedUsersCount: number;
  usedUsersCount: number;
  expiryDate: string;
  status: CouponStatus;
  effectiveStatus: CouponEffectiveStatus;
  createdBy: string;
  createdAt: string;
}

export interface CouponStats {
  assignedUsers: number;
  usedUsers: number;
  remainingUsers: number;
  totalDiscountGiven: number;
}

export interface CouponDetail {
  id: string;
  couponCode: string;
  couponName: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usagePerUser: number;
  totalUsageLimit?: number;
  usedCount: number;
  startDate: string;
  expiryDate: string;
  status: CouponStatus;
  effectiveStatus: CouponEffectiveStatus;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stats: CouponStats;
}

export interface DashboardCounts {
  active: number;
  expired: number;
  disabled: number;
  total: number;
}

export interface CreateCouponPayload {
  couponCode: string;
  couponName: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscount?: number;
  usagePerUser?: number;
  totalUsageLimit?: number;
  startDate: string;
  expiryDate: string;
  status?: CouponStatus;
  description?: string;
}

export type UpdateCouponPayload = Partial<Omit<CreateCouponPayload, 'couponCode'>>;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface AssignUsersResult {
  newlyAssigned: number;
  alreadyAssigned: number;
  requested: number;
  skippedInvalid: number;
}

export interface BulkAssignResult {
  matched: number;
  newlyAssigned: number;
  alreadyAssigned: number;
}

export interface AssignedUser {
  userId: string;
  customerName: string;
  mobileNumber: string;
  email: string;
  assignedAt: string;
  status: CouponAssignmentStatus;
  usedCount: number;
  lastUsedAt: string | null;
  source: CouponAssignmentSource;
}

export interface CouponReport {
  couponId: string;
  couponCode: string;
  assignedUsers: number;
  usedUsers: number;
  remainingUsers: number;
  totalDiscountGiven: number;
  redemptionRate: number;
  totalRedemptions: number;
}

export interface AuditLogEntry {
  action: string;
  adminId: string;
  message: string;
  ipAddress?: string | null;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const couponApi = {
  dashboard: (): Promise<DashboardCounts> => apiClient('/admin/coupons/dashboard'),

  list: (
    params: {
      search?: string;
      status?: CouponEffectiveStatus | '';
      expiryFrom?: string;
      expiryTo?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<Paginated<CouponListItem>> => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.expiryFrom) q.set('expiryFrom', params.expiryFrom);
    if (params.expiryTo) q.set('expiryTo', params.expiryTo);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.sortOrder) q.set('sortOrder', params.sortOrder);
    return apiClient(`/admin/coupons?${q.toString()}`);
  },

  getById: (id: string): Promise<CouponDetail> => apiClient(`/admin/coupons/${id}`),

  create: (body: CreateCouponPayload): Promise<CouponDetail> =>
    apiClient('/admin/coupons', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: UpdateCouponPayload): Promise<CouponDetail> =>
    apiClient(`/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  disable: (id: string): Promise<CouponDetail> =>
    apiClient(`/admin/coupons/${id}/disable`, { method: 'PATCH' }),

  enable: (id: string): Promise<CouponDetail> =>
    apiClient(`/admin/coupons/${id}/enable`, { method: 'PATCH' }),

  remove: (id: string): Promise<{ success: boolean }> =>
    apiClient(`/admin/coupons/${id}`, { method: 'DELETE' }),

  assignUsers: (id: string, userIds: string[]): Promise<AssignUsersResult> =>
    apiClient(`/admin/coupons/${id}/assign-users`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }),

  bulkAssign: (
    id: string,
    body: { condition: CouponBulkCondition; city?: string; userIds?: string[] },
  ): Promise<BulkAssignResult> =>
    apiClient(`/admin/coupons/${id}/bulk-assign`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  removeUser: (id: string, userId: string): Promise<{ success: boolean }> =>
    apiClient(`/admin/coupons/${id}/remove-user`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  reassignUser: (id: string, userId: string): Promise<{ success: boolean }> =>
    apiClient(`/admin/coupons/${id}/reassign-user`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  listUsers: (
    id: string,
    params: {
      search?: string;
      status?: CouponAssignmentStatus | '';
      usage?: 'used' | 'unused' | '';
      page?: number;
      limit?: number;
    } = {},
  ): Promise<Paginated<AssignedUser>> => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.usage) q.set('usage', params.usage);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return apiClient(`/admin/coupons/${id}/users?${q.toString()}`);
  },

  report: (id: string): Promise<CouponReport> => apiClient(`/admin/coupons/${id}/report`),

  auditLogs: (id: string, page = 1, limit = 50): Promise<AuditLogResponse> =>
    apiClient(`/admin/coupons/${id}/audit-logs?page=${page}&limit=${limit}`),

  /** Trigger a CSV download of the assigned-users list (auth via Bearer header, blob download). */
  exportUsers: async (id: string, couponCode?: string): Promise<void> => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${BASE_URL}/admin/coupons/${id}/users/export`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Export failed');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${couponCode || 'coupon'}-users.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const DISCOUNT_TYPE_LABELS: Record<CouponDiscountType, string> = {
  fixed: 'Fixed amount',
  percentage: 'Percentage',
};

export const EFFECTIVE_STATUS_LABELS: Record<CouponEffectiveStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  disabled: 'Disabled',
};

export const BULK_CONDITION_LABELS: Record<CouponBulkCondition, string> = {
  missed_first_cashback: 'Users who missed first cashback',
  failed_payment: 'Users with failed payment',
  completed_first_order: 'Users with completed first order',
  no_orders_30_days: 'Users with no orders in last 30 days',
  wallet_balance_below_100: 'Users with wallet balance below ₹100',
  city: 'Users from a specific city',
  custom_user_ids: 'Custom user IDs',
};

/** Format a discount value per its type: "₹X" for fixed, "X%" for percentage. */
export const formatDiscount = (type: CouponDiscountType, value: number): string =>
  type === 'fixed' ? `₹${value}` : `${value}%`;
