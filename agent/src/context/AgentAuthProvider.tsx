import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AgentAuthContext } from './AgentAuthContext.js';

type StoredAuth = {
  token: string;
  agent: {
    id: string;
    username: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

function loadStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem('pbwu.agent.auth');
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function AgentAuthProvider({ children }: { children: ReactNode }) {
  const initial = loadStoredAuth();
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [agent, setAgent] = useState<StoredAuth['agent']>(initial?.agent ?? null);

  const login = useCallback((auth: StoredAuth) => {
    setToken(auth.token);
    setAgent(auth.agent);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pbwu.agent.auth', JSON.stringify(auth));
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAgent(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('pbwu.agent.auth');
    }
  }, []);

  const value = useMemo(
    () => ({
      token,
      agent,
      login,
      logout,
    }),
    [token, agent, login, logout],
  );

  return <AgentAuthContext.Provider value={value}>{children}</AgentAuthContext.Provider>;
}
