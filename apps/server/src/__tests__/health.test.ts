import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { app } from '../app';

// Mock the environment variables to avoid validation failure during tests if not provided
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  },
}));

describe('Health Check API', () => {
  it('should return 200 and success status', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Server is healthy',
      data: expect.objectContaining({
        timestamp: expect.any(String),
        env: 'test',
      }),
    });
  });
});
