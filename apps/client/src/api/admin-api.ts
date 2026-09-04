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

  giftUser: async (
    id: string,
    gift: { xp?: number; rating?: number; level?: number; seasonalTier?: string; note?: string }
  ): Promise<AdminUser> => {
    const res = await apiClient.post(`/admin/users/${id}/gift`, gift);
    return res.data.data;
  },

  sendUserMail: async (
    id: string,
    mail: { title: string; message: string; giftXp?: number; giftCp?: number }
  ): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/mail`, mail);
  },

  broadcastMail: async (
    mail: { title: string; message: string; giftXp?: number; giftCp?: number }
  ): Promise<{ recipientsCount: number }> => {
    const res = await apiClient.post('/admin/broadcast-mail', mail);
    return res.data.data;
  },

  resetUserStats: async (id: string): Promise<AdminUser> => {
    const res = await apiClient.post(`/admin/users/${id}/reset-stats`);
    return res.data.data;
  },
};
