import { useContext } from 'react';
import { AgentAuthContext } from '../context/AgentAuthContext.js';

export function useAgentAuth() {
  const ctx = useContext(AgentAuthContext);
  if (!ctx) {
    throw new Error('useAgentAuth must be used within an AgentAuthProvider');
  }
  return ctx;
}
