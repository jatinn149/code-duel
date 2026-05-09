import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { IUserRepository } from '@/repositories/interfaces';
import { JWTPayload } from '@/middleware/auth-middleware';
import { SocketEvents } from '@code-duel/shared';
import { roomManager } from './room-manager';
import { createRoomSchema, joinRoomSchema, pingSyncSchema } from '@code-duel/validation';

export const initSocket = (server: HttpServer, userRepository: IUserRepository) => {
  const io = new Server(server, {
    cors: {
      origin: env.NODE_ENV === 'development' ? true : ['your-production-domain.com'],
      credentials: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // Auth Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('AUTHENTICATION_REQUIRED'));
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      const user = await userRepository.findById(payload.sub);

      if (!user || user.tokenVersion !== payload.version) {
        return next(new Error('SESSION_EXPIRED'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      logger.error({ error }, 'Socket auth error');
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on(SocketEvents.CONNECTION, (socket: Socket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, 'User connected to socket');

    // Sync presence
    io.emit(SocketEvents.PRESENCE_UPDATED, { userId: user.id, status: 'ONLINE' });

    // Handle Reconnect
    const existingRoom = roomManager.getRoomByPlayerId(user.id);
    if (existingRoom) {
      socket.join(existingRoom.id);
      roomManager.updatePlayerStatus(user.id, true);
      io.to(existingRoom.id).emit(SocketEvents.ROOM_UPDATED, existingRoom);
    }

    // Ping/Pong Sync
    socket.on(SocketEvents.PING_SYNC, (data) => {
      try {
        const parsed = pingSyncSchema.parse(data);
        socket.emit(SocketEvents.PONG_SYNC, {
          clientTime: parsed.clientTime,
          serverTime: new Date().toISOString(),
        });
      } catch {
        // Ignore validation errors for system events
      }
    });

    // Create Room
    socket.on(SocketEvents.CREATE_ROOM, (data) => {
      try {
        const parsed = createRoomSchema.parse(data);
        const room = roomManager.createRoom(user, parsed.maxPlayers);
        socket.join(room.id);
        socket.emit(SocketEvents.ROOM_UPDATED, room);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create room';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Join Room
    socket.on(SocketEvents.JOIN_ROOM, (data) => {
      try {
        const parsed = joinRoomSchema.parse(data);
        const room = roomManager.joinRoom(parsed.roomId, user);
        socket.join(room.id);
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to join room';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Leave Room
    socket.on(SocketEvents.LEAVE_ROOM, () => {
      const result = roomManager.leaveRoom(user.id);
      if (result) {
        socket.leave(result.roomId);
        if (result.room) {
          io.to(result.roomId).emit(SocketEvents.ROOM_UPDATED, result.room);
        }
      }
    });

    // Disconnect
    socket.on(SocketEvents.DISCONNECT, (reason) => {
      logger.info({ userId: user.id, reason }, 'User disconnected from socket');

      const room = roomManager.updatePlayerStatus(user.id, false);
      if (room) {
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
      }

      // Sync presence
      io.emit(SocketEvents.PRESENCE_UPDATED, { userId: user.id, status: 'OFFLINE' });
    });
  });

  // Room Cleanup Interval
  setInterval(
    () => {
      roomManager.cleanupStaleRooms();
    },
    5 * 60 * 1000,
  );

  return io;
};
