import { Room, Player, MatchState, User, GameMode, ChaosEventType, MatchRuleSet } from '@code-duel/types';
import { generateRoomCode, normalizeRoomCode } from '@code-duel/shared';
import { logger } from '@/utils/logger';
import { redisCache } from '@/utils/redis-cache';
import { v4 as uuidv4 } from 'uuid';
import { MatchFlowEngine } from '../services/match-flow-engine';
import { playerContainerManager } from '../services/player-container-manager';

export class DistributedRoomManager {
  private nodeId: string = uuidv4();
  private readonly ROOM_PREFIX = 'room:';
  private readonly PLAYER_TO_ROOM_PREFIX = 'player_to_room:';
  private readonly LOCK_PREFIX = 'room_lock:';
  private readonly EPOCH_PREFIX = 'room_epoch:';
  private readonly EVENT_SEQ_PREFIX = 'room_seq:';
  private readonly LOCK_TTL = 10; // seconds
  private matchFlowEngine?: MatchFlowEngine;

  setMatchFlowEngine(matchFlowEngine: MatchFlowEngine) {
    this.matchFlowEngine = matchFlowEngine;
  }

  async createRoom(owner: User, maxPlayers: number = 2, gameMode?: GameMode, options?: any): Promise<Room> {
    const existingRoomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${owner.id}`);
    if (existingRoomId) {
      const oldRoom = await this.getRoom(existingRoomId);
      if (oldRoom) {
        await this.leaveRoom(owner.id).catch(() => {});
      }
      await redisCache.del(`${this.PLAYER_TO_ROOM_PREFIX}${owner.id}`);
    }
    const roomId = normalizeRoomCode(generateRoomCode());
    const now = new Date().toISOString();

    const player: Player = {
      id: owner.id,
      username: owner.username,
      rating: owner.rating,
      isReady: false,
      isOwner: true,
      connected: true,
      lastSeen: now,
      seasonalTier: owner.seasonalTier ?? 'UNRANKED',
    };

    const room: Room = {
      id: roomId,
      ownerId: owner.id,
      state: MatchState.WAITING,
      players: [player],
      maxPlayers,
      gameMode: gameMode || GameMode.MULTI_ROUND,
      createdAt: now,
      updatedAt: now,
      version: 1,
      epoch: 0,
    };

    if (options) {
      if (options.duration) {
        room.roundTimer = { duration: options.duration };
      }
      if (options.categories) {
        room.selectedCategories = options.categories;
      }
      if (options.ruleSet) {
        room.ruleSet = options.ruleSet;
      }
    }

    if (room.gameMode === GameMode.MULTI_ROUND) {
      room.ruleSet = MatchRuleSet.RANKED;
    } else if (room.gameMode === GameMode.CHAOS_ARENA) {
      room.ruleSet = MatchRuleSet.CHAOS;
    } else if (room.gameMode === GameMode.QUICKODE) {
      if (!room.ruleSet) room.ruleSet = MatchRuleSet.RANKED;
      if (!room.roundTimer) room.roundTimer = { duration: 300 };
    }

    await this.saveRoom(room);
    await redisCache.set(`${this.PLAYER_TO_ROOM_PREFIX}${owner.id}`, roomId, 'EX', 60 * 60);

    logger.info({ roomId, ownerId: owner.id, nodeId: this.nodeId }, 'Room created (distributed)');
    return room;
  }

  async joinRoom(rawRoomId: string, user: User): Promise<Room> {
    const roomId = normalizeRoomCode(rawRoomId);
    const existingRoomIdRaw = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${user.id}`);
    const existingRoomId = existingRoomIdRaw ? normalizeRoomCode(existingRoomIdRaw) : undefined;
    
    // Idempotent join if already in the room
    if (existingRoomId === roomId) {
      const room = await this.getRoom(roomId);
      if (!room) throw new Error('ROOM_NOT_FOUND');
      
      // Concurrency/state sync: Ensure user is marked as connected inside room players list
      let updatedRoom = room;
      const player = room.players.find(p => p.id === user.id);
      if (player && !player.connected) {
        const res = await this.updatePlayerStatus(user.id, true);
        if (res) updatedRoom = res;
      }
      return updatedRoom;
    }

