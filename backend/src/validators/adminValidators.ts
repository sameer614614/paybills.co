import { z } from 'zod';

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const agentCreateSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const agentUpdateSchema = z.object({
  password: z.string().min(8).optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});
