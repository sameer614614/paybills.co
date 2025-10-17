import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';

export async function searchCustomers(query?: string) {
  const where: Prisma.UserWhereInput | undefined = query
    ? {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { customerNumber: { contains: query, mode: 'insensitive' } },
        ],
      }
    : undefined;

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      customerNumber: true,
      createdAt: true,
    },
  });
}

export async function getCustomerDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      customerNumber: true,
      createdAt: true,
      billers: {
        select: {
          id: true,
          name: true,
          category: true,
          accountId: true,
          contactInfo: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      },
      paymentMethods: {
        select: {
          id: true,
          type: true,
          provider: true,
          accountNumber: true,
          cardholderName: true,
          nickname: true,
          expMonth: true,
          expYear: true,
          brand: true,
          last4: true,
          billingAddressLine1: true,
          billingAddressLine2: true,
          billingCity: true,
          billingState: true,
          billingPostalCode: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      receipts: {
        select: {
          id: true,
          amount: true,
          paidOn: true,
          confirmation: true,
          downloadUrl: true,
          notes: true,
          createdAt: true,
          biller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { paidOn: 'desc' },
      },
    },
  });

  if (!user) {
    const error = new Error('Customer not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  return user;
}

export async function listBillersWithCustomers(query?: string) {
  const where: Prisma.BillerWhereInput | undefined = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { accountId: { contains: query, mode: 'insensitive' } },
        ],
      }
    : undefined;

  return prisma.biller.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      category: true,
      accountId: true,
      contactInfo: true,
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
  });
}

export async function listTransactions(query?: string) {
  const where: Prisma.ReceiptWhereInput | undefined = query
    ? {
        OR: [
          { confirmation: { contains: query, mode: 'insensitive' } },
          { user: { firstName: { contains: query, mode: 'insensitive' } } },
          { user: { lastName: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
          { user: { phone: { contains: query, mode: 'insensitive' } } },
          { user: { customerNumber: { contains: query, mode: 'insensitive' } } },
        ],
      }
    : undefined;

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { paidOn: 'desc' },
    select: {
      id: true,
      amount: true,
      paidOn: true,
      confirmation: true,
      notes: true,
      biller: {
        select: {
          id: true,
          name: true,
        },
      },
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
  });

  return receipts;
}
