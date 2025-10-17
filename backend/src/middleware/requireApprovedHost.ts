import type { NextFunction, Request, Response } from 'express';
import { securityConfig } from '../config/security.js';

type AccessScope = 'admin' | 'agent';

type HeaderValue = string | string[] | undefined;

function extractHost(value: string) {
  try {
    const url = new URL(value);
    return url.host.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function normalizeHeaderValue(value: HeaderValue): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeHeaderValue(entry));
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => extractHost(entry));
}

function matchesAllowed(host: string, allowedHosts: string[]) {
  if (!host) {
    return false;
  }
  const withoutPort = host.includes(':') ? host.split(':')[0] : host;
  return allowedHosts.some((allowed) => {
    if (allowed === host) {
      return true;
    }
    if (allowed === withoutPort) {
      return true;
    }
    return false;
  });
}

export function requireApprovedHost(scope: AccessScope) {
  const allowedHosts = scope === 'admin' ? securityConfig.adminHosts : securityConfig.agentHosts;
  return (req: Request, res: Response, next: NextFunction) => {
    const hostsToCheck = [
      ...normalizeHeaderValue(req.headers['x-forwarded-host']),
      ...normalizeHeaderValue(req.headers.origin),
      ...normalizeHeaderValue(req.headers.referer),
      ...normalizeHeaderValue(req.headers.host),
    ];

    const isAllowed = hostsToCheck.some((host) => matchesAllowed(host, allowedHosts));

    if (!isAllowed) {
      return res.status(403).json({ message: 'Access restricted to approved network routes' });
    }

    return next();
  };
}
