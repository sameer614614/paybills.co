import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getPaymentMethods,
  patchPaymentMethod,
  postPaymentMethod,
  removePaymentMethod,
} from '../controllers/paymentMethodController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(getPaymentMethods));
router.post('/', asyncHandler(postPaymentMethod));
router.patch('/:id', asyncHandler(patchPaymentMethod));
router.delete('/:id', asyncHandler(removePaymentMethod));

export default router;
