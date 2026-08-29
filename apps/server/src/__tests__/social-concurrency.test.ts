import fs from 'fs/promises';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JsonStorageAdapter } from '../storage/json-adapter';
import { JsonUserRepository } from '../repositories/json-user-repository';
import { JsonFriendRepository } from '../repositories/json-friend-repository';
import { JsonDuelInviteRepository } from '../repositories/json-duel-invite-repository';
import { JsonActivityRepository } from '../repositories/json-activity-repository';
import { JsonNotificationRepository } from '../repositories/json-notification-repository';
import { SocialService } from '../services/social-service';
import { NotificationService } from '../services/notification-service';
import { PresenceService } from '../services/presence-service';
import { RatingService } from '../services/rating-service';
import { JsonMatchResultRepository } from '../repositories/json-match-result-repository';
import { User, UserRole, PresenceStatus, Rank, MatchSummary } from '@code-duel/types';

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
  },
}));

describe('Social Systems & Concurrency Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-data-social-concurrency');
  let adapter: JsonStorageAdapter;
  let userRepo: JsonUserRepository;
  let friendRepo: JsonFriendRepository;
  let inviteRepo: JsonDuelInviteRepository;
  let activityRepo: JsonActivityRepository;
  let notificationRepo: JsonNotificationRepository;
  let matchRepo: JsonMatchResultRepository;
  let socialService: SocialService;
  let notificationService: NotificationService;
  let presenceService: PresenceService;

  beforeEach(async () => {
    adapter = new JsonStorageAdapter(testDir);
    await adapter.initialize();

    userRepo = new JsonUserRepository(adapter);
    friendRepo = new JsonFriendRepository(adapter);
    inviteRepo = new JsonDuelInviteRepository(adapter);
    activityRepo = new JsonActivityRepository(adapter);
    notificationRepo = new JsonNotificationRepository(adapter);
    matchRepo = new JsonMatchResultRepository(adapter);

    vi.spyOn(RatingService, 'getRecentMatchCount').mockImplementation(async (playerA, playerB) => {
      try {
        const matches = await adapter.read<any>('match-results') || [];
        const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const cutoffTime = past24Hours.getTime();
        return matches.filter((m: any) => {
          const endedTime = new Date(m.endedAt).getTime();
          return (
            endedTime >= cutoffTime &&
            ['MULTI_ROUND', 'QUICKODE'].includes(m.mode) &&
            m.results.some((p: any) => p.userId === playerA) &&
            m.results.some((p: any) => p.userId === playerB) &&
            m.results.some((p: any) => p.ratingChange !== 0)
          );
        }).length;
      } catch {
        return 0;
      }
    });

    const mockIo = {
      to: () => ({
        emit: () => {},
      }),
      emit: () => {},
    } as any;

    presenceService = new PresenceService(mockIo);
    notificationService = new NotificationService(notificationRepo, mockIo);
    socialService = new SocialService(
      userRepo,
      friendRepo,
      inviteRepo,
      activityRepo,
      notificationService,
      presenceService
    );

    // Seed test users
    const user1: User = {
      id: 'u1',
      username: 'user1',
      email: 'u1@example.com',
      playerId: 'CD-AAAA-1111',
      passwordHash: 'hash',
      role: UserRole.USER,
      rating: 1000,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      xp: 0,
      level: 1,
      rank: Rank.UNRANKED,
      streak: 0,
      status: PresenceStatus.ONLINE,
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
    } as any;

    const user2: User = {
      id: 'u2',
      username: 'user2',
      email: 'u2@example.com',
      playerId: 'CD-BBBB-2222',
      passwordHash: 'hash',
      role: UserRole.USER,
      rating: 1000,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      xp: 0,
      level: 1,
      rank: Rank.UNRANKED,
      streak: 0,
      status: PresenceStatus.ONLINE,
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    await adapter.write('users', [user1, user2]);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Friend Request Concurrency & Auto-Friending', () => {
    it('should establish instant friendship when both users add each other mutually', async () => {
      // User 1 adds User 2
      const req1 = await socialService.sendFriendRequest('u1', 'u2');
      expect(req1.status).toBe('PENDING');

      // User 2 adds User 1 (Mutual) -> should auto-accept
      const req2 = await socialService.sendFriendRequest('u2', 'u1');
      expect(req2.status).toBe('ACCEPTED');

      const friends1 = await socialService.getFriends('u1');
      const friends2 = await socialService.getFriends('u2');

      expect(friends1).toContainEqual(expect.objectContaining({ id: 'u2' }));
      expect(friends2).toContainEqual(expect.objectContaining({ id: 'u1' }));

      // Cleaned up pending requests completely
      const pending1 = await friendRepo.getPendingRequests('u1');
      const pending2 = await friendRepo.getPendingRequests('u2');
      expect(pending1).toHaveLength(0);
      expect(pending2).toHaveLength(0);
    });

    it('should handle race condition of dual accepts without duplicate friendships', async () => {
      const req = await socialService.sendFriendRequest('u1', 'u2');

      // Concurrent accepts
      const p1 = socialService.respondToFriendRequest('u2', req.id, 'ACCEPT');
      const p2 = socialService.respondToFriendRequest('u2', req.id, 'ACCEPT');

      const results = await Promise.allSettled([p1, p2]);
      
      const fulfilled = results.filter(r => r.status === 'fulfilled');

      // At least one accepts successfully, or both do without throwing (since we perform check first)
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const friends = await socialService.getFriends('u1');
      expect(friends).toHaveLength(1);
    });
  });

  describe('MMR Exploitation Controls', () => {
    it('should apply zero CP change after 5 repetitive same-opponent matches in 24 hours', async () => {
      const playerA = { id: 'u1', rating: 1000, status: 'completed' };
      const playerB = { id: 'u2', rating: 1000, status: 'completed' };

      // Match 1
      const c1 = await RatingService.calculateRatings(playerA, playerB, 'u1');
      expect(c1.ratingChangeA).toBe(48); // K=64, Expected=0.5, Multiplier=1.5 => 48 CP

      // Simulate 5 matches in repository
      for (let i = 1; i <= 5; i++) {
        const summary: MatchSummary = {
          roomId: `match-${i}`,
          winnerId: 'u1',
          mode: 'MULTI_ROUND',
          endedAt: new Date().toISOString(),
          durationMs: 60000,
          results: [
            { userId: 'u1', username: 'user1', score: 10, ratingChange: 48, newRating: 1000 + i * 48, status: 'completed' },
            { userId: 'u2', username: 'user2', score: 5, ratingChange: -48, newRating: 1000 - i * 48, status: 'completed' },
          ],
        };
        await matchRepo.saveMatchWithLock(summary, true);
      }

      // Match 6 -> Should have 0 CP change due to anti-farming protection
      playerA.rating = 1240;
      playerB.rating = 760;
      const c6 = await RatingService.calculateRatings(playerA, playerB, 'u1');
      
      expect(c6.ratingChangeA).toBe(0);
      expect(c6.ratingChangeB).toBe(0);
    });

    it('should ignore abandoned or disqualified matches for MMR adjustment', async () => {
      const playerA = { id: 'u1', rating: 1000, status: 'disqualified' };
      const playerB = { id: 'u2', rating: 1000, status: 'completed' };

      const changes = await RatingService.calculateRatings(playerA, playerB, 'u2');
      expect(changes.ratingChangeA).toBe(0);
      expect(changes.ratingChangeB).toBe(0);
    });
  });
});
