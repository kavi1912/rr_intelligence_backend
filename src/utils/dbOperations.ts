import { prisma } from '../db/prisma';

/**
 * Wrapper for database operations that ensures proper error handling
 * and connection management
 */
export async function executeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  try {
    console.log(`🔄 Executing: ${operationName}`);
    const result = await operation();
    console.log(`✅ Completed: ${operationName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${operationName}`, error);
    throw error;
  }
}

/**
 * Wrapper for database transactions with automatic rollback
 */
export async function executeTransaction<T>(
  operation: (tx: any) => Promise<T>,
  operationName: string = 'Database transaction'
): Promise<T> {
  try {
    console.log(`🔄 Starting transaction: ${operationName}`);
    const result = await prisma.$transaction(operation);
    console.log(`✅ Transaction completed: ${operationName}`);
    return result;
  } catch (error) {
    console.error(`❌ Transaction failed: ${operationName}`, error);
    throw error;
  }
}

/**
 * Utility to check database connection health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Force connection cleanup (use sparingly)
 */
export async function forceCleanup(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🧹 Database connections cleaned up');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}
