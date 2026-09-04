import { apiClient } from './api-client';

export interface AdminStats {
  totalUsers: number;
  activeRooms: number;
  storageMode: string;
  uptimeSec: number;
  nodeVersion: string;
  memoryMb: number;
  heapUsedMb: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  playerId: string;
  role: 'USER' | 'ADMIN';
  rating: number;
  xp: number;
  level: number;
  rank: string;
  wins: number;
  losses: number;
  streak: number;
  highestStreak: number;
  status: string;
  createdAt: string;
}

export interface AdminRoom {
  id: string;
  ownerId: string;
  gameMode: string;
  state: string;
  players: Array<{
    id: string;
    username: string;
    rating: number;
    isReady: boolean;
    connected: boolean;
  }>;
  createdAt: string;
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get('/admin/stats');
    return res.data.data;
  },

  getUsers: async (): Promise<AdminUser[]> => {
    const res = await apiClient.get('/admin/users');
    return res.data.data;
  },

  updateUser: async (id: string, updates: Partial<AdminUser>): Promise<AdminUser> => {
    const res = await apiClient.patch(`/admin/users/${id}`, updates);
    return res.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  clearUserDatabase: async (keepAdmin = true): Promise<{ deletedUsersCount: number; message: string }> => {
    const res = await apiClient.post('/admin/users/clear', { keepAdmin });
    return res.data.data;
  },

  getRooms: async (): Promise<AdminRoom[]> => {
    const res = await apiClient.get('/admin/rooms');
    return res.data.data;
  },

  terminateRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/admin/rooms/${roomId}/terminate`);
  },

  flushRedis: async (): Promise<void> => {
    await apiClient.post('/admin/system/flush-redis');
  },

  resetDailyChallenge: async (): Promise<void> => {
    await apiClient.post('/admin/daily-challenge/reset');
  },
};
