import { createContext } from 'react';

type AdminAuthState = {
  token: string | null;
  admin: { username: string } | null;
  login: (token: string, admin: { username: string }) => void;
  logout: () => void;
};

export const AdminAuthContext = createContext<AdminAuthState | undefined>(undefined);
