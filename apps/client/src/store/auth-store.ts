import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@code-duel/types';
import {
  login as loginApi,
  signup as signupApi,
  logout as logoutApi,
  refresh as refreshApi,
} from '@/api/auth-api';
import { SignupInput, LoginInput } from '@code-duel/validation';
import axios from 'axios';

interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  signup: (data: SignupInput) => Promise<void>;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user, accessToken } = await signupApi(data);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          let message = 'Signup failed';
          if (axios.isAxiosError(error)) {
            message = error.response?.data?.message || message;
          }
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      login: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user, accessToken } = await loginApi(data);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          let message = 'Login failed';
          if (axios.isAxiosError(error)) {
            message = error.response?.data?.message || message;
          }
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await logoutApi();
        } finally {
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      refresh: async () => {
        try {
          const { user, accessToken } = await refreshApi();
          set({ user, accessToken, isAuthenticated: true });
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      setError: (error) => set({ error }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
