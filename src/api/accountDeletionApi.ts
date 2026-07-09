import { apiClient, BASE_URL } from './client';

// ── Types (mirror backend) ───────────────────────────────────────────────────

export type DeleteRequestStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CLEANED'
  | 'REJECTED'
  | 'CANCELLED';

export interface DeleteRequest {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userMobile?: string;
  reason: string;
  comment?: string;
  status: DeleteRequestStatus;
  verificationMethod?: string;
  createdAt?: string;
  confirmedAt?: string;
  retentionUntil?: string;
  rejectionReason?: string;
}

export interface DeleteDashboard {
  totalRequests: number;
  completed: number;
  pending: number;
  rejected: number;
  avgProcessingMinutes: number;
}

export interface AuditEntry {
  _id: string;
  action: string;
  actor: string;
  message?: string;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const accountDeletionApi = {
  dashboard: (): Promise<DeleteDashboard> =>
    apiClient('/admin/delete/dashboard'),

  history: (
    params: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<Paginated<DeleteRequest>> => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return apiClient(`/admin/delete/history?${q.toString()}`);
  },

  timeline: (id: string): Promise<AuditEntry[]> =>
    apiClient(`/admin/delete/timeline/${id}`),

  approve: (deleteRequestId: string) =>
    apiClient('/admin/delete/approve', {
      method: 'POST',
      body: JSON.stringify({ deleteRequestId }),
    }),

  reject: (deleteRequestId: string, reason: string) =>
    apiClient('/admin/delete/reject', {
      method: 'POST',
      body: JSON.stringify({ deleteRequestId, reason }),
    }),

  exportUrl: (format: 'csv' | 'excel', status?: string): string => {
    const q = new URLSearchParams({ format });
    if (status) q.set('status', status);
    return `${BASE_URL}/admin/delete/export?${q.toString()}`;
  },
};

export const DELETE_STATUS_LABELS: Record<DeleteRequestStatus, string> = {
  PENDING_VERIFICATION: 'Pending verification',
  VERIFIED: 'Verified',
  COMPLETED: 'Deleted',
  CLEANED: 'Anonymised',
  REJECTED: 'Rejected / restored',
  CANCELLED: 'Cancelled',
};
