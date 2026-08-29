import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

const redisUrl = (env.REDIS_URL || 'redis://127.0.0.1:6379').replace('localhost', '127.0.0.1');

export const redisCache = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  },
});

redisCache.on('error', (err: Error) => {
  logger.error({ err }, 'Redis Cache Error');
});

export const CACHE_KEYS = {
  ALL_PROBLEMS: 'cache:problems:all',
  LEADERBOARD: (tier: string, date: string) => `cache:leaderboard:${tier}:${date}`,
  USER_PROFILE: (userId: string) => `cache:user:${userId}`,
};

export const CACHE_TTL = {
  PROBLEMS: 60 * 60, // 1 hour
  LEADERBOARD: 60 * 5, // 5 minutes
  USER_PROFILE: 60 * 15, // 15 minutes
};
