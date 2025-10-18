declare module '@billspay/backend/dist/app.js' {
  import type { Express } from 'express';
  export function createApp(): Express;
}

declare module '@billspay/backend/dist/routes/authRoutes.js' {
  import type { Router } from 'express';
  const router: Router;
  export default router;
}

declare module '@billspay/backend/dist/routes/adminRoutes.js' {
  import type { Router } from 'express';
  const router: Router;
  export default router;
}

declare module '@billspay/backend/dist/routes/paymentMethodRoutes.js' {
  import type { Router } from 'express';
  const router: Router;
  export default router;
}

declare module '@billspay/backend/dist/routes/billerRoutes.js' {
  import type { Router } from 'express';
  const router: Router;
  export default router;
}

declare module '@billspay/backend/dist/routes/receiptRoutes.js' {
  import type { Router } from 'express';
  const router: Router;
  export default router;
}

declare module '@billspay/backend/dist/middleware/authenticate.js' {
  import type { RequestHandler } from 'express';
  export const authenticate: RequestHandler;
}

declare module '@billspay/backend/dist/middleware/authenticateAdmin.js' {
  import type { RequestHandler } from 'express';
  export const authenticateAdmin: RequestHandler;
}

declare module '@billspay/backend/dist/middleware/authenticateAgent.js' {
  import type { RequestHandler } from 'express';
  export const authenticateAgent: RequestHandler;
}

declare module '@billspay/backend/dist/utils/prisma.js' {
  import type { PrismaClient } from '@prisma/client';
  const prisma: PrismaClient;
  export default prisma;
}

declare module '@billspay/backend/dist/utils/jwt.js' {
  export function signToken(payload: Record<string, unknown>, options?: Record<string, unknown>): string;
  export function verifyToken<T = unknown>(token: string): T;
}
