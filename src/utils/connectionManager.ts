import { prisma } from '../db/prisma';

/**
 * Connection manager for handling periodic cleanup and monitoring
 */
class ConnectionManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isCleanupRunning = false;
  
  /**
   * Start periodic connection cleanup
   */
  public startPeriodicCleanup(intervalMs: number = 300000): void { // 5 minutes default
    if (process.env.NODE_ENV !== 'production') return;
    
    console.log('🔧 Starting periodic connection cleanup');
    
    this.cleanupInterval = setInterval(async () => {
      if (this.isCleanupRunning) return;
      
      this.isCleanupRunning = true;
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Periodic cleanup failed:', error);
      } finally {
        this.isCleanupRunning = false;
      }
    }, intervalMs);
  }
  
  /**
   * Stop periodic cleanup
   */
  public stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped periodic connection cleanup');
    }
  }
  
  /**
   * Perform connection cleanup
   */
  private async performCleanup(): Promise<void> {
    try {
      // Check if database is reachable
      await prisma.$queryRaw`SELECT 1`;
      
      // Force disconnect to clean up idle connections
      await prisma.$disconnect();
      
      console.log('🧹 Periodic connection cleanup completed');
    } catch (error) {
      console.error('Connection cleanup failed:', error);
    }
  }
  
  /**
   * Monitor connection health
   */
  public async getConnectionStatus(): Promise<{
    isHealthy: boolean;
    timestamp: string;
  }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        isHealthy: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Connection health check failed:', error);
      return {
        isHealthy: false,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.stopPeriodicCleanup();
    
    try {
      await prisma.$disconnect();
      console.log('✅ Database connections closed gracefully');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
  }
}

export const connectionManager = new ConnectionManager();

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await connectionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await connectionManager.shutdown();
  process.exit(0);
});
