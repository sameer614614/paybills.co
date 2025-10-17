import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { env } from '../config/env.js';
import { generateCustomerNumber } from '../utils/customerNumber.js';

const SALT_ROUNDS = 12;

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
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    const error = new Error('An account already exists for this email address.');
    (error as Error & { status?: number }).status = 409;
    throw error;
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
      dateOfBirth: new Date(data.dateOfBirth),
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