    if (existingRoomId) {
      const oldRoom = await this.getRoom(existingRoomId);
      if (oldRoom) {
        await this.leaveRoom(user.id).catch(() => {});
      }
      await redisCache.del(`${this.PLAYER_TO_ROOM_PREFIX}${user.id}`);
    }

    const room = await this.updateRoom(roomId, (r) => {
      // Concurrency-safe check inside the lock mutator:
      const existingPlayer = r.players.find(p => p.id === user.id);
      if (existingPlayer) {
        existingPlayer.connected = true;
        existingPlayer.lastSeen = new Date().toISOString();
        return;
      }

      if (r.state === MatchState.PLAYING) {
        throw new Error('MATCH_ALREADY_IN_PROGRESS');
      }
      if (r.state === MatchState.RESULTS) {
        throw new Error('MATCH_FINISHED');
      }
      if (r.state !== MatchState.WAITING) {
        throw new Error('ROOM_NOT_JOINABLE');
      }

      if (r.players.length >= r.maxPlayers) throw new Error('ROOM_FULL');

      const player: Player = {
        id: user.id,
        username: user.username,
        rating: user.rating,
        isReady: false,
        isOwner: false,
        connected: true,
        lastSeen: new Date().toISOString(),
        seasonalTier: user.seasonalTier ?? 'UNRANKED',
      };

      r.players.push(player);
    });

