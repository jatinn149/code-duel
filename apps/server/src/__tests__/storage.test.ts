import fs from 'fs/promises';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the environment variables
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  },
}));

import { JsonStorageAdapter } from '../storage/json-adapter';

describe('JsonStorageAdapter', () => {
  const testDir = path.join(__dirname, 'test-data');
  const adapter = new JsonStorageAdapter(testDir);
  const collection = 'test-collection';

  beforeEach(async () => {
    await adapter.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should write and read data correctly', async () => {
    const data = [{ id: '1', name: 'Test' }];
    await adapter.write(collection, data);
    const result = await adapter.read(collection);
    expect(result).toEqual(data);
  });

  it('should return empty array for non-existent collection', async () => {
    const result = await adapter.read('non-existent');
    expect(result).toEqual([]);
  });

  it('should handle atomic writes correctly', async () => {
    const data1 = [{ id: '1', name: 'Test 1' }];
    const data2 = [{ id: '2', name: 'Test 2' }];

    // Concurrent writes
    await Promise.all([adapter.write(collection, data1), adapter.write(collection, data2)]);

    const result = await adapter.read(collection);
    // Since we locked the write, one will follow the other.
    // The last one to resolve wins for the final state.
    // In our implementation, they are sequenced.
    expect(result.length).toBe(1);
    expect(result[0]).toBeDefined();
  });
});
