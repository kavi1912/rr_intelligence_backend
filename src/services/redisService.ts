import { createClient, RedisClientType } from 'redis';

class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      // For development, use simple in-memory storage if Redis is not available
      if (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL) {
        console.log('⚠️  Redis not configured, using in-memory storage for chat sessions');
        return;
      }

      this.client = createClient({
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
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      console.log('📝 Using in-memory storage fallback');
      this.client = null;
      this.isConnected = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('✅ Redis disconnected successfully');
    }
  }

  // Chat session management
  public async setChatSession(telegramUserId: string, sessionData: any, ttlSeconds = 3600): Promise<void> {
    if (!this.client || !this.isConnected) {
      // Fallback to in-memory storage (for development)
      InMemoryStorage.set(`chat:${telegramUserId}`, sessionData, ttlSeconds);
      return;
    }

    try {
      await this.client.setEx(`chat:${telegramUserId}`, ttlSeconds, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error setting chat session:', error);
      InMemoryStorage.set(`chat:${telegramUserId}`, sessionData, ttlSeconds);
    }
  }

  public async getChatSession(telegramUserId: string): Promise<any | null> {
    if (!this.client || !this.isConnected) {
      return InMemoryStorage.get(`chat:${telegramUserId}`);
    }

    try {
      const sessionData = await this.client.get(`chat:${telegramUserId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting chat session:', error);
      return InMemoryStorage.get(`chat:${telegramUserId}`);
    }
  }

  public async deleteChatSession(telegramUserId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      InMemoryStorage.delete(`chat:${telegramUserId}`);
      return;
    }

    try {
      await this.client.del(`chat:${telegramUserId}`);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      InMemoryStorage.delete(`chat:${telegramUserId}`);
    }
  }

  // Generic key-value operations
  public async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      InMemoryStorage.set(key, value, ttlSeconds);
      return;
    }

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      InMemoryStorage.set(key, value, ttlSeconds);
    }
  }

  public async get(key: string): Promise<any | null> {
    if (!this.client || !this.isConnected) {
      return InMemoryStorage.get(key);
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return InMemoryStorage.get(key);
    }
  }

  public async delete(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      InMemoryStorage.delete(key);
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      InMemoryStorage.delete(key);
    }
  }
}

// Fallback in-memory storage for development
class InMemoryStorage {
  private static data = new Map<string, { value: any; expires?: number }>();

  public static set(key: string, value: any, ttlSeconds?: number): void {
    const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.data.set(key, { value, expires });
  }

  public static get(key: string): any | null {
    const entry = this.data.get(key);
    if (!entry) return null;

    if (entry.expires && Date.now() > entry.expires) {
      this.data.delete(key);
      return null;
    }

    return entry.value;
  }

  public static delete(key: string): void {
    this.data.delete(key);
  }

  public static clear(): void {
    this.data.clear();
  }
}

export const redisService = RedisService.getInstance();
