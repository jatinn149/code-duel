export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  IN_GAME = 'IN_GAME',
  IN_QUEUE = 'IN_QUEUE',
  PRACTICING = 'PRACTICING',
}

export enum FriendRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface Friendship {
  id: string;
  userIds: [string, string];
  createdAt: string;
}

export interface DuelInvite {
  id: string;
  fromUserId: string;
  toUserId: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

export enum NotificationType {
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
  DUEL_INVITE = 'DUEL_INVITE',
  INVITE_ACCEPTED = 'INVITE_ACCEPTED',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  STREAK_REMINDER = 'STREAK_REMINDER',
  CHALLENGE_RESET = 'CHALLENGE_RESET',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  username: string;
  type: 'RANK_UP' | 'STREAK_MILESTONE' | 'CHALLENGE_COMPLETED' | 'DUEL_VICTORY';
  message: string;
  createdAt: string;
}

export enum Rank {
  INITIATE = 'Initiate',
  APPRENTICE = 'Apprentice',
  CODER = 'Coder',
  SPECIALIST = 'Specialist',
  EXPERT = 'Expert',
  ELITE = 'Elite',
  MASTER = 'Master',
  GRANDMASTER = 'Grandmaster',
  CODEBREAKER = 'Codebreaker',
  APEX_CODER = 'Apex Coder',
  UNRANKED = 'Initiate',
}

export interface ProblemHistoryEntry {
  problemId: string;
  familyId?: string;
  modePlayed: import('./game-modes.js').GameMode;
  solvedAt: string;
  result: 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR';
  attempts: number;
  completionSpeedMs?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  playerId: string;
  passwordHash: string;
  role: UserRole;
  tokenVersion: number;
  matchesPlayed: number;
  matchesWon: number; // For backward compatibility
  rating: number;
  xp: number;
  level: number;
  rank: Rank;
  wins: number;
  losses: number;
  streak: number;
  highestStreak: number;
  highestRating: number;
  dailyChallengeWins: number;
  dailyChallengeBestRank: number;
  placementMatchesPlayed: number;
  seasonalTier: string;
  
  // Phase 3: Retention
  dailyWins: number;
  lastDailyWinAt?: string;
  streakGraceAvailable: number;
  lastStreakResetAt?: string;
  lastDailyResetAt?: string;
  
  // Phase 1: Problem History
  solvedProblemHistory?: ProblemHistoryEntry[];
  playedQuestionFamilies?: string[];
  recentQuestionHistory?: string[];
  
  status: PresenceStatus;
  createdAt: string;
  updatedAt: string;
}

export enum TierGroup {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD
  tierGroup: TierGroup;
  problemId: string;
  expiresAt: string;
}

export enum MissionType {
  WIN_DUELS = 'WIN_DUELS',
  PLAY_MATCHES = 'PLAY_MATCHES',
  COMPLETE_CHALLENGE = 'COMPLETE_CHALLENGE',
  PRACTICE_SOLVE = 'PRACTICE_SOLVE',
  PERFECT_SOLVE = 'PERFECT_SOLVE',
}

export interface DailyMission {
  id: string;
  userId: string;
  type: MissionType;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
  claimed: boolean;
  resetAt: string;
}

export interface DailyLeaderboardEntry {
  userId: string;
  username: string;
  tierGroup: TierGroup;
  solveTimeMs: number;
  submittedAt: string;
  rank: number;
}

export interface StreakStats {
  currentStreak: number;
  highestStreak: number;
  dailyWins: number;
  graceUsedToday: boolean;
  canClaimStreakBonus: boolean;
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
}

export enum MatchState {
  WAITING = 'WAITING',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  SUBMITTED_WAITING = 'SUBMITTED_WAITING',
  JUDGING = 'JUDGING',
  RESULTS = 'RESULTS',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  ROUND_INITIALIZING = 'ROUND_INITIALIZING',
}

export interface Player {
  id: string;
  username: string;
  rating: number;
  isReady: boolean;
  isOwner: boolean;
  connected: boolean;
  lastSeen: string;
  seasonalTier?: string;
  avatarUrl?: string;
}

export * from './game-modes.js';

export interface Room {
  id: string;
  ownerId: string;
  state: MatchState;
  players: Player[];
  maxPlayers: number;
  problemId?: string;
  matchStartAt?: string;
  countdownStartAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Distributed Consistency Properties
  version: number;
  epoch: number;
  
