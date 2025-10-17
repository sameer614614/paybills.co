import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';

const SALT_ROUNDS = 12;

export async function listAgents() {
  return prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      customers: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              customerNumber: true,
            },
          },
        },
      },
    },
  });
}

export async function createAgent(data: {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
}) {
  const existing = await prisma.agent.findUnique({ where: { username: data.username } });
  if (existing) {
    const error = new Error('Agent username already in use');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  return prisma.agent.create({
    data: {
      username: data.username,
      passwordHash,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateAgent(
  id: string,
  data: {
    password?: string;
    fullName?: string;
    email?: string | null;
    phone?: string | null;
  },
) {
  const updateData: {
    passwordHash?: string;
    fullName?: string;
    email?: string | null;
    phone?: string | null;
  } = {};

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  }
  if (typeof data.fullName === 'string') {
    updateData.fullName = data.fullName;
  }
  if (typeof data.email !== 'undefined') {
    updateData.email = data.email ?? null;
  }
  if (typeof data.phone !== 'undefined') {
    updateData.phone = data.phone ?? null;
  }

  const agent = await prisma.agent.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return agent;
}

export async function deleteAgent(id: string) {
  await prisma.agent.delete({ where: { id } });
}

export async function authenticateAgentCredentials(username: string, password: string) {
  const agent = await prisma.agent.findUnique({ where: { username } });
  if (!agent) {
    const error = new Error('Invalid agent credentials');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  const matches = await bcrypt.compare(password, agent.passwordHash);
  if (!matches) {
    const error = new Error('Invalid agent credentials');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return agent;
}
