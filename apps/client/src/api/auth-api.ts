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
