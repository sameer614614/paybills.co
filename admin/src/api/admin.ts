import { apiRequest } from './client.js';

export type AdminLoginResponse = {
  token: string;
  admin: { username: string };
};

export type AgentSummary = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  customers: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      customerNumber: string;
    };
  }>;
};

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  customerNumber: string;
  createdAt: string;
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
    createdAt: string;
    updatedAt: string;
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
    createdAt: string;
    updatedAt: string;
  }>;
  receipts: Array<{
    id: string;
    amount: string;
    paidOn: string;
    confirmation: string;
    notes: string | null;
    createdAt: string;
    biller: { id: string; name: string };
  }>;
};

export type TransactionRecord = {
  id: string;
  amount: string;
  paidOn: string;
  confirmation: string;
  notes: string | null;
  biller: { id: string; name: string };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    customerNumber: string;
  };
};

export type BillerRecord = {
  id: string;
  name: string;
  category: string;
  accountId: string;
  contactInfo: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    customerNumber: string;
  };
};

export async function loginAdmin(payload: { username: string; password: string }) {
  return apiRequest<AdminLoginResponse>('/admin/login', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchAgents(token: string) {
  const response = await apiRequest<{ agents: AgentSummary[] }>('/admin/agents', { token });
  return response.agents;
}

export async function createAgent(token: string, payload: { username: string; password: string; fullName: string; email?: string; phone?: string }) {
  const response = await apiRequest<{ agent: AgentSummary }>(
    '/admin/agents',
    {
      method: 'POST',
      token,
      body: payload,
    },
  );
  return response.agent;
}

export async function updateAgent(token: string, id: string, payload: { password?: string; fullName?: string; email?: string | null; phone?: string | null }) {
  const response = await apiRequest<{ agent: AgentSummary }>(
    `/admin/agents/${id}`,
    {
      method: 'PUT',
      token,
      body: payload,
    },
  );
  return response.agent;
}

export async function deleteAgent(token: string, id: string) {
  await apiRequest<null>(`/admin/agents/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function fetchCustomers(token: string, search?: string) {
  const response = await apiRequest<{ customers: CustomerSummary[] }>('/admin/customers', {
    token,
    params: { search },
  });
  return response.customers;
}

export async function fetchCustomer(token: string, id: string) {
  const response = await apiRequest<{ customer: CustomerDetail }>(`/admin/customers/${id}`, {
    token,
  });
  return response.customer;
}

export async function fetchTransactions(token: string, search?: string) {
  const response = await apiRequest<{ transactions: TransactionRecord[] }>('/admin/transactions', {
    token,
    params: { search },
  });
  return response.transactions;
}

export async function fetchBillers(token: string, search?: string) {
  const response = await apiRequest<{ billers: BillerRecord[] }>('/admin/billers', {
    token,
    params: { search },
  });
  return response.billers;
}
