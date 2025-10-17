import { apiClient } from './client';

export type Biller = {
  id: string;
  name: string;
  category: 'INTERNET' | 'TV' | 'ELECTRIC' | 'MOBILE' | 'HOME' | 'INSURANCE' | 'OTHER';
  accountId: string;
  contactInfo: string | null;
  receipts: Array<{
    id: string;
    amount: string;
    paidOn: string;
    confirmation: string;
  }>;
};

export async function getBillers(token: string) {
  return apiClient.get<{ billers: Biller[] }>('/billers', { auth: token });
}
