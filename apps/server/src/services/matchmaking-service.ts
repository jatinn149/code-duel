import { QueueEntry, MatchmakingMatch, User } from '@code-duel/types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { redisCache } from '@/utils/redis-cache';

export class MatchmakingService {
  private readonly QUEUE_KEY = 'matchmaking:queue';
  private readonly PLAYER_META_KEY = 'matchmaking:player_meta';
  private readonly ACTIVE_MATCHES_KEY = 'matchmaking:active_matches';
  private readonly USER_TO_MATCH_KEY = 'matchmaking:user_to_match';
  private readonly LOOP_LOCK_KEY = 'matchmaking:loop_lock';

  async joinQueue(user: User, socketId: string): Promise<QueueEntry> {
    // Prevent duplicate queue entries
    await this.leaveQueue(user.id);

    const joinedAt = new Date().toISOString();
    const entry: QueueEntry = {
      userId: user.id,
      socketId,
      rating: user.rating,
      joinedAt,
      searchRange: 100,
    };

    // Add to sorted set with timestamp as score
    await redisCache.zadd(this.QUEUE_KEY, Date.now(), user.id);
    await redisCache.hset(this.PLAYER_META_KEY, user.id, JSON.stringify(entry));

    logger.info({ userId: user.id, rating: user.rating }, 'User joined matchmaking queue (distributed)');
    return entry;
  }

  async leaveQueue(userId: string): Promise<void> {
    await redisCache.zrem(this.QUEUE_KEY, userId);
    await redisCache.hdel(this.PLAYER_META_KEY, userId);
  }

  async getQueueStatus(userId: string): Promise<{ position: number; total: number } | null> {
    const rank = await redisCache.zrank(this.QUEUE_KEY, userId);
    if (rank === null) return null;
    
    const total = await redisCache.zcard(this.QUEUE_KEY);
    return { position: rank + 1, total };
  }

  /**
   * Main matchmaking loop logic
   * Should be called periodically by one node (locked)
   */
  async findMatches(): Promise<{ players: { userId: string; socketId: string }[]; matchId: string }[]> {
    // Distributed Lock to ensure only one node runs the matchmaking loop
    const lock = await redisCache.set(this.LOOP_LOCK_KEY, 'locked', 'EX', 10, 'NX');
    if (!lock) return [];

    try {
      const foundMatches: { players: { userId: string; socketId: string }[]; matchId: string }[] = [];
      
      // Get all players in queue
      const userIds = await redisCache.zrange(this.QUEUE_KEY, 0, -1);
      if (userIds.length < 2) return [];

      const playerMetasRaw = await redisCache.hmget(this.PLAYER_META_KEY, ...userIds);
      const players: QueueEntry[] = playerMetasRaw
        .filter((p): p is string => p !== null)
        .map(p => JSON.parse(p));

      const matchedUserIds = new Set<string>();

      for (let i = 0; i < players.length; i++) {
        const playerA = players[i];
        if (matchedUserIds.has(playerA.userId)) continue;

        for (let j = i + 1; j < players.length; j++) {
          const playerB = players[j];
          if (matchedUserIds.has(playerB.userId)) continue;

          const ratingDiff = Math.abs(playerA.rating - playerB.rating);
          const maxRange = Math.max(playerA.searchRange, playerB.searchRange);

          if (ratingDiff <= maxRange) {
            // Match Found!
            const matchId = uuidv4();
            const match: MatchmakingMatch = {
              matchId,
              players: [
                { userId: playerA.userId, socketId: playerA.socketId, rating: playerA.rating },
                { userId: playerB.userId, socketId: playerB.socketId, rating: playerB.rating },
              ],
              expiresAt: new Date(Date.now() + 30000).toISOString(),
              acceptedPlayers: [],
            };

            await redisCache.hset(this.ACTIVE_MATCHES_KEY, matchId, JSON.stringify(match));
            await redisCache.hset(this.USER_TO_MATCH_KEY, playerA.userId, matchId);
            await redisCache.hset(this.USER_TO_MATCH_KEY, playerB.userId, matchId);

            matchedUserIds.add(playerA.userId);
            matchedUserIds.add(playerB.userId);

            foundMatches.push({
              matchId,
              players: match.players.map((p) => ({ userId: p.userId, socketId: p.socketId })),
            });

            logger.info({ matchId, playerA: playerA.userId, playerB: playerB.userId }, 'Match found (distributed)');
            break;
          }
        }
      }

      // Cleanup matched players from Redis
      if (matchedUserIds.size > 0) {
        const ids = Array.from(matchedUserIds);
        await redisCache.zrem(this.QUEUE_KEY, ...ids);
        await redisCache.hdel(this.PLAYER_META_KEY, ...ids);
      }

      // Update search range for remaining players
      const remainingUserIds = userIds.filter(id => !matchedUserIds.has(id));
      if (remainingUserIds.length > 0) {
         // This is a bit inefficient but for small-medium scale it works.
         // A better way would be a Lua script or batch update.
         for (const id of remainingUserIds) {
            const metaRaw = await redisCache.hget(this.PLAYER_META_KEY, id);
            if (metaRaw) {
               const meta = JSON.parse(metaRaw) as QueueEntry;
               meta.searchRange += 20;
               await redisCache.hset(this.PLAYER_META_KEY, id, JSON.stringify(meta));
            }
         }
      }

      return foundMatches;
    } catch (error) {
      logger.error({ error }, 'Error in matchmaking loop');
      return [];
    } finally {
      await redisCache.del(this.LOOP_LOCK_KEY);
    }
  }

