import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/authenticate.js';
import { listReceipts } from '../services/receiptService.js';

export async function getReceipts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const receipts = await listReceipts(userId);
  res.json({ receipts });
}
