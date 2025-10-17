import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getBillers } from '../controllers/billerController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(getBillers));

export default router;
