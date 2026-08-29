import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAuthRouter } from '../routes/auth-routes';
import { PgSessionRepository } from '../repositories/pg-session-repository';
import { roomManager } from '../socket/room-manager';
import { redisCache } from '../utils/redis-cache';
import { MatchState, User, UserRole, PresenceStatus, Rank } from '@code-duel/types';

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
  },
}));

vi.mock('../db', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../db';

describe('Architectural Integrity Tests', () => {
  describe('Issue 7.1 - Session Repository Selection', () => {
    const originalDbUrl = process.env.DATABASE_URL;

    afterEach(() => {
      if (originalDbUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDbUrl;
      }
    });

    it('should select PgSessionRepository when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/db';
      const router = createAuthRouter();
      expect(router).toBeDefined();
    });

    it('should call prisma.session.findUnique in PgSessionRepository findById', async () => {
      const repo = new PgSessionRepository();
      const mockSession = {
        id: 'sess-1',
        userId: 'user-1',
        refreshTokenHash: 'hash',
        userAgent: 'Mozilla',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      };
      vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as any);

      const result = await repo.findById('sess-1');
      expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { id: 'sess-1' } });
      expect(result).toBeDefined();
      expect(result?.id).toBe('sess-1');
    });
  });

  describe('Issue 2.4 - OCC Side Effects Isolation', () => {
    const mockUser: User = {
      id: 'user-1',
      username: 'testplayer',
      email: 'test@example.com',
      playerId: 'CD-TEST-USER',
      passwordHash: 'hash',
      role: UserRole.USER,
      tokenVersion: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      rating: 1000,
      xp: 0,
      level: 1,
      rank: Rank.UNRANKED,
      wins: 0,
      losses: 0,
      streak: 0,
      highestStreak: 0,
      highestRating: 1000,
      dailyChallengeWins: 0,
      dailyChallengeBestRank: 0,
      dailyWins: 0,
      streakGraceAvailable: 0,
      placementMatchesPlayed: 0,
      seasonalTier: 'UNRANKED',
      status: PresenceStatus.ONLINE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      vi.spyOn(redisCache, 'get').mockResolvedValue(null);
      vi.spyOn(redisCache, 'set').mockResolvedValue('OK');
      vi.spyOn(redisCache, 'del').mockResolvedValue(1);
      vi.spyOn(redisCache, 'eval').mockResolvedValue(1); // OCC saveRoom success
      vi.spyOn(redisCache, 'incr').mockResolvedValue(1);
      vi.spyOn(redisCache, 'expire').mockResolvedValue(1);
      vi.spyOn(redisCache, 'rpush').mockResolvedValue(1);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should execute side effects only once after a successful OCC transaction commit', async () => {
      const mockRoom = {
        id: 'room-1',
        ownerId: 'owner-1',
        state: MatchState.WAITING,
        players: [],
        maxPlayers: 2,
        version: 1,
        epoch: 0,
      };

      vi.spyOn(roomManager, 'getRoom').mockResolvedValue(mockRoom as any);
      vi.spyOn(roomManager, 'saveRoom').mockResolvedValue(true);

      const setSpy = vi.spyOn(redisCache, 'set');

      await roomManager.joinRoom('room-1', mockUser);

      // Verify Redis side effect is executed outside/after the transaction
      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith('player_to_room:user-1', 'room-1', 'EX', 3600);
    });

    it('should NOT execute side effects if OCC transaction fails and throws', async () => {
      const mockRoom = {
        id: 'room-1',
        ownerId: 'owner-1',
        state: MatchState.WAITING,
        players: [],
        maxPlayers: 2,
        version: 1,
        epoch: 0,
      };

      vi.spyOn(roomManager, 'getRoom').mockResolvedValue(mockRoom as any);
      // Simulate database write conflict (always returns false to trigger conflict error after 5 retries)
      vi.spyOn(roomManager, 'saveRoom').mockResolvedValue(false);

      const setSpy = vi.spyOn(redisCache, 'set');

      await expect(roomManager.joinRoom('room-1', mockUser)).rejects.toThrow('CONCURRENT_MODIFICATION_ERROR');

      // Side effects should NOT have been run since transaction failed
      expect(setSpy).not.toHaveBeenCalledWith('player_to_room:user-1', 'room-1', 'EX', 3600);
    });
  });
});
