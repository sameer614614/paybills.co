import { apiClient } from './client';

export type Receipt = {
  id: string;
  amount: string;
  paidOn: string;
  confirmation: string;
  downloadUrl: string | null;
  notes: string | null;
  biller: {
    id: string;
    name: string;
    category: string;
  };
};

export async function getReceipts(token: string) {
  return apiClient.get<{ receipts: Receipt[] }>('/receipts', { auth: token });
}
