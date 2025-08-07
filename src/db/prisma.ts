import { PrismaClient } from '@prisma/client';

// Simple, reliable Prisma client for Cloud Run
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
});

export { prisma };
