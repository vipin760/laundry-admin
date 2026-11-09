import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TableFooterProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
  /** Omit when the page size is fixed. */
  onLimit?: (limit: number) => void;
  limitOptions?: number[];
  /** Noun used in "Showing 1–10 of N …". */
  itemLabel?: string;
  disabled?: boolean;
}

/**
 * The one pagination footer used under every admin table:
 * "Showing 1–10 of 53 users"   Rows [10]  ‹  Page 1 of 6  ›
 * Render it as the last child of the table's card (`premium-card !p-0`).
 */
export const TableFooter: React.FC<TableFooterProps> = ({
  page, totalPages, total, limit, onPage, onLimit, limitOptions = [10, 25, 50], itemLabel = 'items', disabled = false,
}) => {
  if (total <= 0) return null;
  const pages = Math.max(1, totalPages);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
      <span>Showing {from}–{to} of {total} {itemLabel}</span>
      <div className="flex items-center gap-2">
        {onLimit && (
          <label className="hidden sm:flex items-center gap-1.5">
            Rows
            <select
              value={limit}
              onChange={(e) => onLimit(Number(e.target.value))}
              className="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs"
            >
              {(limitOptions.includes(limit) ? limitOptions : [...limitOptions, limit].sort((a, b) => a - b)).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={() => onPage(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="tabular-nums px-1">Page {page} of {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={disabled || page >= pages}
          aria-label="Next page"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
