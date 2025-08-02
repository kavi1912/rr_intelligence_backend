import { PrismaClient } from '@prisma/client';

class PrismaService {
  private static instance: PrismaService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Configure connection pool for Railway
      log: ['error', 'warn'],
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  // Method to handle request-specific operations
  public async withConnection<T>(operation: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    try {
      // Execute the operation
      const result = await operation(this.prisma);
      return result;
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    } finally {
      // Force disconnect after each operation to close connection
      await this.prisma.$disconnect();
      // Recreate client for next operation
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: ['error', 'warn'],
      });
    }
  }

  // Graceful shutdown
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const prismaService = PrismaService.getInstance();
export default prismaService;
