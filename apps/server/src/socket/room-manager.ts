import { Room, Player, MatchState, User } from '@code-duel/types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();

  createRoom(owner: User, maxPlayers: number = 2): Room {
    const roomId = uuidv4();
    const now = new Date().toISOString();

    const player: Player = {
      id: owner.id,
      username: owner.username,
      rating: owner.rating,
      isReady: false,
      isOwner: true,
      connected: true,
      lastSeen: now,
    };

    const room: Room = {
      id: roomId,
      ownerId: owner.id,
      state: MatchState.WAITING,
      players: [player],
      maxPlayers,
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(roomId, room);
    this.playerToRoom.set(owner.id, roomId);

    logger.info({ roomId, ownerId: owner.id }, 'Room created');
    return room;
  }

  joinRoom(roomId: string, user: User): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.players.length >= room.maxPlayers) throw new Error('ROOM_FULL');
    if (this.playerToRoom.has(user.id)) throw new Error('ALREADY_IN_A_ROOM');

    const player: Player = {
      id: user.id,
      username: user.username,
      rating: user.rating,
      isReady: false,
      isOwner: false,
      connected: true,
      lastSeen: new Date().toISOString(),
    };

    room.players.push(player);
    room.updatedAt = new Date().toISOString();
    this.playerToRoom.set(user.id, roomId);

    logger.info({ roomId, userId: user.id }, 'Player joined room');
    return room;
  }

  leaveRoom(userId: string): { roomId: string; room?: Room } | null {
    const roomId = this.playerToRoom.get(userId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerToRoom.delete(userId);
      return { roomId };
    }

    room.players = room.players.filter((p) => p.id !== userId);
    this.playerToRoom.delete(userId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      logger.info({ roomId }, 'Room deleted (empty)');
      return { roomId };
    }

    if (room.ownerId === userId) {
      room.ownerId = room.players[0].id;
      room.players[0].isOwner = true;
    }

    room.updatedAt = new Date().toISOString();
    logger.info({ roomId, userId }, 'Player left room');
    return { roomId, room };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(userId: string): Room | undefined {
    const roomId = this.playerToRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  updatePlayerStatus(userId: string, connected: boolean): Room | null {
    const room = this.getRoomByPlayerId(userId);
    if (!room) return null;

    const player = room.players.find((p) => p.id === userId);
    if (player) {
      player.connected = connected;
      player.lastSeen = new Date().toISOString();
      room.updatedAt = new Date().toISOString();
    }

    return room;
  }

  cleanupStaleRooms(timeoutMs: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      const updatedAt = new Date(room.updatedAt).getTime();
      if (now - updatedAt > timeoutMs) {
        logger.info({ roomId }, 'Cleaning up stale room');
        room.players.forEach((p) => this.playerToRoom.delete(p.id));
        this.rooms.delete(roomId);
      }
    }
  }
}

export const roomManager = new RoomManager();
