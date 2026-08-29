import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../../utils/logger';

export enum RedisConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

export class RedisManager {
  private static instance: RedisManager;
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private state: RedisConnectionState = RedisConnectionState.DISCONNECTED;
  private maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '10', 10);
  private connectionAttempts = 0;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private getBaseOptions(): RedisOptions {
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        this.connectionAttempts++;
        if (this.connectionAttempts > this.maxRetries) {
          logger.error({ times }, 'Redis max retries reached, degrading infrastructure');
          return null; // Stop retrying, let it fail
        }
        
        // Exponential backoff with a cap of 3 seconds
        const delay = Math.min(times * 200, 3000);
        this.state = RedisConnectionState.RECONNECTING;
        if (times % 5 === 0) {
            logger.warn({ attempt: times, nextRetryMs: delay }, 'Redis connection retry');
        }
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    };
  }

  public async initialize(): Promise<boolean> {
    if (this.state === RedisConnectionState.CONNECTED) return true;

    this.state = RedisConnectionState.CONNECTING;
    logger.info('Initializing Redis infrastructure...');

    const url = (process.env.REDIS_URL || 'redis://127.0.0.1:6379').replace('localhost', '127.0.0.1');
    logger.info(`Connecting to Redis at ${url}...`);

    try {
      this.client = new Redis(url, this.getBaseOptions());
      this.subscriber = new Redis(url, this.getBaseOptions());

      this.setupListeners(this.client, 'Client');
      this.setupListeners(this.subscriber, 'Subscriber');

      // Test connection
      await this.client.ping();
      this.state = RedisConnectionState.CONNECTED;
      this.connectionAttempts = 0;
      logger.info('Redis infrastructure initialized successfully');
      return true;
    } catch (error) {
      this.state = RedisConnectionState.ERROR;
      logger.error({ error }, 'Failed to initialize Redis infrastructure');
      return false;
    }
  }

  private setupListeners(redis: Redis, name: string) {
    redis.on('connect', () => {
      logger.debug(`Redis ${name} connecting...`);
    });
    
    redis.on('ready', () => {
      this.state = RedisConnectionState.CONNECTED;
      this.connectionAttempts = 0;
      logger.info(`Redis ${name} is ready`);
    });

    redis.on('error', (err: Error) => {
      // Prevent spamming ECONNREFUSED
      const code = (err as any).code;
      if (code === 'ECONNREFUSED') {
         if (this.connectionAttempts === 1) {
            logger.warn(`Redis ${name} connection refused (logging once until reconnect)`);
         }
      } else {
        logger.error({ err }, `Redis ${name} error`);
      }
      this.state = RedisConnectionState.ERROR;
    });

    redis.on('close', () => {
      if (this.state === RedisConnectionState.CONNECTED) {
          logger.warn(`Redis ${name} connection closed unexpectedly`);
      }
      this.state = RedisConnectionState.DISCONNECTED;
    });
  }

  public getClient(): Redis {
    if (!this.client) throw new Error('Redis client not initialized');
    return this.client;
  }

  public getSubscriber(): Redis {
    if (!this.subscriber) throw new Error('Redis subscriber not initialized');
    return this.subscriber;
  }

  public getState(): RedisConnectionState {
    return this.state;
  }

  public async close(): Promise<void> {
    if (this.client) await this.client.quit();
    if (this.subscriber) await this.subscriber.quit();
    this.state = RedisConnectionState.DISCONNECTED;
  }
}

export const redisManager = RedisManager.getInstance();
