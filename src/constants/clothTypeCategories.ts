import type { ClothTypeCategory } from '../api/clothTypesApi';

export const CATEGORY_LABELS: Record<ClothTypeCategory, string> = {
  ironing: 'Ironing',
  shoeCleaning: 'Shoe Cleaning',
  dryCleaning: 'Dry Cleaning',
  washFold: 'Wash & Fold',
  washIron: 'Wash & Iron',
  membership: 'Membership',
};

/** Stable display order for grouping cloth types by category. */
export const CATEGORY_ORDER: ClothTypeCategory[] = [
  'washFold',
  'washIron',
  'ironing',
  'dryCleaning',
  'shoeCleaning',
  'membership',
];
