import { apiClient } from './client';

export interface ServiceAvailabilityConfig {
  instantEnabled: boolean;
  instantStartTime: string;
  instantEndTime: string;
  scheduledEnabled: boolean;
  scheduledStartTime: string;
  scheduledEndTime: string;
}

export type UpdateServiceAvailabilityPayload = Partial<ServiceAvailabilityConfig>;

export const serviceAvailabilityApi = {
  get: (): Promise<ServiceAvailabilityConfig> => apiClient('/service-availability'),

  update: (payload: UpdateServiceAvailabilityPayload): Promise<ServiceAvailabilityConfig> =>
    apiClient('/service-availability', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
