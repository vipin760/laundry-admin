import { apiClient } from './client';

export type PaymentQrStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CLOSED' | 'CREATING' | 'FAILED';

export interface PaymentQr {
  id: string;
  orderId: string;
  status: PaymentQrStatus;
  /** Rupees. */
  amount: number;
  amountPaise: number;
  currency: string;
  /** Our unique reference for this QR attempt, e.g. LBQR-LB10001-1A2B3C4D. */
  paymentReference: string;
  expiresAt: string;
  secondsRemaining: number;
  createdAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  verified: boolean;
  /** Present only while the QR is scannable. */
  imageUrl?: string;
  upiUri?: string;
  razorpayPaymentId?: string;
}

export interface QrOrderSummary {
  orderId: string;
  orderNumber?: string;
  status: string;
  paymentStatus: string;
  amount: number;
  paymentMethod?: string;
  paymentChannel?: string;
  paymentTransactionId?: string;
  paymentCompletedAt?: string;
}

export interface PaymentEventRow {
  _id: string;
  source: string;
  eventType: string;
  outcome: string;
  razorpayPaymentId?: string;
  razorpayQrId?: string;
  amountPaise?: number;
  createdAt: string;
}

export const paymentQrApi = {
  /** Generate the QR for an order — idempotent: returns the live QR if one already exists. */
  generate: (orderId: string): Promise<{ reused: boolean; qr: PaymentQr }> =>
    apiClient(`/payments/qr/orders/${orderId}`, { method: 'POST' }),

  /** Current QR + server-verified payment state (also reconciles a delayed webhook). */
  get: (orderId: string): Promise<{ order: QrOrderSummary; qr: PaymentQr | null }> =>
    apiClient(`/payments/qr/orders/${orderId}`),

  close: (orderId: string, reason?: string): Promise<{ qr: PaymentQr | null }> =>
    apiClient(`/payments/qr/orders/${orderId}/close`, { method: 'POST', body: JSON.stringify({ reason }) }),

  history: (orderId: string): Promise<{ qrs: PaymentQr[]; events: PaymentEventRow[] }> =>
    apiClient(`/payments/qr/orders/${orderId}/history`),
};

/** Order states in which a payment QR may be generated (mirrors the backend rule). */
export const QR_ELIGIBLE_STATUSES = ['PROCESSING', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'] as const;
