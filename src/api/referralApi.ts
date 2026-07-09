import { apiClient, BASE_URL } from './client';

// ── Types (mirror backend enums/contract) ────────────────────────────────────

export type ReferralStatus =
  | 'PENDING'
  | 'REGISTERED'
  | 'FIRST_ORDER_COMPLETED'
  | 'PAYMENT_COMPLETED'
  | 'REWARD_RELEASED'
  | 'EXPIRED'
  | 'REJECTED';

export type RewardType =
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE'
  | 'WALLET_CREDIT'
  | 'COUPON'
  | 'POINTS'
  | 'FREE_DELIVERY';

export interface Referral {
  _id: string;
  referrerId: string;
  refereeId: string;
  code: string;
  status: ReferralStatus;
  firstOrderValue?: number;
  registeredAt?: string;
  rewardReleasedAt?: string;
  expiresAt?: string;
  rejectedReason?: string | null;
  fraudSuspected?: boolean;
  fraudReasons?: string[];
  createdAt?: string;
}

export interface DashboardSummary {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  rejectedReferrals: number;
  rewardPaid: number;
  rewardPending: number;
  mostActiveReferrers: Array<{ referrerId: string; name: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
}

export interface ReferralSettings {
  referralEnabled: boolean;
  rewardType: RewardType;
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  rewardPercentage: number;
  minimumOrderValue: number;
  maximumReferralReward: number;
  referralExpiryDays: number;
  dailyLimit: number;
  monthlyLimit: number;
  lifetimeLimit: number;
  blockSameDevice: boolean;
  blockSameIp: boolean;
  vpnDetectionEnabled: boolean;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
}

export interface ReportResponse {
  range: { from: string; to: string; granularity: string };
  series: Array<{
    period: string;
    total: number;
    completed: number;
    rejected: number;
  }>;
  summary: {
    totalReferrals: number;
    completedReferrals: number;
    conversionRate: number;
    rewardCost: number;
    fraudRate: number;
    roi: number | null;
  };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TimelineEntry {
  _id: string;
  action: string;
  actor: string;
  message?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const referralApi = {
  dashboard: (): Promise<DashboardSummary> =>
    apiClient('/admin/referral/dashboard'),

  list: (params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<Paginated<Referral>> => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return apiClient(`/admin/referral?${q.toString()}`);
  },

  report: (params: {
    from?: string;
    to?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
  } = {}): Promise<ReportResponse> => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.granularity) q.set('granularity', params.granularity);
    return apiClient(`/admin/referral/report?${q.toString()}`);
  },

  timeline: (referralId: string): Promise<TimelineEntry[]> =>
    apiClient(`/admin/referral/timeline/${referralId}`),

  getSettings: (): Promise<ReferralSettings> =>
    apiClient('/admin/referral/settings'),

  updateSettings: (body: Partial<ReferralSettings>): Promise<ReferralSettings> =>
    apiClient('/admin/referral/settings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  release: (referralId: string) =>
    apiClient('/admin/referral/release', {
      method: 'POST',
      body: JSON.stringify({ referralId }),
    }),

  reject: (referralId: string, reason: string) =>
    apiClient('/admin/referral/reject', {
      method: 'POST',
      body: JSON.stringify({ referralId, reason }),
    }),

  reverse: (referralId: string, reason: string) =>
    apiClient('/admin/referral/reverse', {
      method: 'POST',
      body: JSON.stringify({ referralId, reason }),
    }),

  hold: (referralId: string) =>
    apiClient('/admin/referral/hold', {
      method: 'POST',
      body: JSON.stringify({ referralId }),
    }),

  /** Build an export URL (CSV or Excel). Token is sent via cookie/credentials. */
  exportUrl: (format: 'csv' | 'excel', status?: string): string => {
    const q = new URLSearchParams({ format });
    if (status) q.set('status', status);
    return `${BASE_URL}/admin/referral/export?${q.toString()}`;
  },
};

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: 'Pending',
  REGISTERED: 'Joined',
  FIRST_ORDER_COMPLETED: 'First order',
  PAYMENT_COMPLETED: 'Payment done',
  REWARD_RELEASED: 'Reward released',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
};
