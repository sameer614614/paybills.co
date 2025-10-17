import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getReceipts } from '../controllers/receiptController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(getReceipts));

export default router;
