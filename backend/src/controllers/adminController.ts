import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ADMIN_CREDENTIALS } from '../config/admin.js';
import { env } from '../config/env.js';
import { adminLoginSchema, agentCreateSchema, agentUpdateSchema } from '../validators/adminValidators.js';
import { createAgent, deleteAgent, listAgents, updateAgent } from '../services/agentService.js';
import { getCustomerDetail, listBillersWithCustomers, listTransactions, searchCustomers } from '../services/customerService.js';
import type { AdminAuthenticatedRequest } from '../middleware/authenticateAdmin.js';

export async function adminLogin(req: Request, res: Response) {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid login payload', details: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;
  if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    {
      username: ADMIN_CREDENTIALS.username,
      role: 'admin',
    },
    env.JWT_SECRET,
    {
      subject: 'admin',
      expiresIn: '4h',
    },
  );

  res.json({ token, admin: { username: ADMIN_CREDENTIALS.username } });
}

export async function getAgents(_req: AdminAuthenticatedRequest, res: Response) {
  const agents = await listAgents();
  res.json({ agents });
}

export async function createAgentController(req: AdminAuthenticatedRequest, res: Response) {
  const parsed = agentCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid agent payload', details: parsed.error.flatten() });
  }

  const agent = await createAgent(parsed.data);
  res.status(201).json({ agent });
}

export async function updateAgentController(req: AdminAuthenticatedRequest, res: Response) {
  const parsed = agentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid agent update payload', details: parsed.error.flatten() });
  }

  const agent = await updateAgent(req.params.id, parsed.data);
  res.json({ agent });
}

export async function deleteAgentController(req: AdminAuthenticatedRequest, res: Response) {
  await deleteAgent(req.params.id);
  res.status(204).send();
}

export async function getCustomers(req: AdminAuthenticatedRequest, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const customers = await searchCustomers(search);
  res.json({ customers });
}

export async function getCustomer(req: AdminAuthenticatedRequest, res: Response) {
  const customer = await getCustomerDetail(req.params.id);
  res.json({ customer });
}

export async function getTransactionsController(req: AdminAuthenticatedRequest, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const transactions = await listTransactions(search);
  res.json({ transactions });
}

export async function getBillersController(req: AdminAuthenticatedRequest, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const billers = await listBillersWithCustomers(search);
  res.json({ billers });
}
