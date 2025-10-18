import { z } from 'zod';

const currentYear = new Date().getFullYear();

const stringCleaner = (value: unknown) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return value as string | undefined | null;
};

const optionalNumber = (min: number, max: number) =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null) {
        return null;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return null;
        }

        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? value : parsed;
      }

      return value;
    }, z.number().int().min(min).max(max).nullable())
    .optional();

const billingAddressSchema = z.object({
  line1: z
    .preprocess(stringCleaner, z.string().min(1, 'Address line 1 is required')),
  line2: z.preprocess(stringCleaner, z.string().optional().nullable()),
  city: z.preprocess(stringCleaner, z.string().min(1, 'City is required')),
  state: z.preprocess(stringCleaner, z.string().min(2, 'State is required')),
  postalCode: z
    .preprocess(stringCleaner, z.string().min(3, 'Postal code is required')),
});

export const paymentMethodSchema = z
  .object({
    type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']),
    provider: z
      .preprocess(stringCleaner, z.string().min(1, 'Provider is required')),
    accountNumber: z
      .preprocess(stringCleaner, z.string().min(4, 'Account number is required')),
    confirmAccountNumber: z
      .preprocess(stringCleaner, z.string().min(4, 'Please re-enter the account number')),
    cardholderName: z.preprocess(stringCleaner, z.string().optional().nullable()),
    nickname: z.string().optional().nullable(),
    expMonth: optionalNumber(1, 12),
    expYear: optionalNumber(currentYear, currentYear + 15),
    brand: z.preprocess(stringCleaner, z.string().optional().nullable()),
    securityCode: z
      .preprocess(stringCleaner, z.string().optional().nullable()),
    routingNumber: z
      .preprocess(stringCleaner, z.string().optional().nullable()),
    accountType: z
      .preprocess(stringCleaner, z.string().optional().nullable()),
    ownerName: z.preprocess(stringCleaner, z.string().optional().nullable()),
    billingAddress: billingAddressSchema.optional().nullable(),
    useProfileAddress: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const sanitizedAccount = data.accountNumber.replace(/\s+/g, '');
    const digitsOnly = sanitizedAccount.replace(/\D/g, '');
    const confirmDigits = data.confirmAccountNumber.replace(/\s+/g, '').replace(/\D/g, '');

    if (digitsOnly !== confirmDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Account numbers must match.',
      });
    }

    if (data.type !== 'BANK_ACCOUNT' && digitsOnly.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Card numbers must include at least 12 digits.',
      });
    }

    if (data.type === 'BANK_ACCOUNT' && digitsOnly.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Account numbers must include at least 4 digits.',
      });
    }

    if (data.type !== 'BANK_ACCOUNT') {
      if (!data.cardholderName || data.cardholderName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cardholderName'],
          message: 'Card holder name is required.',
        });
      }

      if (data.expMonth == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expMonth'],
          message: 'Expiration month is required for cards.',
        });
      }

      if (data.expYear == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expYear'],
          message: 'Expiration year is required for cards.',
        });
      }

      const sanitizedSecurityCode = data.securityCode?.replace(/\s+/g, '');
      if (!sanitizedSecurityCode || !/^\d{3,4}$/.test(sanitizedSecurityCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['securityCode'],
          message: 'CVV must be 3 or 4 digits.',
        });
      }

      if (!data.useProfileAddress && !data.billingAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingAddress'],
          message: 'Provide a billing address or use your profile address.',
        });
      }
    } else {
      const sanitizedRoutingNumber = data.routingNumber?.replace(/\s+/g, '');
      if (!sanitizedRoutingNumber || !/^\d{9}$/.test(sanitizedRoutingNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['routingNumber'],
          message: 'Routing numbers must be nine digits.',
        });
      }

      if (!data.accountType || data.accountType.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accountType'],
          message: 'Select an account type.',
        });
      }

      if (!data.ownerName || data.ownerName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ownerName'],
          message: 'Enter the account owner name.',
        });
      }
    }
  });

export const paymentMethodUpdateSchema = z
  .object({
    provider: z.preprocess(stringCleaner, z.string().min(1, 'Provider is required')).optional(),
    nickname: z.string().optional().nullable(),
    cardholderName: z.preprocess(stringCleaner, z.string().optional().nullable()),
    expMonth: optionalNumber(1, 12),
    expYear: optionalNumber(currentYear, currentYear + 15),
    brand: z.preprocess(stringCleaner, z.string().optional().nullable()),
    accountNumber: z
      .preprocess(stringCleaner, z.string().min(4, 'Account number must have at least 4 digits'))
      .optional(),
    securityCode: z
      .preprocess(stringCleaner, z.string().optional().nullable()),
    routingNumber: z.preprocess(stringCleaner, z.string().optional().nullable()),
    accountType: z.preprocess(stringCleaner, z.string().optional().nullable()),
    ownerName: z.preprocess(stringCleaner, z.string().optional().nullable()),
    billingAddress: billingAddressSchema.optional().nullable(),
    useProfileAddress: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const sanitizedSecurityCode = data.securityCode?.replace(/\s+/g, '');
    if (sanitizedSecurityCode && !/^\d{3,4}$/.test(sanitizedSecurityCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['securityCode'],
        message: 'CVV must be 3 or 4 digits.',
      });
    }

    if (data.routingNumber) {
      const sanitizedRoutingNumber = data.routingNumber.replace(/\s+/g, '');
      if (!/^\d{9}$/.test(sanitizedRoutingNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['routingNumber'],
          message: 'Routing numbers must be nine digits.',
        });
      }
    }

    if (data.accountType && data.accountType.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountType'],
        message: 'Select an account type.',
      });
    }

    if (data.ownerName && data.ownerName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ownerName'],
        message: 'Enter the account owner name.',
      });
    }
  });
