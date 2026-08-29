import { describe, it, expect, beforeEach, vi } from 'vitest';
import { roomManager } from '../socket/room-manager';
import { redisCache } from '../utils/redis-cache';
import { User, GameMode } from '@code-duel/types';

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
  },
}));

describe('Room Joining Concurrency and Idempotency Tests', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();

    // Mock Redis Cache with a real in-memory store for high-fidelity behavior
    vi.spyOn(redisCache, 'get').mockImplementation(async (key) => store.get(String(key)) || null);
    vi.spyOn(redisCache, 'set').mockImplementation(async (key, val) => {
      store.set(String(key), String(val));
      return 'OK';
    });
    vi.spyOn(redisCache, 'del').mockImplementation(async (key) => {
      const existed = store.has(String(key));
      store.delete(String(key));
      return existed ? 1 : 0;
    });
    vi.spyOn(redisCache, 'incr').mockImplementation(async (key) => {
      const val = parseInt(store.get(String(key)) || '0', 10) + 1;
      store.set(String(key), String(val));
      return val;
    });
    vi.spyOn(redisCache, 'expire').mockResolvedValue(1);
    vi.spyOn(redisCache, 'rpush').mockResolvedValue(1);
    vi.spyOn(redisCache, 'eval').mockImplementation(async (script, _numKeys, ...args) => {
      // Mock Lua script for saveRoom / acquireLock / releaseLock
      const scriptStr = String(script);
      
      if (scriptStr.includes('cjson.decode')) {
        // saveRoom script:
        // eval(script, 1, roomKey, expectedVersion, fencingToken, roomJson, ttl)
        const roomKey = args[0] as string;
        const expectedVersion = Number(args[1]);
        const roomJson = args[3] as string;

        const existingRaw = store.get(roomKey);
        if (existingRaw) {
          const currentRoom = JSON.parse(existingRaw);
          if (expectedVersion > 0 && currentRoom.version !== expectedVersion) {
            return -1; // Version mismatch
          }
        }
        
        if (roomKey && roomJson) {
          store.set(roomKey, roomJson);
        }
        return 1;
      }
      
      if (scriptStr.includes('currentOwner')) {
        // acquireLock script:
        // eval(script, 2, lockKey, epochKey, nodeId, ttl)
        const epochKey = args[1] as string;
        const epoch = parseInt(store.get(epochKey) || '0', 10) + 1;
        store.set(epochKey, String(epoch));
        return epoch;
      }
      
      if (scriptStr.includes('releaseLock')) {
        return 1;
      }

      return 1;
    });
  });

  const createMockUser = (id: string, username: string): User => ({
    id,
    username,
    email: `${username}@example.com`,
    role: 'USER' as any,
    tokenVersion: 0,
    rating: 1200,
    status: 'ONLINE' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  it('1. Single user joins once -> exactly one membership', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    const room = await roomManager.createRoom(hostUser, 5, GameMode.MULTI_ROUND);

    const guestUser = createMockUser('guest-1', 'guestUser');
    const updatedRoom = await roomManager.joinRoom(room.id, guestUser);

    expect(updatedRoom.players.length).toBe(2);
    expect(updatedRoom.players.some(p => p.id === 'guest-1')).toBe(true);
  });

  it('2. Same user sends room:join twice sequentially -> exactly one membership', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    const room = await roomManager.createRoom(hostUser, 5, GameMode.MULTI_ROUND);

    const guestUser = createMockUser('guest-1', 'guestUser');
    
    // First Join
    await roomManager.joinRoom(room.id, guestUser);
    
    // Second Join
    const finalRoom = await roomManager.joinRoom(room.id, guestUser);

    expect(finalRoom.players.length).toBe(2);
    expect(finalRoom.players.filter(p => p.id === 'guest-1').length).toBe(1);
  });

  it('3. Same user sends 10 simultaneous join requests -> exactly one membership', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    const room = await roomManager.createRoom(hostUser, 5, GameMode.MULTI_ROUND);

    const guestUser = createMockUser('guest-1', 'guestUser');

    // Run 10 simultaneous join requests
    const joinPromises = Array.from({ length: 10 }).map(() =>
      roomManager.joinRoom(room.id, guestUser)
    );

    const results = await Promise.all(joinPromises);
    const finalRoom = results[results.length - 1];

    expect(finalRoom.players.length).toBe(2);
    expect(finalRoom.players.filter(p => p.id === 'guest-1').length).toBe(1);
  });

  it('6. Socket reconnect -> existing membership restored, not duplicated', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    const room = await roomManager.createRoom(hostUser, 5, GameMode.MULTI_ROUND);

    const guestUser = createMockUser('guest-1', 'guestUser');
    
    // Initial join
    let updatedRoom = await roomManager.joinRoom(room.id, guestUser);
    expect(updatedRoom.players.find(p => p.id === 'guest-1')?.connected).toBe(true);

    // Simulate disconnect status change
    await roomManager.updatePlayerStatus('guest-1', false);
    
    const intermediateRoom = await roomManager.getRoom(room.id);
    expect(intermediateRoom?.players.find(p => p.id === 'guest-1')?.connected).toBe(false);

    // Rejoin (reconnect)
    const finalRoom = await roomManager.joinRoom(room.id, guestUser);
    
    expect(finalRoom.players.length).toBe(2);
    expect(finalRoom.players.find(p => p.id === 'guest-1')?.connected).toBe(true);
  });

  it('7. Two different users join simultaneously -> both join once if capacity allows', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    const room = await roomManager.createRoom(hostUser, 5, GameMode.MULTI_ROUND);

    const user2 = createMockUser('user-2', 'user2');
    const user3 = createMockUser('user-3', 'user3');

    await Promise.all([
      roomManager.joinRoom(room.id, user2),
      roomManager.joinRoom(room.id, user3),
    ]);

    const finalRoom = await roomManager.getRoom(room.id);
    expect(finalRoom?.players.length).toBe(3);
    expect(finalRoom?.players.some(p => p.id === 'user-2')).toBe(true);
    expect(finalRoom?.players.some(p => p.id === 'user-3')).toBe(true);
  });

  it('8. Multiple users race for final room slot -> capacity is NEVER exceeded', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    // Max players is 2
    const room = await roomManager.createRoom(hostUser, 2, GameMode.MULTI_ROUND);

    const user2 = createMockUser('user-2', 'user2');
    const user3 = createMockUser('user-3', 'user3');
    const user4 = createMockUser('user-4', 'user4');

    // 3 users racing for the 1 remaining slot
    const joinAttempts = await Promise.allSettled([
      roomManager.joinRoom(room.id, user2),
      roomManager.joinRoom(room.id, user3),
      roomManager.joinRoom(room.id, user4),
    ]);

    const successes = joinAttempts.filter(r => r.status === 'fulfilled');
    const failures = joinAttempts.filter(r => r.status === 'rejected');

    const finalRoom = await roomManager.getRoom(room.id);

    expect(finalRoom?.players.length).toBe(2); // Host + exactly 1 successful guest
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);
  });

  it('10. 50 concurrent unique users against a sufficiently sized test room -> each successful user appears exactly once', async () => {
    const hostUser = createMockUser('host-1', 'hostUser');
    const room = await roomManager.createRoom(hostUser, 100, GameMode.MULTI_ROUND);

    const users = Array.from({ length: 50 }).map((_, i) =>
      createMockUser(`user-${i}`, `user-${i}`)
    );

    await Promise.all(
      users.map(user => roomManager.joinRoom(room.id, user))
    );

    const finalRoom = await roomManager.getRoom(room.id);
    expect(finalRoom?.players.length).toBe(51); // Host + 50 players

    const playerIds = finalRoom?.players.map(p => p.id) || [];
    const uniquePlayerIds = new Set(playerIds);
    expect(uniquePlayerIds.size).toBe(51);
  });

  it('11. Join new room when already in a non-playing room -> leaves old room, joins new room', async () => {
    const hostUser1 = createMockUser('host-1', 'hostUser1');
    const room1 = await roomManager.createRoom(hostUser1, 5, GameMode.MULTI_ROUND);

    const hostUser2 = createMockUser('host-2', 'hostUser2');
    const room2 = await roomManager.createRoom(hostUser2, 5, GameMode.MULTI_ROUND);

    const guestUser = createMockUser('guest-1', 'guestUser');
    
    // Join room 1
    await roomManager.joinRoom(room1.id, guestUser);
    const room1After = await roomManager.getRoom(room1.id);
    expect(room1After?.players.some(p => p.id === 'guest-1')).toBe(true);

    // Join room 2 (should automatically leave room 1)
    await roomManager.joinRoom(room2.id, guestUser);
    
    const room1Final = await roomManager.getRoom(room1.id);
    const room2Final = await roomManager.getRoom(room2.id);

    expect(room1Final?.players.some(p => p.id === 'guest-1')).toBe(false);
    expect(room2Final?.players.some(p => p.id === 'guest-1')).toBe(true);
  });
});
