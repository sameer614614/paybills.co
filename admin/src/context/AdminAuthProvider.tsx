import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AdminAuthContext } from './AdminAuthContext.js';

type StoredAuth = {
  token: string;
  admin: { username: string };
};

function loadStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem('pbwu.admin.auth');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const initial = loadStoredAuth();
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [admin, setAdmin] = useState<{ username: string } | null>(initial?.admin ?? null);

  const login = useCallback((nextToken: string, nextAdmin: { username: string }) => {
    setToken(nextToken);
    setAdmin(nextAdmin);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pbwu.admin.auth', JSON.stringify({ token: nextToken, admin: nextAdmin }));
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('pbwu.admin.auth');
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      admin,
      login,
      logout,
    }),
    [token, admin, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
