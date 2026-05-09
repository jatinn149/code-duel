import request from 'supertest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { app } from '../app';
import { jsonStorage } from '../storage/json-adapter';
import path from 'path';
import fs from 'fs/promises';

// Mock environment
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-jwt-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  },
}));

describe('Authentication System', () => {
  beforeEach(async () => {
    // Manually set storage dir for tests if needed or just clear it
    await jsonStorage.initialize();
  });

  afterEach(async () => {
    // Clear test data
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const sessionsPath = path.join(process.cwd(), 'data', 'sessions.json');
    try {
      await fs.unlink(usersPath);
    } catch {
      // Ignore
    }
    try {
      await fs.unlink(sessionsPath);
    } catch {
      // Ignore
    }
  });

  const signupData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };

  const loginData = {
    email: 'test@example.com',
    password: 'password123',
  };

  it('should successfully sign up a new user', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send(signupData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.username).toBe(signupData.username);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should not sign up with an existing email', async () => {
    await request(app).post('/api/v1/auth/signup').send(signupData);

    const response = await request(app).post('/api/v1/auth/signup').send(signupData);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('should successfully login an existing user', async () => {
    await request(app).post('/api/v1/auth/signup').send(signupData);

    const response = await request(app).post('/api/v1/auth/login').send(loginData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should fail login with incorrect password', async () => {
    await request(app).post('/api/v1/auth/signup').send(signupData);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...loginData, password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should successfully refresh the access token', async () => {
    const signupResponse = await request(app).post('/api/v1/auth/signup').send(signupData);

    const refreshTokenCookie = signupResponse.headers['set-cookie'][0].split(';')[0];

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
    // Rotation check: the new cookie should be different or at least present
  });

  it('should logout and invalidate the session', async () => {
    const signupResponse = await request(app).post('/api/v1/auth/signup').send(signupData);

    const refreshTokenCookie = signupResponse.headers['set-cookie'][0].split(';')[0];

    await request(app).post('/api/v1/auth/logout').set('Cookie', [refreshTokenCookie]);

    // Try to refresh with the same token
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(refreshResponse.status).toBe(401);
  });

  it('should detect refresh token reuse and revoke all sessions', async () => {
    const signupResponse = await request(app).post('/api/v1/auth/signup').send(signupData);

    const firstRefreshTokenCookie = signupResponse.headers['set-cookie'][0].split(';')[0];

    // First refresh works and rotates
    const firstRefreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [firstRefreshTokenCookie]);

    expect(firstRefreshResponse.status).toBe(200);
    const secondRefreshTokenCookie = firstRefreshResponse.headers['set-cookie'][0].split(';')[0];

    // Attempting to use the first token again (reuse detection)
    const secondRefreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [firstRefreshTokenCookie]);

    expect(secondRefreshResponse.status).toBe(401);

    // Now even the valid second token should be revoked (as per security rules)
    const thirdRefreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [secondRefreshTokenCookie]);

    expect(thirdRefreshResponse.status).toBe(401);
  });

  it('should protect routes with requireAuth middleware', async () => {
    const signupResponse = await request(app).post('/api/v1/auth/signup').send(signupData);

    const token = signupResponse.body.data.accessToken;

    const authResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(authResponse.status).toBe(200);
    expect(authResponse.body.success).toBe(true);
    expect(authResponse.body.data.user.id).toBe(signupResponse.body.data.user.id);

    const unauthResponse = await request(app).get('/api/v1/auth/me');
    expect(unauthResponse.status).toBe(401);
  });
});
