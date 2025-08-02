"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = void 0;
const redis_1 = require("redis");
class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    async connect() {
        if (this.isConnected && this.client) {
            return;
        }
        try {
            if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
                console.log('⚠️  Redis not configured, using in-memory storage for chat sessions');
                return;
            }
            this.client = (0, redis_1.createClient)({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });
            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });
            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
            });
            await this.client.connect();
        }
        catch (error) {
            console.error('❌ Redis connection failed:', error);
            console.log('📝 Using in-memory storage fallback');
            this.client = null;
            this.isConnected = false;
        }
    }
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.disconnect();
            this.isConnected = false;
            console.log('✅ Redis disconnected successfully');
        }
    }
    async setChatSession(telegramUserId, sessionData, ttlSeconds = 3600) {
        if (!this.client || !this.isConnected) {
            InMemoryStorage.set(`chat:${telegramUserId}`, sessionData, ttlSeconds);
            return;
        }
        try {
            await this.client.setEx(`chat:${telegramUserId}`, ttlSeconds, JSON.stringify(sessionData));
        }
        catch (error) {
            console.error('Error setting chat session:', error);
            InMemoryStorage.set(`chat:${telegramUserId}`, sessionData, ttlSeconds);
        }
    }
    async getChatSession(telegramUserId) {
        if (!this.client || !this.isConnected) {
            return InMemoryStorage.get(`chat:${telegramUserId}`);
        }
        try {
            const sessionData = await this.client.get(`chat:${telegramUserId}`);
            return sessionData ? JSON.parse(sessionData) : null;
        }
        catch (error) {
            console.error('Error getting chat session:', error);
            return InMemoryStorage.get(`chat:${telegramUserId}`);
        }
    }
    async deleteChatSession(telegramUserId) {
        if (!this.client || !this.isConnected) {
            InMemoryStorage.delete(`chat:${telegramUserId}`);
            return;
        }
        try {
            await this.client.del(`chat:${telegramUserId}`);
        }
        catch (error) {
            console.error('Error deleting chat session:', error);
            InMemoryStorage.delete(`chat:${telegramUserId}`);
        }
    }
    async set(key, value, ttlSeconds) {
        if (!this.client || !this.isConnected) {
            InMemoryStorage.set(key, value, ttlSeconds);
            return;
        }
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, stringValue);
            }
            else {
                await this.client.set(key, stringValue);
            }
        }
        catch (error) {
            console.error(`Error setting key ${key}:`, error);
            InMemoryStorage.set(key, value, ttlSeconds);
        }
    }
    async get(key) {
        if (!this.client || !this.isConnected) {
            return InMemoryStorage.get(key);
        }
        try {
            const value = await this.client.get(key);
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        catch (error) {
            console.error(`Error getting key ${key}:`, error);
            return InMemoryStorage.get(key);
        }
    }
    async delete(key) {
        if (!this.client || !this.isConnected) {
            InMemoryStorage.delete(key);
            return;
        }
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error(`Error deleting key ${key}:`, error);
            InMemoryStorage.delete(key);
        }
    }
}
class InMemoryStorage {
    static set(key, value, ttlSeconds) {
        const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
        this.data.set(key, { value, expires });
    }
    static get(key) {
        const entry = this.data.get(key);
        if (!entry)
            return null;
        if (entry.expires && Date.now() > entry.expires) {
            this.data.delete(key);
            return null;
        }
        return entry.value;
    }
    static delete(key) {
        this.data.delete(key);
    }
    static clear() {
        this.data.clear();
    }
}
InMemoryStorage.data = new Map();
exports.redisService = RedisService.getInstance();
//# sourceMappingURL=redisService.js.map