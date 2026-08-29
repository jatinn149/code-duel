import { describe, it, expect, vi, beforeEach } from 'vitest';
import { roomManager, sanitizeRoomForUser } from '../socket/room-manager';
import { Room, MatchState, GameMode, User, UserRole, PresenceStatus, Rank, RoundType } from '@code-duel/types';
import { redisCache } from '../utils/redis-cache';

vi.mock('ioredis', () => {
  class Redis {
    store = new Map<string, string>();
    on = vi.fn();
    get = vi.fn().mockImplementation(async (key) => this.store.get(key) || null);
    set = vi.fn().mockImplementation(async (key, val) => {
      this.store.set(key, val);
      return 'OK';
    });
    del = vi.fn().mockImplementation(async (key) => {
      this.store.delete(key);
      return 1;
    });
    eval = vi.fn().mockImplementation(async (_script, _keyCount, key, expectedVer, _epoch, roomStr) => {
      const curStr = this.store.get(key);
      if (curStr) {
        const cur = JSON.parse(curStr);
        if (expectedVer && expectedVer > 0 && cur.version !== expectedVer) {
          return -1;
        }
      }
      this.store.set(key, roomStr);
      return 1;
    });
    incr = vi.fn().mockResolvedValue(1);
    expire = vi.fn().mockResolvedValue(1);
    rpush = vi.fn().mockResolvedValue(1);
  }
  return { default: Redis, Redis };
});

describe('Competitive Integrity & Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const redisInstance = (redisCache as any);
    if (redisInstance.store) {
      redisInstance.store.clear();
    }
  });

  describe('Issue 2 — Unauthorized Match Joins', () => {
    const newUser: User = {
      id: 'user-2',
      username: 'player2',
      email: 'p2@example.com',
      playerId: 'CD-TEST-P2',
      passwordHash: 'hash',
      role: UserRole.USER,
      rating: 1200,
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

    it('should allow joining WAITING rooms', async () => {
      const mockRoom: Room = {
        id: 'room-waiting-1',
        version: 1,
        players: [{ id: 'user-1', username: 'player-1', connected: true, isReady: true, isOwner: true, rating: 1200, lastSeen: '' }],
        maxPlayers: 2,
        state: MatchState.WAITING,
        gameMode: GameMode.MULTI_ROUND,
        ownerId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        epoch: 0,
      };
      await roomManager.saveRoom(mockRoom);

      const joined = await roomManager.joinRoom('room-waiting-1', newUser);
      expect(joined.players).toHaveLength(2);
      expect(joined.players[1].id).toBe('user-2');
    });

    it('should reject joins on PLAYING matches with MATCH_ALREADY_IN_PROGRESS', async () => {
      const mockRoom: Room = {
        id: 'room-playing-1',
        version: 1,
        players: [{ id: 'user-1', username: 'player-1', connected: true, isReady: true, isOwner: true, rating: 1200, lastSeen: '' }],
        maxPlayers: 2,
        state: MatchState.PLAYING,
        gameMode: GameMode.MULTI_ROUND,
        ownerId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        epoch: 0,
      };
      await roomManager.saveRoom(mockRoom);

      await expect(roomManager.joinRoom('room-playing-1', newUser)).rejects.toThrow('MATCH_ALREADY_IN_PROGRESS');
    });

    it('should reject joins on RESULTS / FINISHED matches with MATCH_FINISHED', async () => {
      const mockRoom: Room = {
        id: 'room-finished-1',
        version: 1,
        players: [{ id: 'user-1', username: 'player-1', connected: true, isReady: true, isOwner: true, rating: 1200, lastSeen: '' }],
        maxPlayers: 2,
        state: MatchState.RESULTS,
        gameMode: GameMode.MULTI_ROUND,
        ownerId: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        epoch: 0,
      };
      await roomManager.saveRoom(mockRoom);

      await expect(roomManager.joinRoom('room-finished-1', newUser)).rejects.toThrow('MATCH_FINISHED');
    });
  });

  describe('Issue 1 — Hidden Testcase & Code Exposure Prevention', () => {
    it('should sanitize opponent code and test results completely for opponent/spectators', () => {
      const mockRoom: Room = {
        id: 'room-playing-1',
        version: 2,
        state: MatchState.PLAYING,
        gameMode: GameMode.MULTI_ROUND,
        ownerId: 'user-1',
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        epoch: 0,
        players: [
          { id: 'user-1', username: 'player-1', connected: true, isReady: true, isOwner: true, rating: 1200, lastSeen: '' },
          { id: 'user-2', username: 'player-2', connected: true, isReady: true, isOwner: false, rating: 1200, lastSeen: '' },
        ],
        currentRound: 1,
        rounds: [
          {
            roundIndex: 1,
            problemId: 'prob-1',
            duration: 300,
            roundType: RoundType.SPEED,
            submissions: {
              'user-1': {
                userId: 'user-1',
                code: 'def solution(): return True',
                language: 'python',
                status: 'ACCEPTED',
                submittedAt: new Date().toISOString(),
                attempts: 1,
                testResults: [
                  { id: 'tc-1', testCaseId: 'tc-1', isHidden: false, passed: true, input: '1', expectedOutput: '1', actualOutput: '1' } as any,
                  { id: 'tc-2', testCaseId: 'tc-2', isHidden: true, passed: true, input: 'secret', expectedOutput: 'secret', actualOutput: 'secret' } as any,
                ],
              } as any,
            },
          },
        ],
      };

      // 1. Sanitize for opponent (user-2)
      const sanitizedForOpponent = sanitizeRoomForUser(mockRoom, 'user-2');
      const oppRound = sanitizedForOpponent.rounds![0];
      const oppSubOfUser1 = oppRound.submissions!['user-1'];

      // Code must be empty, status PENDING, and testResults deleted
      expect(oppSubOfUser1.code).toBe('');
      expect(oppSubOfUser1.status).toBe('PENDING');
      expect(oppSubOfUser1.testResults).toBeUndefined();

      // 2. Sanitize for player themselves (user-1)
      const sanitizedForPlayer = sanitizeRoomForUser(mockRoom, 'user-1');
      const playerRound = sanitizedForPlayer.rounds![0];
      const playerSub = playerRound.submissions!['user-1'];

      // Code intact, results present
      expect(playerSub.code).toBe('def solution(): return True');
      expect(playerSub.testResults).toBeDefined();
      expect(playerSub.testResults).toHaveLength(2);

      // Non-hidden testcase preserves inputs/outputs
      expect((playerSub.testResults![0] as any).input).toBe('1');
      
      // Hidden testcase must have all secret inputs/outputs stripped
      expect((playerSub.testResults![1] as any).input).toBeUndefined();
      expect((playerSub.testResults![1] as any).expectedOutput).toBeUndefined();
      expect((playerSub.testResults![1] as any).actualOutput).toBeUndefined();
    });
  });
});
