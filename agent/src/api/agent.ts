import { apiRequest } from './client.js';

export type AgentLoginResponse = {
  token: string;
  agent: {
    id: string;
    username: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
};

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  customerNumber: string;
};

export type CustomerDetail = CustomerSummary & {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  billers: Array<{
    id: string;
    name: string;
    category: string;
    accountId: string;
    contactInfo: string | null;
  }>;
  paymentMethods: Array<{
    id: string;
    type: string;
    provider: string;
    nickname: string | null;
    brand: string | null;
    cardholderName: string | null;
    last4: string;
    expMonth: number | null;
    expYear: number | null;
    billingAddressLine1: string | null;
    billingAddressLine2: string | null;
    billingCity: string | null;
    billingState: string | null;
    billingPostalCode: string | null;
    isDefault: boolean;
  }>;
};

export type BillerPayload = {
  name: string;
  category: string;
  accountId: string;
  contactInfo?: string;
};

export type PaymentMethodPayload = {
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT';
  provider: string;
  accountNumber: string;
  cardholderName?: string;
  nickname?: string;
  expMonth?: number;
  expYear?: number;
  brand?: string;
  securityCode?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  useProfileAddress?: boolean;
  isDefault?: boolean;
};

export type PaymentMethodUpdatePayload = Partial<Omit<PaymentMethodPayload, 'type' | 'accountNumber'>> & {
  accountNumber?: string;
  securityCode?: string;
};

export async function loginAgent(payload: { username: string; password: string }) {
  return apiRequest<AgentLoginResponse>('/agent/login', {
    method: 'POST',
    body: payload,
  });
}

export async function searchCustomers(token: string, search?: string) {
  const response = await apiRequest<{ customers: CustomerSummary[] }>('/agent/customers', {
    token,
    params: { search },
  });
  return response.customers;
}

export async function fetchCustomer(token: string, id: string) {
  const response = await apiRequest<{ customer: CustomerDetail }>(`/agent/customers/${id}`, {
    token,
  });
  return response.customer;
}

export async function createCustomerBiller(token: string, customerId: string, payload: BillerPayload) {
  const response = await apiRequest<{ biller: CustomerDetail['billers'][number] }>(
    `/agent/customers/${customerId}/billers`,
    {
      method: 'POST',
      token,
      body: payload,
    },
  );
  return response.biller;
}

export async function updateCustomerBiller(token: string, customerId: string, billerId: string, payload: Partial<BillerPayload>) {
  const response = await apiRequest<{ biller: CustomerDetail['billers'][number] }>(
    `/agent/customers/${customerId}/billers/${billerId}`,
    {
      method: 'PUT',
      token,
      body: payload,
    },
  );
  return response.biller;
}

export async function deleteCustomerBiller(token: string, customerId: string, billerId: string) {
  await apiRequest<null>(`/agent/customers/${customerId}/billers/${billerId}`, {
    method: 'DELETE',
    token,
  });
}

export async function createCustomerPaymentMethod(token: string, customerId: string, payload: PaymentMethodPayload) {
  const response = await apiRequest<{ paymentMethod: CustomerDetail['paymentMethods'][number] }>(
    `/agent/customers/${customerId}/payment-methods`,
    {
      method: 'POST',
      token,
      body: payload,
    },
  );
  return response.paymentMethod;
}

export async function updateCustomerPaymentMethod(
  token: string,
  customerId: string,
  paymentMethodId: string,
  payload: PaymentMethodUpdatePayload,
) {
  const response = await apiRequest<{ paymentMethod: CustomerDetail['paymentMethods'][number] }>(
    `/agent/customers/${customerId}/payment-methods/${paymentMethodId}`,
    {
      method: 'PUT',
      token,
      body: payload,
    },
  );
  return response.paymentMethod;
}

export async function deleteCustomerPaymentMethod(token: string, customerId: string, paymentMethodId: string) {
  await apiRequest<null>(`/agent/customers/${customerId}/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
    token,
  });
}
