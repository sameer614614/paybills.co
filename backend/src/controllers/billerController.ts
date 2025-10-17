import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { listBillers } from '../services/billerService.js';

export async function getBillers(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const billers = await listBillers(userId);
  res.json({ billers });
}
