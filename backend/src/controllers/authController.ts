import type { Request, Response } from 'express';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { authenticateUser, getProfile, registerUser } from '../services/authService.js';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid registration payload', details: parsed.error.flatten() });
  }

  const user = await registerUser(parsed.data);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid login payload', details: parsed.error.flatten() });
  }

  const { token, user } = await authenticateUser(parsed.data.email, parsed.data.password);
  res.json({ token, user });
}

export async function profile(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = await getProfile(req.user.id);
  res.json({ user });
}
