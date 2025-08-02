"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const jwt_1 = require("../utils/jwt");
const database_1 = require("../utils/database");
const authenticateToken = async (req, res, next) => {
    try {
        const token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(401).json({ error: 'Authentication token required' });
            return;
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        if (!decoded || !decoded.id || !decoded.email || !decoded.username) {
            res.status(401).json({ error: 'Invalid token payload' });
            return;
        }
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, username: true, createdAt: true }
        });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
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
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({
            error: 'Authentication failed'
        });
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = (0, jwt_1.extractTokenFromHeader)(authHeader);
        if (!token) {
            next();
            return;
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        if (!decoded || !decoded.id || !decoded.email || !decoded.username) {
            next();
            return;
        }
        const user = await database_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Optional auth error:', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map