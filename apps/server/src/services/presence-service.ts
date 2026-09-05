import { Server } from 'socket.io';
import { PresenceStatus, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '@code-duel/types';
import { logger } from '@/utils/logger';
import { redisCache } from '@/utils/redis-cache';

export class PresenceService {
  private readonly STATUS_KEY = 'presence:status';
  private readonly SOCKET_TO_USER_KEY = 'presence:socket_to_user';
  private readonly USER_SOCKETS_PREFIX = 'presence:user_sockets:';

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {}

  async setUserStatus(userId: string, socketId: string, status: PresenceStatus) {
    await redisCache.hset(this.SOCKET_TO_USER_KEY, socketId, userId);
    await redisCache.sadd(`${this.USER_SOCKETS_PREFIX}${userId}`, socketId);
    await redisCache.hset(this.STATUS_KEY, userId, status);
    this.broadcastPresence(userId, status);
  }

  async handleDisconnect(socketId: string) {
    const userId = await redisCache.hget(this.SOCKET_TO_USER_KEY, socketId);
    if (!userId) return;

    await redisCache.hdel(this.SOCKET_TO_USER_KEY, socketId);
    await redisCache.srem(`${this.USER_SOCKETS_PREFIX}${userId}`, socketId);

    const socketsCount = await redisCache.scard(`${this.USER_SOCKETS_PREFIX}${userId}`);
    if (socketsCount === 0) {
      await redisCache.hdel(this.STATUS_KEY, userId);
      this.broadcastPresence(userId, PresenceStatus.OFFLINE);
      logger.info({ userId }, 'User went offline (distributed)');
    }
  }

  async getStatus(userId: string): Promise<PresenceStatus> {
    const status = await redisCache.hget(this.STATUS_KEY, userId);
    return (status as PresenceStatus) || PresenceStatus.OFFLINE;
  }

  private broadcastPresence(userId: string, status: PresenceStatus) {
    // Socket.io Redis adapter will broadcast this to all nodes
    this.io.emit('social:presence_update', { userId, status });
    this.io.emit('presence:updated' as any, { userId, status });
  }

  async getAllOnlineUsers(): Promise<string[]> {
    return redisCache.hkeys(this.STATUS_KEY);
  }

  async getActiveSocketsCount(userId: string): Promise<number> {
    return redisCache.scard(`${this.USER_SOCKETS_PREFIX}${userId}`);
  }
}
