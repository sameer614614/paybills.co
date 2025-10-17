import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AgentAuthenticatedRequest extends Request {
  agent?: {
    id: string;
    username: string;
  };
}

export function authenticateAgent(req: AgentAuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Agent authorization required' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { role: string; sub: string; username: string };
    if (payload.role !== 'agent') {
      return res.status(403).json({ message: 'Agent credentials required' });
    }
    req.agent = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired agent token' });
  }
}