  // New properties for game modes
  gameMode?: import('./game-modes.js').GameMode;
  matchFormat?: import('./game-modes.js').MatchFormat;
  ruleSet?: import('./game-modes.js').MatchRuleSet;
  rounds?: import('./game-modes.js').Round[];
  currentRound?: number;
  totalRounds?: number;
  roundResults?: import('./game-modes.js').RoundResult[];
  roundTimer?: import('./game-modes.js').RoundTimer;
  powerupsEnabled?: boolean;
  powerups?: import('./game-modes.js').PowerupState[];
  selectedCategories?: string[];
  matchResult?: MatchResult;
  summaryEndsAt?: string;
  initializationEndsAt?: string;
  chaosEvent?: import('./game-modes.js').ChaosEventState;
  chaosHistory?: import('./game-modes.js').ChaosEventState[];
}

export interface ServerTimeResponse {
  serverTime: string;
  latency: number;
}

export interface KeystrokeTelemetry {
  type: 'keystroke';
  timestamp: string;
}

export interface PasteTelemetry {
  type: 'paste';
  timestamp: string;
  data: { length: number };
}

export interface TabSwitchTelemetry {
  type: 'tab_switch';
  timestamp: string;
}

export interface FocusLossTelemetry {
  type: 'focus_loss';
  timestamp: string;
}

export type TelemetryEvent =
  | KeystrokeTelemetry
  | PasteTelemetry
  | TabSwitchTelemetry
  | FocusLossTelemetry;

export interface MatchTelemetry {
  roomId: string;
  userId: string;
  events: TelemetryEvent[];
  totalKeystrokes: number;
  totalPastedChars: number;
  tabSwitches: number;
}

export interface MatchSummary {
  roomId: string;
  winnerId?: string;
  durationMs: number;
  mode?: string;
  results: {
    userId: string;
    username: string;
    score: number;
    ratingChange: number;
    newRating: number;
    status: 'completed' | 'disconnected' | 'disqualified';
    xpGain?: number;
    newLevel?: number;
    newXp?: number;
    newRank?: string;
    newStreak?: number;
    placementMatchesPlayed?: number;
    seasonalTier?: string;
  }[];
  endedAt: string;
}

export interface QueueEntry {
  userId: string;
  socketId: string;
  rating: number;
  joinedAt: string;
  searchRange: number;
}

export interface MatchmakingMatch {
  matchId: string;
  players: { userId: string; socketId: string; rating: number }[];
  expiresAt: string;
  acceptedPlayers: string[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  rating: number;
  matchesWon: number;
  matchesPlayed: number;
  rank: number;
}

export enum ExecutionVerdict {
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export enum ExecutionState {
  QUEUED = 'QUEUED',
  COMPILING = 'COMPILING',
  RUNNING_PRETESTS = 'RUNNING_PRETESTS',
  RUNNING_HIDDEN = 'RUNNING_HIDDEN',
  FINISHED = 'FINISHED',
}

export interface SubmissionPayload {
  submissionId: string;
  roomId: string;
  userId: string;
  language: 'python' | 'javascript' | 'cpp';
  code: string;
  mode: import('./game-modes.js').GameMode;
  problemId?: string;
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface ExecutionEventPayload {
  submissionId: string;
  roomId: string;
  userId: string;
  state: ExecutionState;
  verdict?: ExecutionVerdict;
  progress?: {
    passed: number;
    total: number;
  };
  results?: TestCaseResult[];
  error?: string;
  executionTimeMs?: number;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
}

export interface JudgeRequest {
  submissionId: string;
  language: 'python';
  code: string;
  testCases: TestCase[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface TestCaseResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'error' | 'timeout' | 'memory_limit';
  actualOutput?: string;
  error?: string;
  executionTimeMs: number;
  memoryUsageMb: number;
}

export interface JudgeResult {
  submissionId: string;
  overallStatus: 'passed' | 'failed' | 'error' | 'timeout';
  totalScore: number;
  maxScore: number;
  testResults: TestCaseResult[];
}

export interface ServerToClientEvents {
  'room:updated': (room: Room) => void;
  'room:error': (message: string) => void;
  'presence:updated': (data: { userId: string; status: string }) => void;
  'cheat:warning': (message: string) => void;
  'game:end': (data: { winnerId: string; summary?: MatchSummary; forfeit?: boolean; message?: string }) => void;
  'queue:status': (status: { position: number; total: number } | null) => void;
  'match:found': (data: { matchId: string }) => void;
  pong_sync: (data: { clientTime: string; serverTime: string }) => void;
  'game:countdown_start': () => void;
  'game:start': () => void;
  
