import { Router } from 'express';
import authRoutes from './authRoutes.js';
import paymentMethodRoutes from './paymentMethodRoutes.js';
import billerRoutes from './billerRoutes.js';
import receiptRoutes from './receiptRoutes.js';
import adminRoutes from './adminRoutes.js';
import agentRoutes from './agentRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/billers', billerRoutes);
router.use('/receipts', receiptRoutes);
router.use('/admin', adminRoutes);
router.use('/agent', agentRoutes);

export default router;
