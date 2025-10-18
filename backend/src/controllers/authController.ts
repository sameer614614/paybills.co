import type { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from '../validators/authValidators.js';
import {
  authenticateUser,
  getProfile,
  registerUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from '../services/authService.js';
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

export async function updateProfileController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: 'Invalid profile update payload',
      details: parsed.error.flatten(),
    });
  }

  const result = await updateProfile(req.user.id, parsed.data);

  res.json({ user: result.user, requiresReauthentication: result.emailChanged });
}

export async function changePasswordController(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const parsed = changePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      message: 'Invalid change password payload',
      details: parsed.error.flatten(),
    });
  }

  await changePassword(req.user.id, parsed.data.currentPassword, parsed.data.newPassword);

  res.json({ requiresReauthentication: true });
}

export async function requestPasswordResetController(req: Request, res: Response) {
  const parsed = passwordResetRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      message: 'Invalid password reset request payload',
      details: parsed.error.flatten(),
    });
  }

  const result = await requestPasswordReset(parsed.data);

  const payload: Record<string, unknown> = {
    message: 'Password reset link sent to the email on file.',
    expiresAt: result.expiresAt,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.token = result.token;
    payload.email = result.email;
  }

  res.json(payload);
}

export async function resetPasswordController(req: Request, res: Response) {
  const parsed = passwordResetSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      message: 'Invalid password reset payload',
      details: parsed.error.flatten(),
    });
  }

  const auth = await resetPassword({ token: parsed.data.token, newPassword: parsed.data.newPassword });

  res.json(auth);
}
