import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { env } from '../config/env.js';
import { generateCustomerNumber } from '../utils/customerNumber.js';

const SALT_ROUNDS = 12;

type DuplicateFieldErrors = Record<string, string>;

function createConflictError(message: string, fieldErrors: DuplicateFieldErrors) {
  const error = new Error(message) as Error & { status?: number; details?: { fieldErrors: Record<string, string[]> } };
  error.status = 409;
  error.details = {
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).map(([field, value]) => [field, [value]]),
    ),
  };
  return error;
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssnLast4: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
}) {
  const birthDate = new Date(data.dateOfBirth);

  const [emailConflict, ssnConflict, dobConflict] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.user.findFirst({ where: { ssnLast4: data.ssnLast4 } }),
    prisma.user.findFirst({ where: { dateOfBirth: birthDate } }),
  ]);

  const conflicts: DuplicateFieldErrors = {};

  if (emailConflict) {
    conflicts.email = 'An account already exists with this email address. Use a different email or sign in.';
  }

  if (ssnConflict) {
    conflicts.ssnLast4 = 'This Social Security number is already connected to an existing profile.';
  }

  if (dobConflict) {
    conflicts.dateOfBirth = 'This date of birth is already connected to an existing profile.';
  }

  if (Object.keys(conflicts).length > 0) {
    throw createConflictError('Registration blocked by duplicate identity details.', conflicts);
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const customerNumber = await generateCustomerNumber();

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      customerNumber,
      dateOfBirth: birthDate,
      ssnLast4: data.ssnLast4,
      phone: data.phone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
    },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    customerNumber: user.customerNumber,
  };
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error('Invalid email or password.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    const error = new Error('Invalid email or password.');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      email: user.email,
    },
    env.JWT_SECRET,
    { subject: user.id, expiresIn: '12h' },
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      customerNumber: user.customerNumber,
    },
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      ssnLast4: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      createdAt: true,
      customerNumber: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  return user;
}

export async function updateProfile(
  userId: string,
  data: {
    email?: string;
    phone?: string | null;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    state?: string;
    postalCode?: string;
  },
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });

  if (!existing) {
    const error = new Error('User not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const conflicts: DuplicateFieldErrors = {};

  if (data.email && data.email !== existing.email) {
    const emailInUse = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailInUse) {
      conflicts.email = 'This email is already connected to another account.';
    }
  }

  if (Object.keys(conflicts).length > 0) {
    throw createConflictError('Unable to update profile due to duplicate information.', conflicts);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email: data.email ?? existing.email,
      phone: data.phone ?? existing.phone,
      addressLine1: data.addressLine1 ?? existing.addressLine1,
      addressLine2: data.addressLine2 ?? existing.addressLine2,
      city: data.city ?? existing.city,
      state: data.state ?? existing.state,
      postalCode: data.postalCode ?? existing.postalCode,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      customerNumber: true,
    },
  });

  return {
    user: updated,
    emailChanged: Boolean(data.email && data.email !== existing.email),
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error('User not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!matches) {
    const error = new Error('Current password is incorrect.');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function requestPasswordReset(params: {
  email: string;
  ssnLast4: string;
  dateOfBirth: string;
}) {
  const user = await prisma.user.findUnique({ where: { email: params.email } });

  if (!user || user.ssnLast4 !== params.ssnLast4 || user.dateOfBirth.toISOString().split('T')[0] !== params.dateOfBirth) {
    const error = new Error('We could not find a profile that matches those details.');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return {
    token,
    email: user.email,
    expiresAt,
  };
}

export async function resetPassword(params: { token: string; newPassword: string }) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: params.token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    const error = new Error('This password reset link is invalid or has expired.');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(params.newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });
  });

  const user = await prisma.user.findUnique({
    where: { id: resetToken.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      customerNumber: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const token = jwt.sign(
    {
      email: user.email,
    },
    env.JWT_SECRET,
    { subject: user.id, expiresIn: '12h' },
  );

  return {
    token,
    user,
  };
}
