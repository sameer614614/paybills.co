import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AdminAuthenticatedRequest extends Request {
  admin?: {
    username: string;
  };
}

export function authenticateAdmin(req: AdminAuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Admin authorization required' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { role: string; username: string };
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin credentials required' });
    }
    req.admin = { username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
}
