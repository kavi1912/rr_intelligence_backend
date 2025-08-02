"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    let statusCode = err.statusCode || 500;
    let message = 'Internal server error';
    if (err.code === 'P2002') {
        statusCode = 409;
        message = 'Data already exists';
    }
    else if (err.code === 'P2025') {
        statusCode = 404;
        message = 'Resource not found';
    }
    else if (err.code?.startsWith('P')) {
        statusCode = 400;
        message = 'Invalid request';
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication failed';
    }
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message.includes('required') || err.message.includes('invalid')
            ? err.message
            : 'Invalid input data';
    }
    if (err.message === 'Too many requests') {
        statusCode = 429;
        message = 'Too many requests, please try again later';
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
        statusCode = 503;
        message = 'Service temporarily unavailable';
    }
    const response = {
        error: message,
        timestamp: new Date().toISOString()
    };
    if (process.env.NODE_ENV === 'development' && statusCode !== 500) {
        response.details = err.message;
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map