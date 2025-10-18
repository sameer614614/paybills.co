import { Router } from 'express';
import {
  login,
  profile,
  register,
  updateProfileController,
  changePasswordController,
  requestPasswordResetController,
  resetPasswordController,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/profile', authenticate, asyncHandler(profile));
router.patch('/profile', authenticate, asyncHandler(updateProfileController));
router.post('/change-password', authenticate, asyncHandler(changePasswordController));
router.post('/forgot-password', asyncHandler(requestPasswordResetController));
router.post('/reset-password', asyncHandler(resetPasswordController));

export default router;
