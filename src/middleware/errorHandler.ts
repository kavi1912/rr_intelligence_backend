import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details for debugging (but don't expose to client)
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = 'Internal server error';

  // Sanitize and categorize errors
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Data already exists';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code?.startsWith('P')) {
    statusCode = 400;
    message = 'Invalid request';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication failed';
  }

  // Validation errors - only expose safe validation messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    // Only return the message if it's a safe validation error
    message = err.message.includes('required') || err.message.includes('invalid') 
      ? err.message 
      : 'Invalid input data';
  }

  // Rate limiting errors
  if (err.message === 'Too many requests') {
    statusCode = 429;
    message = 'Too many requests, please try again later';
  }

  // Network/timeout errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  // Generic error response (no sensitive information)
  const response: any = {
    error: message,
    timestamp: new Date().toISOString()
  };

  // Only include stack trace in development and for non-production errors
  if (process.env.NODE_ENV === 'development' && statusCode !== 500) {
    response.details = err.message;
  }

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
