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
  TOGGLE_READY: 'room:toggle_ready',
  ROOM_UPDATED: 'room:updated',
  ROOM_ERROR: 'room:error',

  // Presence
  PRESENCE_UPDATED: 'presence:updated',

  // Telemetry (Anti-cheat)
  TELEMETRY_SYNC: 'telemetry:sync',
  CHEAT_WARNING: 'cheat:warning',

  // Game Lifecycle
  START_COUNTDOWN: 'game:countdown_start',
  GAME_START: 'game:start',
  SUBMIT_CODE: 'game:submit',
  JUDGE_RESULT: 'game:judge_result',
  GAME_END: 'game:end',

  // Matchmaking
  JOIN_QUEUE: 'queue:join',
  LEAVE_QUEUE: 'queue:leave',
  QUEUE_STATUS: 'queue:status',
  MATCH_FOUND: 'match:found',
  ACCEPT_MATCH: 'match:accept',
} as const;
