import type { Request, Response } from 'express';

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(err: ApiError, _req: Request, res: Response) {
  const status = err.status ?? 500;
  const message = err.message || 'Internal server error';
  const payload: Record<string, unknown> = {
    message,
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
