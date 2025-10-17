import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authenticateAgentCredentials } from '../services/agentService.js';
import { getCustomerDetail, searchCustomers } from '../services/customerService.js';
import {
  createBillerForUser,
  deleteBillerForUser,
  updateBillerForUser,
} from '../services/billerService.js';
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  updatePaymentMethod,
} from '../services/paymentMethodService.js';
import { paymentMethodSchema, paymentMethodUpdateSchema } from '../validators/paymentMethodValidators.js';
import { agentBillerCreateSchema, agentBillerUpdateSchema, agentLoginSchema } from '../validators/agentValidators.js';
import type { AgentAuthenticatedRequest } from '../middleware/authenticateAgent.js';

const normalizeNullable = (value?: string | null) => (value && value.length > 0 ? value : null);

export async function agentLogin(req: Request, res: Response) {
  const parsed = agentLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid login payload', details: parsed.error.flatten() });
  }

  const agent = await authenticateAgentCredentials(parsed.data.username, parsed.data.password);

  const token = jwt.sign(
    {
      role: 'agent',
      username: agent.username,
    },
    env.JWT_SECRET,
    {
      subject: agent.id,
      expiresIn: '4h',
    },
  );

  res.json({
    token,
    agent: {
      id: agent.id,
      username: agent.username,
      fullName: agent.fullName,
      email: agent.email,
      phone: agent.phone,
    },
  });
}

export async function agentSearchCustomers(req: AgentAuthenticatedRequest, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const customers = await searchCustomers(search);
  res.json({ customers });
}

export async function agentGetCustomer(req: AgentAuthenticatedRequest, res: Response) {
  const customer = await getCustomerDetail(req.params.id);
  res.json({ customer });
}

export async function agentCreateBiller(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId } = req.params;
  const parsed = agentBillerCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid biller payload', details: parsed.error.flatten() });
  }

  const biller = await createBillerForUser(userId, parsed.data);
  res.status(201).json({ biller });
}

export async function agentUpdateBiller(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId, billerId } = req.params as { id: string; billerId: string };
  const parsed = agentBillerUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid biller payload', details: parsed.error.flatten() });
  }

  const biller = await updateBillerForUser(userId, billerId, parsed.data);
  res.json({ biller });
}

export async function agentDeleteBiller(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId, billerId } = req.params as { id: string; billerId: string };
  await deleteBillerForUser(userId, billerId);
  res.status(204).send();
}

export async function agentListPaymentMethods(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId } = req.params;
  const paymentMethods = await listPaymentMethods(userId);
  res.json({ paymentMethods });
}

export async function agentCreatePaymentMethod(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId } = req.params;
  const parsed = paymentMethodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid payment method payload', details: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const paymentMethod = await createPaymentMethod(userId, {
    type: payload.type,
    provider: payload.provider,
    accountNumber: payload.accountNumber,
    cardholderName: normalizeNullable(payload.cardholderName),
    nickname: normalizeNullable(payload.nickname),
    expMonth: payload.expMonth ?? null,
    expYear: payload.expYear ?? null,
    brand: normalizeNullable(payload.brand),
    securityCode: normalizeNullable(payload.securityCode),
    billingAddress: payload.billingAddress ?? null,
    useProfileAddress: payload.useProfileAddress ?? false,
    isDefault: payload.isDefault ?? false,
  });
  res.status(201).json({ paymentMethod });
}

export async function agentUpdatePaymentMethod(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId, paymentMethodId } = req.params as { id: string; paymentMethodId: string };
  const parsed = paymentMethodUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: 'Invalid payment method payload', details: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const paymentMethod = await updatePaymentMethod(userId, paymentMethodId, {
    provider: payload.provider,
    nickname: normalizeNullable(payload.nickname),
    expMonth: payload.expMonth ?? null,
    expYear: payload.expYear ?? null,
    brand: normalizeNullable(payload.brand),
    cardholderName: normalizeNullable(payload.cardholderName),
    accountNumber: payload.accountNumber ?? null,
    securityCode: normalizeNullable(payload.securityCode),
    billingAddress: payload.billingAddress ?? null,
    useProfileAddress: payload.useProfileAddress,
    isDefault: payload.isDefault,
  });
  res.json({ paymentMethod });
}

export async function agentDeletePaymentMethod(req: AgentAuthenticatedRequest, res: Response) {
  const { id: userId, paymentMethodId } = req.params as { id: string; paymentMethodId: string };
  await deletePaymentMethod(userId, paymentMethodId);
  res.status(204).send();
}
