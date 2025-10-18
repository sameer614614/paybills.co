import { apiClient } from './client';

export type PaymentMethod = {
  id: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT';
  provider: string;
  cardholderName: string | null;
  nickname: string | null;
  expMonth: number | null;
  expYear: number | null;
  brand: string | null;
  last4: string;
  routingNumber: string | null;
  accountType: string | null;
  ownerName: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BillingAddressInput = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
};

export type CreatePaymentMethodInput = {
  type: PaymentMethod['type'];
  provider: string;
  accountNumber: string;
  cardholderName?: string | null;
  nickname?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  brand?: string | null;
  securityCode?: string | null;
  routingNumber?: string | null;
  accountType?: string | null;
  ownerName?: string | null;
  billingAddress?: BillingAddressInput | null;
  useProfileAddress?: boolean;
  isDefault?: boolean;
};

export async function getPaymentMethods(token: string) {
  return apiClient.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods', { auth: token });
}

export async function addPaymentMethod(token: string, payload: CreatePaymentMethodInput) {
  return apiClient.post<{ paymentMethod: PaymentMethod }>('/payment-methods', payload, { auth: token });
}

export async function updatePaymentMethod(
  token: string,
  id: string,
  payload: Partial<CreatePaymentMethodInput> & { isDefault?: boolean },
) {
  return apiClient.patch<{ paymentMethod: PaymentMethod }>(`/payment-methods/${id}`, payload, { auth: token });
}

export async function deletePaymentMethod(token: string, id: string) {
  return apiClient.delete<void>(`/payment-methods/${id}`, { auth: token });
}
