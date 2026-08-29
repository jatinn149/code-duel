import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { initSocket } from '../socket';
import { 
  IUserRepository, 
  IFriendRepository, 
  INotificationRepository, 
  IActivityRepository,
  IDuelInviteRepository,
  IProblemRepository,
} from '@/repositories/interfaces';
import { ProgressionService } from '../services/progression-service';
import { RetentionService } from '../services/retention-service';
import { SocketEvents } from '@code-duel/shared';
import { UserRole, PresenceStatus, MatchState, GameMode, ChaosEventType } from '@code-duel/types';
import { roomManager } from '../socket/room-manager';

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
  },
}));

vi.mock('bullmq', () => {
  class Queue {
    add = vi.fn().mockResolvedValue({ id: 'job-id' });
    on = vi.fn();
    close = vi.fn().mockResolvedValue(undefined);
  }
  return { Queue };
});

vi.mock('ioredis', () => {
  class Redis {
    on = vi.fn();
    get = vi.fn().mockResolvedValue(null);
    set = vi.fn().mockResolvedValue('OK');
    del = vi.fn().mockResolvedValue(1);
    hget = vi.fn().mockResolvedValue(null);
    hgetall = vi.fn().mockResolvedValue({});
    hkeys = vi.fn().mockResolvedValue([]);
    hset = vi.fn().mockResolvedValue(1);
    hdel = vi.fn().mockResolvedValue(1);
    sadd = vi.fn().mockResolvedValue(1);
    srem = vi.fn().mockResolvedValue(1);
    scard = vi.fn().mockResolvedValue(0);
    zadd = vi.fn().mockResolvedValue(1);
    zrem = vi.fn().mockResolvedValue(1);
    zrange = vi.fn().mockResolvedValue([]);
    zrank = vi.fn().mockResolvedValue(0);
    zcard = vi.fn().mockResolvedValue(0);
    duplicate = vi.fn().mockReturnThis();
    subscribe = vi.fn().mockResolvedValue(1);
    psubscribe = vi.fn().mockResolvedValue(1);
    publish = vi.fn().mockResolvedValue(1);
    eval = vi.fn().mockResolvedValue(1);
    incr = vi.fn().mockResolvedValue(1);
    expire = vi.fn().mockResolvedValue(1);
    rpush = vi.fn().mockResolvedValue(1);
    quit = vi.fn().mockResolvedValue('OK');
    options = {};
  }
  return { default: Redis, Redis };
});

describe('Networking and Gameplay Safety Tests', () => {
  let httpServer: HttpServer;
  let clientSocket: ClientSocket;
  let port: number;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.USER,
    tokenVersion: 0,
    rating: 1200,
    status: PresenceStatus.ONLINE,
  };

  const mockUserRepository: Partial<IUserRepository> = {
    findById: vi.fn().mockResolvedValue(mockUser),
  };

  const mockProgressionService = {
    updateMatchStats: vi.fn(),
  } as unknown as ProgressionService;

  const mockRetentionService = {
    trackMissionProgress: vi.fn(),
  } as unknown as RetentionService;

  const token = jwt.sign(
    { sub: mockUser.id, role: mockUser.role, version: mockUser.tokenVersion },
    'test-jwt-secret',
  );

  beforeEach(() => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      initSocket(
        httpServer,
        mockUserRepository as IUserRepository,
        mockProgressionService,
        mockRetentionService,
        {
          friendRepository: {} as unknown as IFriendRepository,
          notificationRepository: {} as unknown as INotificationRepository,
          activityRepository: {} as unknown as IActivityRepository,
          duelInviteRepository: {} as unknown as IDuelInviteRepository,
          problemRepository: {} as unknown as IProblemRepository,
        },
      );
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    httpServer.close();
    if (clientSocket) {
      clientSocket.disconnect();
    }
    vi.restoreAllMocks();
  });

  describe('Issue 3.1 - Socket.IO Rate Limiting / Abuse Protection', () => {
    it('should allow events within limits and drop/emit error when rate limit is exceeded', () => {
      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token },
        });

        let errorCount = 0;

        clientSocket.on('connect', () => {
          // Emit RUN_CODE event 5 times in rapid succession (Limit is 2 per 2000ms)
          clientSocket.emit(SocketEvents.RUN_CODE, { code: 'print("hello")' });
          clientSocket.emit(SocketEvents.RUN_CODE, { code: 'print("hello")' });
          clientSocket.emit(SocketEvents.RUN_CODE, { code: 'print("hello")' });
          clientSocket.emit(SocketEvents.RUN_CODE, { code: 'print("hello")' });
          clientSocket.emit(SocketEvents.RUN_CODE, { code: 'print("hello")' });
        });

        clientSocket.on(SocketEvents.ROOM_ERROR, (message) => {
          if (message.includes('Rate limit exceeded')) {
            errorCount++;
            if (errorCount === 3) {
              expect(errorCount).toBe(3);
              resolve();
            }
          }
        });

        setTimeout(() => {
          if (errorCount < 3) {
            reject(new Error('Rate limit was not exceeded or ROOM_ERROR not received'));
          }
        }, 1000);
      });
    });
  });

  describe('Issue 4.1 - Opponent Code View Chaos Event Sanitization', () => {
    it('should reveal target opponent code to the mapped viewer and sanitize code to empty for others', async () => {
      // Mock room with active OPPONENT_CODE_VIEW event
      const mockRoom = {
        id: 'room-1',
        state: MatchState.PLAYING,
        gameMode: GameMode.CHAOS_ARENA,
        players: [
          { id: 'user-1', username: 'testuser', connected: true },
          { id: 'user-2', username: 'opponent', connected: true },
          { id: 'user-3', username: 'spectator', connected: true },
        ],
        currentRound: 1,
        rounds: [
          {
            roundIndex: 1,
            submissions: {
              'user-1': { code: 'my-code', status: 'DRAFT' },
              'user-2': { code: 'opponent-code', status: 'DRAFT' },
              'user-3': { code: 'spec-code', status: 'DRAFT' },
            },
          },
        ],
        chaosEvent: {
          type: ChaosEventType.OPPONENT_CODE_VIEW,
          data: {
            mapping: {
              'user-1': 'user-2', // user-1 is allowed to view user-2
              'user-2': 'user-1', // user-2 is allowed to view user-1
            },
          },
        },
      };

      vi.spyOn(roomManager, 'getRoomByPlayerId').mockResolvedValue(mockRoom as any);
      vi.spyOn(roomManager, 'updatePlayerStatus').mockResolvedValue(mockRoom as any);

      return new Promise<void>((resolve, reject) => {
        clientSocket = Client(`http://localhost:${port}`, {
          auth: { token }, // user-1
        });

        clientSocket.on('connect', () => {
          // Trigger a room update to evaluate emitRoomUpdated logic
          // (initSocket sends updates on reconnect automatically)
        });

        clientSocket.on(SocketEvents.ROOM_UPDATED, (room) => {
          try {
            const round = room.rounds[0];
            // user-1 should be able to view user-2's code
            expect(round.submissions['user-2'].code).toBe('opponent-code');
            // user-1 should NOT be able to view user-3's code (sanitized to '')
            expect(round.submissions['user-3'].code).toBe('');
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });
});
