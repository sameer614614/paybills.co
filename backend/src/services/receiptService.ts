import prisma from '../utils/prisma.js';

export async function listReceipts(userId: string) {
  return prisma.receipt.findMany({
    where: { userId },
    orderBy: { paidOn: 'desc' },
    include: {
      biller: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
    },
  });
}
