import { env } from './env.js';

function parseHosts(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export const securityConfig = {
  adminHosts: parseHosts(env.ADMIN_ALLOWED_HOSTS),
  agentHosts: parseHosts(env.AGENT_ALLOWED_HOSTS),
};

if (securityConfig.adminHosts.length === 0) {
  throw new Error('ADMIN_ALLOWED_HOSTS must include at least one host');
}

if (securityConfig.agentHosts.length === 0) {
  throw new Error('AGENT_ALLOWED_HOSTS must include at least one host');
}
