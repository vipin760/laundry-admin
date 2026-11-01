import { apiClient } from './client';

export type PaymentLinkStatus = 'pending' | 'failed_attempt' | 'paid' | 'expired' | 'cancelled' | 'superseded';

export interface PaymentLink {
  id: string;
  status: PaymentLinkStatus;
  shortUrl: string;
  /** ₹ this link collects — frozen from the bill when the link was created. */
  amount: number;
  currency: string;
  expireBy: string;
  createdAt?: string;
  failedAttempts: number;
  lastFailedAt?: string;
  lastFailureReason?: string;
  razorpayPaymentId?: string;
  amountPaid?: number;
  paidAt?: string;
  endedReason?: string;
  /** PNG data URL — present only while the link is still payable. */
  qrCodeDataUrl?: string;
}

export interface PaymentLinksResponse {
  active: PaymentLink | null;
  history: PaymentLink[];
}

export const paymentLinksApi = {
  /** Creates the order's link, or returns the live one (replacing it if the bill changed or it expired). Priced entirely server-side. */
  createOrGet: (orderId: string): Promise<{ link: PaymentLink; created: boolean }> =>
    apiClient(`/payments/links/${orderId}`, { method: 'POST' }),

  get: (orderId: string): Promise<PaymentLinksResponse> => apiClient(`/payments/links/${orderId}`),
};
