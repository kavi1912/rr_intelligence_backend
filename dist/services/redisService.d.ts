declare class RedisService {
    private static instance;
    private client;
    private isConnected;
    private constructor();
    static getInstance(): RedisService;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    setChatSession(telegramUserId: string, sessionData: any, ttlSeconds?: number): Promise<void>;
    getChatSession(telegramUserId: string): Promise<any | null>;
    deleteChatSession(telegramUserId: string): Promise<void>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<any | null>;
    delete(key: string): Promise<void>;
}
export declare const redisService: RedisService;
export {};
//# sourceMappingURL=redisService.d.ts.map