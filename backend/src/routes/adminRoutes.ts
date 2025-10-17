import { Router } from 'express';
import {
  adminLogin,
  createAgentController,
  deleteAgentController,
  getAgents,
  getBillersController,
  getCustomer,
  getCustomers,
  getTransactionsController,
  updateAgentController,
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/authenticateAdmin.js';
import { requireApprovedHost } from '../middleware/requireApprovedHost.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', requireApprovedHost('admin'), asyncHandler(adminLogin));

router.use(requireApprovedHost('admin'));
router.use(authenticateAdmin);

router.get('/agents', asyncHandler(getAgents));
router.post('/agents', asyncHandler(createAgentController));
router.put('/agents/:id', asyncHandler(updateAgentController));
router.delete('/agents/:id', asyncHandler(deleteAgentController));

router.get('/customers', asyncHandler(getCustomers));
router.get('/customers/:id', asyncHandler(getCustomer));
router.get('/transactions', asyncHandler(getTransactionsController));
router.get('/billers', asyncHandler(getBillersController));

export default router;
