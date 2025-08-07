import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

/**
 * Middleware to handle database connection cleanup after each request
 * This ensures connections are returned to the pool properly
 */
export const connectionCleanupMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Track when request starts
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to cleanup connections
  res.end = function(chunk?: any, encoding?: any) {
    // Call original end function
    originalEnd.call(this, chunk, encoding);
    
    // Cleanup database connections after response is sent (less aggressive)
    setImmediate(async () => {
      try {
        const duration = Date.now() - startTime;
        
        // Only disconnect for long-running requests or in specific conditions
        if (process.env.NODE_ENV === 'production') {
          // Disconnect only if request took longer than 5 seconds
          // or if there are likely many connections
          if (duration > 5000) {
            console.log(`Long-running request (${duration}ms), disconnecting Prisma client`);
            await prisma.$disconnect();
          }
        }
      } catch (error) {
        console.error('Error during connection cleanup:', error);
      }
    });
  };
  
  next();
};

/**
 * Alternative cleanup function for specific routes that need it
 */
export const forceConnectionCleanup = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error during forced connection cleanup:', error);
  }
};
