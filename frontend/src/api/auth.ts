import { apiClient } from './client';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  customerNumber?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Profile = AuthUser & {
  phone?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  createdAt?: string;
  customerNumber?: string;
};

export async function registerUser(payload: Record<string, unknown>) {
  return apiClient.post<{ user: AuthUser }>('/auth/register', payload);
}

export async function loginUser(payload: { email: string; password: string }) {
  return apiClient.post<AuthResponse>('/auth/login', payload);
}

export async function fetchProfile(token: string) {
  return apiClient.get<{ user: Profile }>('/auth/profile', { auth: token });
}
