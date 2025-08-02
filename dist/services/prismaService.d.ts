import { PrismaClient } from '@prisma/client';
declare class PrismaService {
    private static instance;
    private prisma;
    private constructor();
    static getInstance(): PrismaService;
    getClient(): PrismaClient;
    withConnection<T>(operation: (prisma: PrismaClient) => Promise<T>): Promise<T>;
    disconnect(): Promise<void>;
}
export declare const prismaService: PrismaService;
export default prismaService;
//# sourceMappingURL=prismaService.d.ts.map