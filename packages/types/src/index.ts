export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  IN_GAME = 'IN_GAME',
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tokenVersion: number;
  matchesPlayed: number;
  matchesWon: number;
  rating: number;
  status: PresenceStatus;
  createdAt: string;
  updatedAt: string;
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
  JUDGING = 'JUDGING',
  RESULTS = 'RESULTS',
}

export interface Player {
  id: string;
  username: string;
  rating: number;
  isReady: boolean;
  isOwner: boolean;
  connected: boolean;
  lastSeen: string;
}

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
  results: {
    userId: string;
    username: string;
    score: number;
    ratingChange: number;
    newRating: number;
    status: 'completed' | 'disconnected' | 'disqualified';
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
  'game:end': (data: { winnerId: string }) => void;
  'queue:status': (status: { position: number; total: number } | null) => void;
  'match:found': (data: { matchId: string }) => void;
  pong_sync: (data: { clientTime: string; serverTime: string }) => void;
}

export interface ClientToServerEvents {
  ping_sync: (data: { clientTime: string }) => void;
  'room:create': (data: { maxPlayers: number }) => void;
  'room:join': (data: { roomId: string }) => void;
  'room:toggle_ready': () => void;
  'room:leave': () => void;
  'telemetry:sync': (data: { roomId: string; events: TelemetryEvent[] }) => void;
  'game:submit': (data: { code: string; keystrokes?: number }) => void;
  'game:countdown_start': () => void;
  'queue:join': () => void;
  'queue:leave': () => void;
  'match:accept': (data: { matchId: string }) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  user: User;
}
