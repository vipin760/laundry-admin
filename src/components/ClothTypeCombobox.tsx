import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { ClothType } from '../api/clothTypesApi';
import { CATEGORY_LABELS } from '../constants/clothTypeCategories';

interface ClothTypeComboboxProps {
  /** Flat active cloth-type list — used only to look up the current [value]'s name. */
  clothTypes: ClothType[];
  /** Same grouped-by-category map already used to build the old <optgroup>s. */
  clothTypesByCategory: Map<string, ClothType[]>;
  value: string;
  onChange: (clothTypeId: string) => void;
}

/**
 * Drop-in replacement for the native <select> used to pick a cloth type while
 * itemizing an order. Same grouped options, same onChange(clothTypeId)
 * contract — just filterable by name as you type, since native <select>
 * typeahead only matches by prefix and has no visible search box.
 */
export const ClothTypeCombobox: React.FC<ClothTypeComboboxProps> = ({
  clothTypes,
  clothTypesByCategory,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // The live, user-typed search text. Deliberately NOT seeded from the
  // current selection on open — filteredGroups below is derived straight
  // from this, so seeding it would immediately (and confusingly) narrow the
  // list on every reopen. Reopening must show the full list, exactly like
  // the native <select>; only [highlightedId] reflects the current value.
  const [query, setQuery] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Unique per mounted instance (one per breakdown row) so aria-controls /
  // aria-activedescendant / option ids never collide if this component is
  // ever rendered more than once — don't rely on _id-derived strings alone
  // sharing scope with a hardcoded base id.
  const instanceId = useId();
  const listboxId = `${instanceId}-listbox`;
  const optionId = (clothTypeId: string) => `${instanceId}-option-${clothTypeId}`;

  const selected = useMemo(
    () => clothTypes.find((c) => c._id === value),
    [clothTypes, value],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return clothTypesByCategory;
    const filtered = new Map<string, ClothType[]>();
    for (const [category, items] of clothTypesByCategory) {
      const matches = items.filter((c) => c.name.toLowerCase().includes(normalizedQuery));
      if (matches.length > 0) filtered.set(category, matches);
    }
    return filtered;
  }, [clothTypesByCategory, normalizedQuery]);

  const flatFiltered = useMemo(() => [...filteredGroups.values()].flat(), [filteredGroups]);

  // Keep the highlighted option in view when navigating by keyboard —
  // mirrors the native <select>'s auto-scroll-into-view behaviour.
  useEffect(() => {
    if (!isOpen || !highlightedId) return;
    listboxRef.current
      ?.querySelector(`[data-id="${highlightedId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedId]);

  const openDropdown = () => {
    setIsOpen(true);
    // Highlight the current selection (if any) so keyboard nav starts from
    // it, same as a native <select> — but don't touch the search query.
    setHighlightedId(selected?._id ?? flatFiltered[0]?._id ?? null);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
  };

  const selectItem = (clothType: ClothType) => {
    // A native <select>'s change event never fires when re-picking the
    // already-selected option — match that, don't force a parent re-render
    // for a no-op.
    if (clothType._id !== value) {
      onChange(clothType._id);
    }
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = flatFiltered.findIndex((c) => c._id === highlightedId);
      setHighlightedId(flatFiltered[Math.min(idx + 1, flatFiltered.length - 1)]?._id ?? null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = flatFiltered.findIndex((c) => c._id === highlightedId);
      setHighlightedId(flatFiltered[Math.max(idx - 1, 0)]?._id ?? null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const match = flatFiltered.find((c) => c._id === highlightedId);
      if (match) selectItem(match);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  };

  const displayValue = isOpen ? query : (selected?.name ?? '');

  return (
    <div
      ref={containerRef}
      className="relative flex-1"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          closeDropdown();
        }
      }}
    >
      <div className="relative">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlightedId ? optionId(highlightedId) : undefined}
          value={displayValue}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          placeholder="Select cloth type"
          className="w-full pl-6 pr-2 py-1.5 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
        />
      </div>

      {isOpen && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg"
        >
          {flatFiltered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No matches</p>
          ) : (
            [...filteredGroups.entries()].map(([category, items]) => (
              <div key={category}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {category === 'uncategorized'
                    ? 'Uncategorized'
                    : CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </p>
                {items.map((c) => (
                  <button
                    key={c._id}
                    id={optionId(c._id)}
                    data-id={c._id}
                    type="button"
                    role="option"
                    aria-selected={c._id === value}
                    // Skip this button as a Tab stop — a native <select> is
                    // always exactly one tab stop, never one per option.
                    tabIndex={-1}
                    // Prevent the browser's default mousedown behaviour
                    // (shifting focus to the button) so the input never
                    // blurs during a mouse selection — this is what keeps
                    // focus on the input afterwards, matching native
                    // <select>, without needing to manually restore focus
                    // (which would race with onFocus reopening the dropdown).
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectItem(c)}
                    onMouseEnter={() => setHighlightedId(c._id)}
                    className={`block w-full text-left px-3 py-1.5 text-xs ${
                      c._id === highlightedId ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                    } ${c._id === value ? 'font-semibold text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
