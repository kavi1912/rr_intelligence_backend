import { PrismaClient } from '@prisma/client';

// Simple, reliable Prisma client for Cloud Run with optimized connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
