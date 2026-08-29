export const APP_NAME = 'Code Duel';

export const PROGRESSION = {
  BASE_XP_PER_LEVEL: 100,
  PLACEMENT_MATCHES: 5,
  STREAK_WINS_REQUIRED: 3,
  STREAK_GRACE_REFRESH_DAYS: 7,
} as const;

export const CP_CONFIG = {
  PLACEMENT_MATCHES: 10,
  K_PLACEMENT: 64,
  MAX_MOVEMENT: 50,
  MULTI_ROUND_MULTIPLIER: 1.5,
  QUICKODE_RANKED_MULTIPLIER: 0.75,
  ANTI_FARM_MAX_MATCHES_24H: 5,
} as const;

export const CP_RANKS = [
  { rank: 'Initiate', min: 0, max: 199 },
  { rank: 'Apprentice', min: 200, max: 499 },
  { rank: 'Coder', min: 500, max: 899 },
  { rank: 'Specialist', min: 900, max: 1399 },
  { rank: 'Expert', min: 1400, max: 1999 },
  { rank: 'Elite', min: 2000, max: 2699 },
  { rank: 'Master', min: 2700, max: 3499 },
  { rank: 'Grandmaster', min: 3500, max: 4499 },
  { rank: 'Codebreaker', min: 4500, max: 5999 },
  { rank: 'Apex Coder', min: 6000, max: Infinity },
] as const;

export const calculateCpRank = (cp: number): string => {
  const matched = CP_RANKS.find((r) => cp >= r.min && cp <= r.max);
  return matched ? matched.rank : 'Initiate';
};

export const getCpKFactor = (cp: number, placementMatchesPlayed: number): number => {
  if (placementMatchesPlayed < CP_CONFIG.PLACEMENT_MATCHES) {
    return CP_CONFIG.K_PLACEMENT;
  }
  if (cp >= 4500) return 20;
  if (cp >= 2700) return 24;
  if (cp >= 1400) return 32;
  if (cp >= 500) return 40;
  return 48;
};

export const SEASON_TIERS = [
  'UNRANKED',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'RUBY',
  'DIAMOND'
] as const;

export const RETENTION_XP = {
  DAILY_CHALLENGE: 500,
  DAILY_MISSION: 200,
  STREAK_MAINTAIN: 300,
} as const;

export const TIER_GROUPS = {
  BEGINNER: ['BRONZE', 'SILVER', 'UNRANKED'],
  INTERMEDIATE: ['GOLD', 'PLATINUM'],
  ADVANCED: ['DIAMOND', 'MASTER', 'GRANDMASTER'],
} as const;

export const getTierGroup = (rank: string): string => {
  if (TIER_GROUPS.BEGINNER.includes(rank as typeof TIER_GROUPS.BEGINNER[number])) return 'BEGINNER';
  if (TIER_GROUPS.INTERMEDIATE.includes(rank as typeof TIER_GROUPS.INTERMEDIATE[number])) return 'INTERMEDIATE';
  return 'ADVANCED';
};

export const getXpForLevel = (level: number): number => {
  return level * PROGRESSION.BASE_XP_PER_LEVEL;
};

export const calculateWinRate = (wins: number, matchesPlayed: number): number => {
  if (matchesPlayed === 0) return 0;
  return parseFloat(((wins / matchesPlayed) * 100).toFixed(1));
};

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
  RETURN_TO_LOBBY: 'room:return_to_lobby',
  ROOM_UPDATED: 'room:updated',
  ROOM_ERROR: 'room:error',
  ROOM_MESSAGE: 'room:message',

  // Presence
  PRESENCE_UPDATED: 'presence:updated',

  // Telemetry (Anti-cheat)
  TELEMETRY_SYNC: 'telemetry:sync',
  CHEAT_WARNING: 'cheat:warning',

  // Game Lifecycle
  START_COUNTDOWN: 'game:countdown_start',
  GAME_START: 'game:start',
  SUBMIT_CODE: 'game:submit',
  RUN_CODE: 'game:run_code',
  RUN_CODE_RESULT: 'game:run_code_result',
  JUDGE_RESULT: 'game:judge_result',
  GAME_END: 'game:end',
  
  // Game Modes
  ROUND_STARTED: 'game:round_started',
  ROUND_ENDED: 'game:round_ended',
  POWERUP_ACTIVATED: 'game:powerup_activated',
  USE_POWERUP: 'game:use_powerup',

  // Matchmaking
  JOIN_QUEUE: 'queue:join',
  LEAVE_QUEUE: 'queue:leave',
  QUEUE_STATUS: 'queue:status',
  MATCH_FOUND: 'match:found',
  ACCEPT_MATCH: 'match:accept',

  // Retention Events
  DAILY_STATE_SYNC: 'retention:daily_sync',
  MISSION_UPDATE: 'retention:mission_update',
  CLAIM_MISSION: 'retention:claim_mission',
  LEADERBOARD_UPDATE: 'retention:leaderboard_update',

  // Social Events
  FRIEND_REQUEST_SEND: 'social:friend_request_send',
  FRIEND_REQUEST_RECEIVED: 'social:friend_request_received',
  FRIEND_REQUEST_RESPONSE: 'social:friend_request_response',
  FRIEND_REMOVED: 'social:friend_removed',
  PRESENCE_UPDATE: 'social:presence_update',
  DUEL_INVITE_SEND: 'social:duel_invite_send',
  DUEL_INVITE_RECEIVED: 'social:duel_invite_received',
  DUEL_INVITE_RESPONSE: 'social:duel_invite_response',
  NOTIFICATION_RECEIVED: 'social:notification_received',
  NOTIFICATION_READ: 'social:notification_read',
  ACTIVITY_FEED_UPDATE: 'social:activity_update',
  SOCIAL_INITIAL_SYNC: 'social:initial_sync',
} as const;

export * from './room-code.js';
