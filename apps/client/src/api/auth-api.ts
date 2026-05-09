import axios from 'axios';
import { SignupInput, LoginInput } from '@code-duel/validation';
import { AuthResponse, User } from '@code-duel/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authApi = axios.create({
  baseURL: `${API_URL}/api/v1/auth`,
  withCredentials: true,
});

export const signup = async (data: SignupInput): Promise<AuthResponse> => {
  const response = await authApi.post('/signup', data);
  return response.data.data;
};

export const login = async (data: LoginInput): Promise<AuthResponse> => {
  const response = await authApi.post('/login', data);
  return response.data.data;
};

export const logout = async (): Promise<void> => {
  await authApi.post('/logout');
};

export const refresh = async (): Promise<AuthResponse> => {
  const response = await authApi.post('/refresh');
  return response.data.data;
};

export const getMe = async (token: string): Promise<Omit<User, 'passwordHash'>> => {
  const response = await authApi.get('/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};