  // Game Mode Events
  'game:round_started': (data: { round: import('./game-modes.js').Round }) => void;
  'game:round_ended': (data: { roundIndex: number; results: import('./game-modes.js').RoundResult }) => void;
  'game:powerup_activated': (data: { powerup: import('./game-modes.js').PowerupState }) => void;
  'game:math_solved': (data: { userId: string; username: string }) => void;
  'room:message': (data: { userId: string; username: string; message: string; timestamp: string }) => void;

  // Phase 3: Retention Events
  'retention:daily_sync': (data: { user: User; missions: DailyMission[] }) => void;
  'retention:mission_update': (data: { mission: DailyMission }) => void;
  'retention:leaderboard_update': (data: { leaderboard: DailyLeaderboardEntry[] }) => void;

  // Phase 4: Social Events
  'social:friend_request_received': (request: FriendRequest & { fromUser: Partial<User> }) => void;
  'social:friend_request_accepted': (data: { userId: string; username: string }) => void;
  'social:presence_update': (data: { userId: string; status: PresenceStatus }) => void;
  'social:duel_invite_received': (invite: DuelInvite & { fromUser: Partial<User> }) => void;
  'social:notification_received': (notification: Notification) => void;
  'social:activity_update': (event: ActivityEvent) => void;
  'social:initial_sync': (data: {
    friends: (Partial<User> & { status: PresenceStatus })[];
    notifications: Notification[];
    activities: ActivityEvent[];
  }) => void;
  'judge:progress': (event: ExecutionEventPayload) => void;
  'game:run_code_result': (data: {
    success: boolean;
    error?: string;
    remainingRuns?: number;
    stdout?: string;
    stderr?: string;
    executionTimeMs?: number;
    exitCode?: number;
  }) => void;
}

export interface ClientToServerEvents {
  ping_sync: (data: { clientTime: string }) => void;
  'room:create': (data: { maxPlayers: number; gameMode?: import('./game-modes.js').GameMode; options?: any }) => void;
  'room:join': (data: { roomId: string }) => void;
  'room:toggle_ready': () => void;
  'room:return_to_lobby': () => void;
  'room:leave': () => void;
  'room:message': (data: { message: string }) => void;
  'telemetry:sync': (data: { roomId: string; events: TelemetryEvent[] }) => void;
  'game:submit': (data: { code: string; keystrokes?: number }) => void;
  'game:run_code': (data: { code: string }) => void;
  'game:code_sync': (data: { code: string }) => void;
  'game:countdown_start': () => void;
  'game:use_powerup': (data: { powerupType: import('./game-modes.js').PowerupType; targetId?: string }) => void;
  'game:submit_math_answer': (data: { answer: number }) => void;
  'queue:join': () => void;
  'queue:leave': () => void;
  'match:accept': (data: { matchId: string }) => void;

  // Phase 3: Retention Events
  'retention:claim_mission': (data: { missionId: string }) => void;

  // Phase 4: Social Events
  'social:friend_request_send': (data: { toUserId: string }) => void;
  'social:friend_request_response': (data: { requestId: string; action: 'ACCEPT' | 'REJECT' }) => void;
  'social:friend_removed': (data: { friendId: string }) => void;
  'social:presence_set': (data: { status: PresenceStatus }) => void;
  'social:duel_invite_send': (data: { toUserId: string }) => void;
  'social:duel_invite_response': (data: { inviteId: string; action: 'ACCEPT' | 'REJECT' }) => void;
  'social:notification_read': (data: { notificationId: string }) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  user: User;
}

export enum Verdict {
  ACCEPTED = 'ACCEPTED',
  WRONG_ANSWER = 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED = 'TIME_LIMIT_EXCEEDED',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  COMPILATION_ERROR = 'COMPILATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  DISQUALIFIED = 'DISQUALIFIED',
}

export interface PlayerResult {
  userId: string;
  username: string;
  outcome: 'WINNER' | 'LOSER' | 'DRAW' | 'DISQUALIFIED';
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  executionTimeMs: number;
  memoryBytes: number;
  language: string;
  score: number;
  correctnessScore?: number;
  efficiencyScore?: number;
  speedScore?: number;
  disqualificationReason?: string;
}

export interface MatchResult {
  roomId: string;
  roundIndex: number;
  winnerId?: string;
  isDraw: boolean;
  playerResults: Record<string, PlayerResult>;
  endedAt: string;
}
