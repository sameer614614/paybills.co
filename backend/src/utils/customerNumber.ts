import { randomInt } from 'crypto';
import prisma from './prisma.js';

const MIN_NUMBER = 10000;
const MAX_NUMBER = 99999;
const MAX_ATTEMPTS = 20;

export async function generateCustomerNumber() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = `CUST-${randomInt(MIN_NUMBER, MAX_NUMBER + 1)}`;
    const existing = await prisma.user.findUnique({ where: { customerNumber: candidate } });
    if (!existing) {
      return candidate;
    }
  }
  throw new Error('Unable to allocate a unique customer number');
}
