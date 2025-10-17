import { BillerCategory } from '@prisma/client';
import { z } from 'zod';

export const agentLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const agentBillerCreateSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(BillerCategory),
  accountId: z.string().min(1),
  contactInfo: z.string().optional(),
});

export const agentBillerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.nativeEnum(BillerCategory).optional(),
  accountId: z.string().min(1).optional(),
  contactInfo: z.string().optional(),
});
