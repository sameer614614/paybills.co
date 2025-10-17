import { Router } from 'express';
import {
  agentCreateBiller,
  agentCreatePaymentMethod,
  agentDeleteBiller,
  agentDeletePaymentMethod,
  agentGetCustomer,
  agentListPaymentMethods,
  agentLogin,
  agentSearchCustomers,
  agentUpdateBiller,
  agentUpdatePaymentMethod,
} from '../controllers/agentController.js';
import { authenticateAgent } from '../middleware/authenticateAgent.js';
import { requireApprovedHost } from '../middleware/requireApprovedHost.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', requireApprovedHost('agent'), asyncHandler(agentLogin));

router.use(requireApprovedHost('agent'));
router.use(authenticateAgent);

router.get('/customers', asyncHandler(agentSearchCustomers));
router.get('/customers/:id', asyncHandler(agentGetCustomer));

router.post('/customers/:id/billers', asyncHandler(agentCreateBiller));
router.put('/customers/:id/billers/:billerId', asyncHandler(agentUpdateBiller));
router.delete('/customers/:id/billers/:billerId', asyncHandler(agentDeleteBiller));

router.get('/customers/:id/payment-methods', asyncHandler(agentListPaymentMethods));
router.post('/customers/:id/payment-methods', asyncHandler(agentCreatePaymentMethod));
router.put('/customers/:id/payment-methods/:paymentMethodId', asyncHandler(agentUpdatePaymentMethod));
router.delete('/customers/:id/payment-methods/:paymentMethodId', asyncHandler(agentDeletePaymentMethod));

export default router;
