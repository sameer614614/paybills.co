import { createContext } from 'react';

type AgentAuthState = {
  token: string | null;
  agent: {
    id: string;
    username: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  login: (auth: { token: string; agent: AgentAuthState['agent'] }) => void;
  logout: () => void;
};

export const AgentAuthContext = createContext<AgentAuthState | undefined>(undefined);
