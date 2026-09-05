import { SignupInput, LoginInput } from '@code-duel/validation';
import { AuthResponse, User } from '@code-duel/types';
import { apiClient } from './api-client';

export const signup = async (data: SignupInput): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/signup', data);
  return response.data.data;
};

export const login = async (data: LoginInput): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/login', data);
  return response.data.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const refresh = async (): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/refresh');
  return response.data.data;
};

export const getMe = async (): Promise<Omit<User, 'passwordHash'>> => {
  const response = await apiClient.get('/auth/me');
  return response.data.data;
};

export interface CpHistoryItem {
  id: string;
  type: 'MATCH' | 'ADMIN_GRANT' | 'TIER_PROMOTION';
  source: string;
  reason: string;
  change: number;
  newCp?: number;
  timestamp: string;
  note?: string;
}

export interface ProfileData {
  matchHistory: any[];
  cpHistory: CpHistoryItem[];
}

export const getProfile = async (): Promise<ProfileData> => {
  const response = await apiClient.get('/auth/profile');
  return response.data.data;
};

export const claimDirectiveReward = async (directiveId: string): Promise<{ user: any; mission: any }> => {
  const response = await apiClient.post(`/auth/missions/${directiveId}/claim`);
  return response.data.data;
};

export interface DashboardData {
  user: any;
  dailyChallenge: {
    id: string;
    problemId: string;
    title: string;
    description: string;
    difficulty: string;
    expiresAt: string;
    points: number;
  } | null;
  activeDirectives: any[];
  liveArena: any[];
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const response = await apiClient.get('/auth/dashboard');
  return response.data.data;
};

export interface LeaderboardUser {
  id: string;
  username: string;
  rating: number;
  level: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  seasonalTier: string;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardUser[];
}

export const getLeaderboard = async (): Promise<LeaderboardResponse> => {
  const response = await apiClient.get('/auth/leaderboard');
  return response.data.data;
};
