import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { encryptSensitive } from '../utils/encryption.js';

type PaymentMethodType = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_ACCOUNT';

export async function listPaymentMethods(userId: string) {
  return prisma.paymentMethod.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      type: true,
      provider: true,
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
  });
}

export async function createPaymentMethod(
  userId: string,
  data: {
    type: PaymentMethodType;
    provider: string;
    accountNumber: string;
    cardholderName?: string | null;
    nickname?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
    brand?: string | null;
    securityCode?: string | null;
    billingAddress?: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postalCode: string;
    } | null;
    useProfileAddress?: boolean;
    isDefault?: boolean;
  },
) {
  let billingAddress = data.billingAddress ?? null;

  if (data.useProfileAddress || !billingAddress) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
      },
    });

    if (user) {
      billingAddress = {
        line1: user.addressLine1,
        line2: user.addressLine2 ?? null,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
      };
    }
  }

  const shouldBeDefault = Boolean(data.isDefault);

  const sanitizedAccountNumber = data.accountNumber.replace(/\s+/g, '');
  const digitsOnly = sanitizedAccountNumber.replace(/\D/g, '');
  const sanitizedSecurityCode = data.securityCode ? data.securityCode.replace(/\s+/g, '') : null;

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (shouldBeDefault) {
      await tx.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const existingDefault = await tx.paymentMethod.findFirst({ where: { userId, isDefault: true } });

    const paymentMethod = await tx.paymentMethod.create({
      data: {
        userId,
        type: data.type,
        provider: data.provider,
        accountNumber: encryptSensitive(sanitizedAccountNumber),
        cardholderName: data.cardholderName ?? null,
        nickname: data.nickname ?? null,
        expMonth: data.expMonth ?? null,
        expYear: data.expYear ?? null,
        brand: data.brand ?? null,
        last4: digitsOnly.slice(-4),
        securityCode: sanitizedSecurityCode ? encryptSensitive(sanitizedSecurityCode) : null,
        billingAddressLine1: billingAddress?.line1 ?? null,
        billingAddressLine2: billingAddress?.line2 ?? null,
        billingCity: billingAddress?.city ?? null,
        billingState: billingAddress?.state ?? null,
        billingPostalCode: billingAddress?.postalCode ?? null,
        isDefault: shouldBeDefault || !existingDefault,
      },
    });

    if (!existingDefault && !shouldBeDefault) {
      await tx.paymentMethod.update({
        where: { id: paymentMethod.id },
        data: { isDefault: true },
      });
      paymentMethod.isDefault = true;
    }

    return paymentMethod;
  });

  return {
    id: created.id,
    type: created.type,
    provider: created.provider,
    cardholderName: created.cardholderName,
    nickname: created.nickname,
    expMonth: created.expMonth,
    expYear: created.expYear,
    brand: created.brand,
    last4: created.last4,
    billingAddressLine1: created.billingAddressLine1,
    billingAddressLine2: created.billingAddressLine2,
    billingCity: created.billingCity,
    billingState: created.billingState,
    billingPostalCode: created.billingPostalCode,
    isDefault: created.isDefault,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function updatePaymentMethod(
  userId: string,
  id: string,
  data: {
    provider?: string;
    nickname?: string | null;
    expMonth?: number | null;
    expYear?: number | null;
    brand?: string | null;
    cardholderName?: string | null;
    accountNumber?: string | null;
    securityCode?: string | null;
    billingAddress?: {
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postalCode: string;
    } | null;
    useProfileAddress?: boolean;
    isDefault?: boolean;
  },
) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    const error = new Error('Payment method not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  let billingAddress = data.billingAddress ?? null;

  if (data.useProfileAddress) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
      },
    });

    if (user) {
      billingAddress = {
        line1: user.addressLine1,
        line2: user.addressLine2 ?? null,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
      };
    }
  }

  const shouldBeDefault = data.isDefault === true;

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (shouldBeDefault) {
      await tx.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const sanitizedAccountNumber = data.accountNumber ? data.accountNumber.replace(/\s+/g, '') : null;
    const digitsOnly = sanitizedAccountNumber ? sanitizedAccountNumber.replace(/\D/g, '') : null;

    const sanitizedSecurityCodeUpdate = data.securityCode ? data.securityCode.replace(/\s+/g, '') : null;

    const updatedPaymentMethod = await tx.paymentMethod.update({
      where: { id },
      data: {
        provider: data.provider ?? existing.provider,
        nickname: data.nickname ?? existing.nickname,
        expMonth: data.expMonth ?? existing.expMonth,
        expYear: data.expYear ?? existing.expYear,
        brand: data.brand ?? existing.brand,
        cardholderName: data.cardholderName ?? existing.cardholderName,
        accountNumber: sanitizedAccountNumber
          ? encryptSensitive(sanitizedAccountNumber)
          : existing.accountNumber,
        securityCode: sanitizedSecurityCodeUpdate
          ? encryptSensitive(sanitizedSecurityCodeUpdate)
          : existing.securityCode,
        last4: digitsOnly ? digitsOnly.slice(-4) : existing.last4,
        billingAddressLine1: billingAddress
          ? billingAddress.line1
          : data.useProfileAddress
            ? null
            : existing.billingAddressLine1,
        billingAddressLine2: billingAddress
          ? billingAddress.line2 ?? null
          : data.useProfileAddress
            ? null
            : existing.billingAddressLine2,
        billingCity: billingAddress
          ? billingAddress.city
          : data.useProfileAddress
            ? null
            : existing.billingCity,
        billingState: billingAddress
          ? billingAddress.state
          : data.useProfileAddress
            ? null
            : existing.billingState,
        billingPostalCode: billingAddress
          ? billingAddress.postalCode
          : data.useProfileAddress
            ? null
            : existing.billingPostalCode,
        isDefault: shouldBeDefault ? true : existing.isDefault,
      },
    });

    if (!shouldBeDefault && !existing.isDefault && data.isDefault === false) {
      await tx.paymentMethod.update({
        where: { id },
        data: { isDefault: false },
      });
      updatedPaymentMethod.isDefault = false;
    }

    if (!shouldBeDefault && existing.isDefault && data.isDefault === false) {
      const replacement = await tx.paymentMethod.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { createdAt: 'asc' },
      });
      if (replacement) {
        await tx.paymentMethod.update({ where: { id: replacement.id }, data: { isDefault: true } });
        updatedPaymentMethod.isDefault = false;
      }
    }

    return updatedPaymentMethod;
  });

  return {
    id: updated.id,
    type: updated.type,
    provider: updated.provider,
    cardholderName: updated.cardholderName,
    nickname: updated.nickname,
    expMonth: updated.expMonth,
    expYear: updated.expYear,
    brand: updated.brand,
    last4: updated.last4,
    billingAddressLine1: updated.billingAddressLine1,
    billingAddressLine2: updated.billingAddressLine2,
    billingCity: updated.billingCity,
    billingState: updated.billingState,
    billingPostalCode: updated.billingPostalCode,
    isDefault: updated.isDefault,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deletePaymentMethod(userId: string, id: string) {
  const existing = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    const error = new Error('Payment method not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.paymentMethod.delete({ where: { id } });

    if (existing.isDefault) {
      const replacement = await tx.paymentMethod.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (replacement) {
        await tx.paymentMethod.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
    }
  });
}
