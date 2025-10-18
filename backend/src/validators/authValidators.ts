import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  ssnLast4: z.string().regex(/^\d{4}$/),
  phone: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(2),
  postalCode: z.string().min(5),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(7).optional().nullable(),
    addressLine1: z.string().min(1).optional(),
    addressLine2: z.string().optional().nullable(),
    city: z.string().min(1).optional(),
    state: z.string().min(2).optional(),
    postalCode: z.string().min(3).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[a-z]/, 'Include at least one lowercase letter.')
      .regex(/[0-9]/, 'Include at least one number.')
      .regex(/[!@#$%^&*(),.?":{}|<>\[\];'`~\\/+-=_]/, 'Include at least one symbol.'),
    confirmNewPassword: z.string().min(1),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmNewPassword) {
      ctx.addIssue({
        path: ['confirmNewPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match.',
      });
    }
  });

export const passwordResetRequestSchema = z.object({
  ssnLast4: z.string().regex(/^\d{4}$/),
  dateOfBirth: z.string(),
  customerNumber: z.string().optional(),
});

export const passwordResetSchema = z
  .object({
    token: z.string().min(10),
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[a-z]/, 'Include at least one lowercase letter.')
      .regex(/[0-9]/, 'Include at least one number.')
      .regex(/[!@#$%^&*(),.?":{}|<>\[\];'`~\\/+-=_]/, 'Include at least one symbol.'),
    confirmPassword: z.string().min(1),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match.',
      });
    }
  });
