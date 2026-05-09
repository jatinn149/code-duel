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