  async acceptMatch(userId: string, matchId: string): Promise<{ ready: boolean; players: { userId: string; socketId: string }[] } | null> {
    const matchRaw = await redisCache.hget(this.ACTIVE_MATCHES_KEY, matchId);
    if (!matchRaw) return null;

    const match = JSON.parse(matchRaw) as MatchmakingMatch;

    const acceptedKey = `matchmaking:match_accepted:${matchId}`;
    const tx = redisCache.multi();
    tx.sadd(acceptedKey, userId);
    tx.scard(acceptedKey);
    tx.expire(acceptedKey, 60);

    const txResults = await tx.exec();
    if (!txResults) return null;

    const totalCount = txResults[1][1] as number;
    const ready = totalCount === match.players.length;

    if (ready) {
      // Cleanup match tracking
      for (const p of match.players) {
        await redisCache.hdel(this.USER_TO_MATCH_KEY, p.userId);
      }
      await redisCache.hdel(this.ACTIVE_MATCHES_KEY, matchId);
      await redisCache.del(acceptedKey);
    }

    return { ready, players: match.players.map((p) => ({ userId: p.userId, socketId: p.socketId })) };
  }

  async handleDisconnect(userId: string): Promise<void> {
    await this.leaveQueue(userId);
    const matchId = await redisCache.hget(this.USER_TO_MATCH_KEY, userId);
    if (matchId) {
      const matchRaw = await redisCache.hget(this.ACTIVE_MATCHES_KEY, matchId);
      if (matchRaw) {
        const match = JSON.parse(matchRaw) as MatchmakingMatch;
        for (const p of match.players) {
          await redisCache.hdel(this.USER_TO_MATCH_KEY, p.userId);
        }
      }
      await redisCache.hdel(this.ACTIVE_MATCHES_KEY, matchId);
    }
  }

  async cleanupStaleMatches(): Promise<void> {
    const now = Date.now();
    const allMatches = await redisCache.hgetall(this.ACTIVE_MATCHES_KEY);
    
    for (const [matchId, matchRaw] of Object.entries(allMatches)) {
      const match = JSON.parse(matchRaw) as MatchmakingMatch;
      if (new Date(match.expiresAt).getTime() < now) {
        logger.info({ matchId }, 'Cleaning up expired match (distributed)');
        for (const p of match.players) {
          await redisCache.hdel(this.USER_TO_MATCH_KEY, p.userId);
        }
        await redisCache.hdel(this.ACTIVE_MATCHES_KEY, matchId);
      }
    }
  }
}

export const matchmakingService = new MatchmakingService();
