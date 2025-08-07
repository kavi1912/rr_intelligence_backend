import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { AuthRequest } from '../types';
import { prisma } from '../db/prisma';

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and verify token
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id || !decoded.email || !decoded.username) {
      res.status(401).json({ error: 'Invalid token payload' });
      return;
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, createdAt: true }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Verify email matches (extra security check)
    if (user.email !== decoded.email) {
      res.status(401).json({ error: 'Token validation failed' });
      return;
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Authentication failed'
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      next();
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id || !decoded.email || !decoded.username) {
      next();
      return;
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, createdAt: true }
    });

    if (!user || user.email !== decoded.email) {
      next();
      return;
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username
    };
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    console.error('Optional auth error:', error);
    next();
  }
};
