import { apiClient } from './client';

export type SlotType = 'pickup' | 'delivery' | 'both';

export interface StandardTimeSlot {
  _id: string;
  label: string;
  startTime: string;
  endTime: string;
  type: SlotType;
  daysAvailable: string[];
  capacity?: number;
  expectedTurnaround?: string;
  isActive: boolean;
  /** Non-null while a grace-period deactivation is in progress */
  effectiveUntil?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Slot returned by the /stats endpoint — includes today's order count */
export interface SlotStat extends StandardTimeSlot {
  orderCount: number;
}

export interface CreateSlotPayload {
  label: string;
  startTime: string;
  endTime: string;
  type: SlotType;
  daysAvailable: string[];
  capacity?: number;
  expectedTurnaround?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export const timeSlotsApi = {
  list: (): Promise<StandardTimeSlot[]> =>
    apiClient('/standard-time-slots'),

  /** Slot list with order counts for the given date (defaults to today) */
  stats: (date: string): Promise<SlotStat[]> =>
    apiClient(`/standard-time-slots/stats?date=${date}`),

  create: (payload: CreateSlotPayload): Promise<StandardTimeSlot> =>
    apiClient('/standard-time-slots', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<CreateSlotPayload>): Promise<StandardTimeSlot> =>
    apiClient(`/standard-time-slots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /**
   * Toggle a slot's isActive flag.
   * graceMinutes: when deactivating, keep slot visible to users for this many
   * minutes so in-progress checkouts can still complete.
   */
  toggle: (id: string, isActive: boolean, graceMinutes = 0): Promise<StandardTimeSlot> =>
    apiClient(`/standard-time-slots/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive, graceMinutes }),
    }),

  remove: (id: string): Promise<{ deleted: boolean }> =>
    apiClient(`/standard-time-slots/${id}`, { method: 'DELETE' }),
};