    await redisCache.set(`${this.PLAYER_TO_ROOM_PREFIX}${user.id}`, roomId, 'EX', 60 * 60);
    return room;
  }

  async toggleReady(userId: string): Promise<Room | null> {
    const roomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
    if (!roomId) return null;

    try {
      const updatedRoom = await this.updateRoom(roomId, (room) => {
        const player = room.players.find((p) => p.id === userId);
        if (player) {
          player.isReady = !player.isReady;
          if (room.state === MatchState.COUNTDOWN && !player.isReady) {
            room.state = MatchState.WAITING;
            room.countdownStartAt = undefined;
          }
        }
      });
      if (updatedRoom) {
        logger.info({
          step: 'ROOM_AFTER_READY',
          roomId: updatedRoom.id,
          ownerId: updatedRoom.ownerId,
          roomState: updatedRoom.state,
          players: updatedRoom.players.map(p => ({
            id: p.id,
            username: p.username,
            isReady: p.isReady,
            connected: p.connected
          })),
          timestamp: new Date().toISOString()
        }, 'Diagnostic: Room state immediately after READY toggle');
      }
      return updatedRoom;
    } catch (e) {
      logger.error({ error: e, userId }, 'Error toggling ready');
      return null;
    }
  }

  async returnToLobby(userId: string): Promise<Room | null> {
    const roomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
    if (!roomId) return null;

    try {
      return await this.updateRoom(roomId, (room) => {
        room.state = MatchState.WAITING;
        room.countdownStartAt = undefined;
        room.matchStartAt = undefined;
        room.players.forEach((p) => {
          p.isReady = false;
        });
        room.currentRound = undefined;
        room.roundResults = undefined;
        room.problemId = undefined;
        room.updatedAt = new Date().toISOString();
      });
    } catch (e) {
      logger.error({ error: e, userId }, 'Error returning to lobby');
      return null;
    }
  }

  async startCountdown(userId: string): Promise<Room | null> {
    const roomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
    if (!roomId) {
      logger.error({ userId }, 'Error starting countdown: No room ID associated with user');
      return null;
    }

    let roomSnapshot: Room | undefined = undefined;
    try {
      roomSnapshot = await this.getRoom(roomId);
      if (roomSnapshot) {
        logger.info({
          step: 'ROOM_LOADED_IN_START_COUNTDOWN',
          roomId: roomSnapshot.id,
          ownerId: roomSnapshot.ownerId,
          roomState: roomSnapshot.state,
          players: roomSnapshot.players.map(p => ({
            id: p.id,
            username: p.username,
            isReady: p.isReady,
            connected: p.connected
          })),
          timestamp: new Date().toISOString()
        }, 'Diagnostic: Room state loaded inside startCountdown');
      }
      return await this.updateRoom(roomId, (room) => {
        if (room.ownerId !== userId || room.state !== MatchState.WAITING) {
          throw new Error('UNAUTHORIZED_OR_INVALID_STATE');
        }
        const nonOwners = room.players.filter((p) => p.id !== room.ownerId);
        const allConnected = nonOwners.every((p) => p.connected);
        if (!allConnected) {
          throw new Error('PLAYERS_NOT_CONNECTED');
        }
        const allReady = nonOwners.every((p) => p.isReady);
        if (!allReady) {
          throw new Error('PLAYERS_NOT_READY');
        }
        if (room.players.length < 2) {
          throw new Error('LOBBY_NOT_FULL');
        }

        room.state = MatchState.COUNTDOWN;
        const countdownDuration = 5000; // 5 seconds
        room.countdownStartAt = new Date(Date.now() + countdownDuration).toISOString();
        room.updatedAt = new Date().toISOString();
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      logger.error({
        errorMessage: err.message,
        errorStack: err.stack,
        errorName: err.name,
        errorObject: JSON.stringify(err),
        roomId,
        ownerId: roomSnapshot?.ownerId,
        currentRoomState: roomSnapshot?.state,
        requesterId: userId,
        players: roomSnapshot?.players?.map(p => ({ id: p.id, username: p.username, connected: p.connected, isReady: p.isReady, isOwner: p.isOwner })),
        gameMode: roomSnapshot?.gameMode,
        countdownStartAt: roomSnapshot?.countdownStartAt,
        roomSnapshotJson: JSON.stringify(roomSnapshot)
      }, 'Error starting countdown - Detailed Diagnostic Log');
      return null;
    }
  }

  async startMatch(roomId: string): Promise<Room | null> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) return null;

      if (room.state === MatchState.COUNTDOWN) {
        // Verify all players are connected before starting
        const allConnected = room.players.every((p) => p.connected);
        if (!allConnected) {
          return await this.updateRoom(roomId, (r) => {
            r.state = MatchState.WAITING;
            r.countdownStartAt = undefined;
          });
        }

        // Initialize persistent containers for each active player
        try {
          for (const player of room.players) {
            await playerContainerManager.createContainerForPlayer(roomId, player.id);
          }
        } catch (err) {
          logger.error({ err, roomId }, 'Container initialization failed for match. Aborting match start.');
          await playerContainerManager.destroyContainersForMatch(roomId).catch(() => {});
          
          return await this.updateRoom(roomId, (r) => {
            r.state = MatchState.WAITING;
            r.countdownStartAt = undefined;
          });
        }

        // Wrap the match flow initialization in a try-catch to guarantee proper container cleanup and room state restoration on failure
        try {
          const updated = await this.updateRoom(roomId, async (r) => {
            if (!this.matchFlowEngine) {
              throw new Error('MatchFlowEngine is not initialized on roomManager');
            }

            await this.matchFlowEngine.initializeMatch(r, r.gameMode || GameMode.MULTI_ROUND, { duration: r.roundTimer?.duration });
            await this.matchFlowEngine.transitionToNextRound(r, []);
          });
          return updated;
        } catch (initErr: any) {
          logger.error({ err: initErr, roomId, stack: initErr?.stack }, 'Match flow initialization failed. Aborting match start.');
          await playerContainerManager.destroyContainersForMatch(roomId).catch(() => {});
          return await this.updateRoom(roomId, (r) => {
            r.state = MatchState.WAITING;
            r.countdownStartAt = undefined;
          });
        }
      }
      return room;
    } catch (e: any) {
      logger.error({ err: e, roomId, stack: e?.stack }, 'Error starting match');
      // Final fallback safety cleanup
      await playerContainerManager.destroyContainersForMatch(roomId).catch(() => {});
      await this.updateRoom(roomId, (r) => {
        r.state = MatchState.WAITING;
        r.countdownStartAt = undefined;
      }).catch(() => {});
      return null;
    }
  }

  async leaveRoom(userId: string): Promise<{ roomId: string; room?: Room } | null> {
    const roomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
    if (!roomId) return null;

    try {
      const room = await this.updateRoom(roomId, (r) => {
        r.players = r.players.filter((p) => p.id !== userId);
        if (r.players.length > 0 && r.ownerId === userId) {
          r.ownerId = r.players[0].id;
          r.players[0].isOwner = true;
        }
        if (r.state === MatchState.COUNTDOWN) {
          r.state = MatchState.WAITING;
          r.countdownStartAt = undefined;
        }
      });

      await redisCache.del(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);

      if (room.players.length === 0) {
        await redisCache.del(`${this.ROOM_PREFIX}${roomId}`);
        await redisCache.del(`${this.LOCK_PREFIX}${roomId}`);
        await redisCache.del(`${this.EPOCH_PREFIX}${roomId}`);
        await redisCache.del(`${this.EVENT_SEQ_PREFIX}${roomId}`);
        logger.info({ roomId }, 'Room deleted (empty, distributed)');

        // Clean up match containers
        await playerContainerManager.destroyContainersForMatch(roomId).catch(() => {});

        return { roomId };
      }

      logger.info({ roomId, userId }, 'Player left room (distributed)');
      return { roomId, room };
    } catch (e) {
      if (e instanceof Error && e.message === 'ROOM_NOT_FOUND') {
        await redisCache.del(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
        return { roomId };
      }
      return null;
    }
  }

  async getRoom(rawRoomId: string): Promise<Room | undefined> {
    const roomId = normalizeRoomCode(rawRoomId);
    const data = await redisCache.get(`${this.ROOM_PREFIX}${roomId}`);
    if (!data) return undefined;
    try {
      const room = JSON.parse(data) as Room;
      
      if (room.powerups) {
        const now = Date.now();
        const active = room.powerups.filter(p => new Date(p.expiresAt).getTime() > now);
        if (active.length !== room.powerups.length) {
          room.powerups = active;
        }
      }
      
      return room;
    } catch (e) {
      logger.error({ error: e, roomId }, 'Failed to parse room data from Redis');
      return undefined;
    }
  }

  async getRoomByPlayerId(userId: string): Promise<Room | undefined> {
    const roomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
    return roomId ? this.getRoom(normalizeRoomCode(roomId)) : undefined;
  }

  async updatePlayerStatus(userId: string, connected: boolean): Promise<Room | null> {
    const roomId = await redisCache.get(`${this.PLAYER_TO_ROOM_PREFIX}${userId}`);
    if (!roomId) return null;

    try {
      return await this.updateRoom(roomId, (room) => {
        const player = room.players.find((p) => p.id === userId);
        if (player) {
          player.connected = connected;
          player.lastSeen = new Date().toISOString();
          
          if (!connected && room.state === MatchState.COUNTDOWN) {
            room.state = MatchState.WAITING;
            room.countdownStartAt = undefined;
            player.isReady = false;
          }
        }
      });
    } catch {
      return null;
    }
  }

  /**
   * Safe, monotonic room save with Fencing Token (epoch) support
   */
  async saveRoom(room: Room, expectedVersion?: number, fencingToken?: number): Promise<boolean> {
    const script = `
      local roomKey = KEYS[1]
      local roomStr = redis.call('get', roomKey)
      
      if roomStr then
        local currentRoom = cjson.decode(roomStr)
        
        -- Version Check (Monotonic State Update)
        local expectedVersion = tonumber(ARGV[1])
        if expectedVersion and expectedVersion > 0 and currentRoom.version ~= expectedVersion then
          return -1 -- Version mismatch
        end
        
        -- Fencing Token Check (Stale Write Prevention)
        local fencingToken = tonumber(ARGV[2])
        if fencingToken and fencingToken > 0 and currentRoom.epoch > fencingToken then
          return -2 -- Fencing token expired
        end
      end
      
      redis.call('set', roomKey, ARGV[3], 'EX', tonumber(ARGV[4]))
      return 1
    `;
    
    // Clean expired powerups before saving to Redis (Issue 2)
    if (room.powerups) {
      const now = Date.now();
      room.powerups = room.powerups.filter(p => new Date(p.expiresAt).getTime() > now);
    }

    // Atomically bump version on save
    const nextVersion = (expectedVersion || room.version || 0) + 1;
    room.version = nextVersion;
    if (fencingToken) room.epoch = fencingToken;
    room.updatedAt = new Date().toISOString();
    
    const result = await redisCache.eval(
      script, 
      1, 
      `${this.ROOM_PREFIX}${room.id}`, 
      expectedVersion || 0,
      fencingToken || 0,
      JSON.stringify(room),
      60 * 60
    );

    if (result === -1) {
      logger.warn({ roomId: room.id, expectedVersion, nodeId: this.nodeId }, 'Stale write rejected: Version mismatch');
      return false;
    }
    if (result === -2) {
      logger.warn({ roomId: room.id, fencingToken, nodeId: this.nodeId }, 'Stale write rejected: Fencing token expired');
      return false;
    }

    return true;
  }

  /**
   * Helper to perform CAS (Compare-And-Swap) updates on a room.
   */
  async updateRoom(rawRoomId: string, mutator: (room: Room) => void | Promise<void>, fencingToken?: number): Promise<Room> {
    const roomId = normalizeRoomCode(rawRoomId);
    const maxRetries = parseInt(process.env.OCC_MAX_RETRIES || '10', 10);
    let retries = maxRetries;
    while(retries-- > 0) {
      const room = await this.getRoom(roomId);
      if (!room) throw new Error('ROOM_NOT_FOUND');
      
      const expectedVersion = room.version || 0;
      await mutator(room);
      
      const success = await this.saveRoom(room, expectedVersion, fencingToken);
      if (success) {
        // Replay-Safe Event Logging Foundation
        const seq = await this.getNextEventSequence(roomId);
        const eventLog = {
          sequenceNumber: seq,
          roomVersion: room.version,
          ownershipToken: room.epoch,
          timestamp: new Date().toISOString(),
          sourceNode: this.nodeId,
          stateSnapshot: room, // Note: For production, store delta/event payload
        };
        // Asynchronously log event (fire and forget for performance)
        redisCache.rpush(`${this.ROOM_PREFIX}events:${roomId}`, JSON.stringify(eventLog))
          .catch(e => logger.error({ error: e, roomId }, 'Failed to log room event'));
        
        return room;
      }

      if (retries > 0) {
        const baseDelay = parseInt(process.env.OCC_BASE_DELAY_MS || '10', 10);
        const attempt = maxRetries - retries;
        const delay = Math.min(1000, baseDelay * Math.pow(2, attempt) + Math.random() * 20);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('CONCURRENT_MODIFICATION_ERROR');
  }

  /**
   * Ownership/Locking mechanism using Fencing Tokens
   * Returns a fencing token (epoch) if lock acquired, null otherwise.
   */
  async acquireLock(roomId: string): Promise<number | null> {
    const script = `
      local lockKey = KEYS[1]
      local epochKey = KEYS[2]
      local nodeId = ARGV[1]
      local ttl = tonumber(ARGV[2])
      
      local currentOwner = redis.call('get', lockKey)
      if currentOwner and currentOwner ~= nodeId then
        return nil
      end
      
      local epoch = redis.call('incr', epochKey)
      redis.call('set', lockKey, nodeId, 'EX', ttl)
      redis.call('expire', epochKey, 60 * 60)
      
      return tonumber(epoch)
    `;
    
    const result = await redisCache.eval(
      script, 
      2, 
      `${this.LOCK_PREFIX}${roomId}`,
      `${this.EPOCH_PREFIX}${roomId}`,
      this.nodeId, 
      this.LOCK_TTL
    );
    
    if (result) {
      logger.debug({ roomId, epoch: result, nodeId: this.nodeId }, 'Acquired fencing token');
    } else {
      logger.debug({ roomId, nodeId: this.nodeId }, 'Failed to acquire fencing token (locked by another node)');
    }

    return result as number | null;
  }

  async releaseLock(roomId: string): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${roomId}`;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redisCache.eval(script, 1, lockKey, this.nodeId);
  }

  async cleanupStaleRooms(): Promise<void> {
    // Relying on Redis TTL.
  }

  async getAllRooms(): Promise<Room[]> {
    const keys = await redisCache.keys(`${this.ROOM_PREFIX}*`);
    const rooms: Room[] = [];
    for (const key of keys) {
      if (
        key.includes(':events:') ||
        key.startsWith(this.LOCK_PREFIX) ||
        key.startsWith(this.EPOCH_PREFIX) ||
        key.startsWith(this.EVENT_SEQ_PREFIX)
      ) {
        continue;
      }
      try {
        const raw = await redisCache.get(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.id && parsed.players) {
            rooms.push(parsed);
          }
        }
      } catch {
        // ignore malformed keys
      }
    }
    return rooms;
  }

  /**
   * Event Sequencing - Atomically increments and returns the next event sequence for a room.
   * Crucial for replay-safe event logging and deterministic ordering.
   */
  async getNextEventSequence(roomId: string): Promise<number> {
    const seqKey = `${this.EVENT_SEQ_PREFIX}${roomId}`;
    const seq = await redisCache.incr(seqKey);
    await redisCache.expire(seqKey, 60 * 60);
    return seq;
  }
}

export const roomManager = new DistributedRoomManager();

export function sanitizeRoomForUser(room: Room, userId: string): Room {
  const sanitizedRoom = JSON.parse(JSON.stringify(room)) as Room;
  
  if (sanitizedRoom.state === MatchState.PLAYING) {
    const roundIndex = sanitizedRoom.currentRound || (sanitizedRoom.rounds && sanitizedRoom.rounds.length > 0 ? sanitizedRoom.rounds[sanitizedRoom.rounds.length - 1].roundIndex : 1);
    const round = sanitizedRoom.rounds?.find(r => r.roundIndex === roundIndex);
    const mySub = round?.submissions?.[userId ?? ''];
    
    let showWaiting = false;
    if (mySub && mySub.submittedAt) {
      showWaiting = true;
    }

    if (showWaiting) {
      sanitizedRoom.state = MatchState.SUBMITTED_WAITING as any;
    }

    if (round && round.submissions) {
      const isOpponentCodeViewActive = sanitizedRoom.chaosEvent?.type === ChaosEventType.OPPONENT_CODE_VIEW;
      const viewMapping = sanitizedRoom.chaosEvent?.data?.mapping;

      for (const uid of Object.keys(round.submissions)) {
        const sub = round.submissions[uid];
        if (uid !== userId) {
          const isAllowedToView = isOpponentCodeViewActive && viewMapping?.[userId] === uid;
          if (!isAllowedToView) {
            sub.code = '';
          }
          
          sub.status = 'PENDING';
          delete sub.score;
          delete sub.executionTimeMs;
          delete sub.memoryBytes;
          delete sub.testResults;
        } else {
          // Sanitize hidden testcase results for the submitting player themselves
          if (sub.testResults) {
            sub.testResults = sub.testResults.map((tr: any) => {
              if (tr.isHidden) {
                return {
                  id: tr.id,
                  testCaseId: tr.testCaseId,
                  isHidden: true,
                  passed: tr.passed,
                  status: tr.status,
                };
              }
              return tr;
            });
          }
        }
      }
    }
  } else if (sanitizedRoom.state === MatchState.RESULTS) {
    if (sanitizedRoom.rounds) {
      for (const r of sanitizedRoom.rounds) {
        if (r.submissions) {
          for (const uid of Object.keys(r.submissions)) {
            const sub = r.submissions[uid];
            if (uid !== userId) {
              delete sub.testResults;
            } else {
              // Sanitize hidden testcase details even in results view
              if (sub.testResults) {
                sub.testResults = sub.testResults.map((tr: any) => {
                  if (tr.isHidden) {
                    return {
                      id: tr.id,
                      testCaseId: tr.testCaseId,
                      isHidden: true,
                      passed: tr.passed,
                      status: tr.status,
                    };
                  }
                  return tr;
                });
              }
            }
          }
        }
      }
    }
  }
  
  return sanitizedRoom;
}

