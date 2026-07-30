import { apiClient, BASE_URL } from './client';

export interface InvoiceMetadata {
  invoiceNumber: string;
  generatedAt: string;
  payableTotal: number;
}

export const invoicesApi = {
  /** Returns null when no invoice exists yet (order unpaid) instead of throwing, so callers can just hide the button. */
  getMetadata: async (orderId: string): Promise<InvoiceMetadata | null> => {
    try {
      return await apiClient(`/invoices/order/${orderId}`);
    } catch {
      return null;
    }
  },

  /** Downloads and saves the invoice PDF — same blob-download pattern as couponApi.exportUsers. */
  download: async (orderId: string, invoiceNumber: string): Promise<void> => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${BASE_URL}/invoices/order/${orderId}/download`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invoice download failed');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
