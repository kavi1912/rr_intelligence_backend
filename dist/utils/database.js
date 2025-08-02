"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.db = void 0;
const client_1 = require("@prisma/client");
class DatabaseService {
    constructor() {
        this.prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
        });
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    async connect() {
        try {
            await this.prisma.$connect();
            console.log('✅ Database connected successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            console.log('✅ Database disconnected successfully');
        }
        catch (error) {
            console.error('❌ Database disconnection failed:', error);
            throw error;
        }
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error('❌ Database health check failed:', error);
            return false;
        }
    }
}
exports.db = DatabaseService.getInstance();
exports.prisma = exports.db.prisma;
//# sourceMappingURL=database.js.map