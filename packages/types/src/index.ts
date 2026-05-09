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
