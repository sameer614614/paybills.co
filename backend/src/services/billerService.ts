import type { BillerCategory } from '@prisma/client';
import prisma from '../utils/prisma.js';

export async function listBillers(userId: string) {
  return prisma.biller.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      receipts: {
        orderBy: { paidOn: 'desc' },
        take: 3,
      },
    },
  });
}

export async function createBillerForUser(
  userId: string,
  data: { name: string; category: BillerCategory; accountId: string; contactInfo?: string | null },
) {
  return prisma.biller.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      accountId: data.accountId,
      contactInfo: data.contactInfo ?? null,
    },
  });
}

export async function updateBillerForUser(
  userId: string,
  billerId: string,
  data: { name?: string; category?: BillerCategory; accountId?: string; contactInfo?: string | null },
) {
  const existing = await prisma.biller.findUnique({ where: { id: billerId } });
  if (!existing || existing.userId !== userId) {
    const error = new Error('Biller not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  return prisma.biller.update({
    where: { id: billerId },
    data: {
      name: typeof data.name === 'string' ? data.name : existing.name,
      category: typeof data.category !== 'undefined' ? data.category : existing.category,
      accountId: typeof data.accountId === 'string' ? data.accountId : existing.accountId,
      contactInfo: typeof data.contactInfo !== 'undefined' ? data.contactInfo : existing.contactInfo,
    },
  });
}

export async function deleteBillerForUser(userId: string, billerId: string) {
  const existing = await prisma.biller.findUnique({ where: { id: billerId } });
  if (!existing || existing.userId !== userId) {
    const error = new Error('Biller not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  await prisma.biller.delete({ where: { id: billerId } });
}
