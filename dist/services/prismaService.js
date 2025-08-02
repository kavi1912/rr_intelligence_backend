"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaService = void 0;
const client_1 = require("@prisma/client");
class PrismaService {
    constructor() {
        this.prisma = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            log: ['error', 'warn'],
        });
    }
    static getInstance() {
        if (!PrismaService.instance) {
            PrismaService.instance = new PrismaService();
        }
        return PrismaService.instance;
    }
    getClient() {
        return this.prisma;
    }
    async withConnection(operation) {
        try {
            const result = await operation(this.prisma);
            return result;
        }
        catch (error) {
            console.error('Database operation failed:', error);
            throw error;
        }
        finally {
            await this.prisma.$disconnect();
            this.prisma = new client_1.PrismaClient({
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL,
                    },
                },
                log: ['error', 'warn'],
            });
        }
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
}
exports.prismaService = PrismaService.getInstance();
exports.default = exports.prismaService;
//# sourceMappingURL=prismaService.js.map