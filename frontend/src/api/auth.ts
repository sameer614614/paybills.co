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
  dateOfBirth?: string;
  ssnLast4?: string;
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

export type UpdateProfileInput = {
  email?: string;
  phone?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
};

export async function updateProfile(token: string, payload: UpdateProfileInput) {
  return apiClient.patch<{ user: Profile; requiresReauthentication: boolean }>('/auth/profile', payload, { auth: token });
}

export async function changePassword(token: string, payload: { currentPassword: string; newPassword: string; confirmNewPassword: string }) {
  return apiClient.post<{ requiresReauthentication: boolean }>('/auth/change-password', payload, { auth: token });
}

export async function requestPasswordReset(payload: { ssnLast4: string; dateOfBirth: string; customerNumber?: string }) {
  return apiClient.post<{ message: string; expiresAt: string; token?: string; email?: string }>('/auth/forgot-password', payload);
}

export async function resetPassword(payload: { token: string; newPassword: string; confirmPassword: string }) {
  return apiClient.post<AuthResponse>('/auth/reset-password', payload);
}
