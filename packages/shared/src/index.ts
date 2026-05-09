export const APP_NAME = 'Code Duel';

export const SocketEvents = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // System
  PING_SYNC: 'ping_sync',
  PONG_SYNC: 'pong_sync',

  // Room Management
  CREATE_ROOM: 'room:create',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_UPDATED: 'room:updated',
  ROOM_ERROR: 'room:error',

  // Presence
  PRESENCE_UPDATED: 'presence:updated',

  // Game Lifecycle (Placeholders for state transitions)
  START_COUNTDOWN: 'game:countdown_start',
  GAME_START: 'game:start',
  GAME_END: 'game:end',
} as const;
