import React, { useEffect, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { invoicesApi, type InvoiceMetadata } from '../api/invoicesApi';

/**
 * Renders nothing until an invoice actually exists for this order (i.e. the
 * order has been paid — invoices are generated on payment capture). Admin
 * has unrestricted download access once one exists; the backend still
 * enforces JWT + role + ownership + rate limiting on the endpoint itself.
 */
export const InvoiceDownloadButton: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [metadata, setMetadata] = useState<InvoiceMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    invoicesApi.getMetadata(orderId).then((m) => {
      if (!cancelled) {
        setMetadata(m);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading || !metadata) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await invoicesApi.download(orderId, metadata.invoiceNumber);
    } catch (e: any) {
      setError(e.message ?? 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
      >
        {downloading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
        Download Invoice ({metadata.invoiceNumber})
      </button>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
};
