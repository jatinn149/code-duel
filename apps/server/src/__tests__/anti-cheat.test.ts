import { describe, it, expect, vi } from 'vitest';

// Mock the environment variables
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
  },
}));

import { AntiCheatService } from '../services/anti-cheat-service';
import { MatchTelemetry, TelemetryEvent } from '@code-duel/types';

describe('AntiCheatService', () => {
  const antiCheatService = new AntiCheatService();

  it('should detect large paste as suspicious', async () => {
    const telemetry: MatchTelemetry = {
      roomId: 'room-1',
      userId: 'user-1',
      events: [{ type: 'paste', timestamp: new Date().toISOString(), data: { length: 600 } }],
      totalKeystrokes: 0,
      totalPastedChars: 600,
      tabSwitches: 0,
    };

    const result = await antiCheatService.processTelemetry(telemetry);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should detect impossible typing speed', async () => {
    const now = Date.now();
    const events: TelemetryEvent[] = [];
    for (let i = 0; i < 30; i++) {
      events.push({
        type: 'keystroke',
        timestamp: new Date(now + i * 50).toISOString(), // 20 keys per second
      });
    }

    const telemetry: MatchTelemetry = {
      roomId: 'room-1',
      userId: 'user-2',
      events,
      totalKeystrokes: 30,
      totalPastedChars: 0,
      tabSwitches: 0,
    };

    const result = await antiCheatService.processTelemetry(telemetry);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should invalidate submission with low keystroke ratio', () => {
    const code = 'def long_function():\n    ' + 'x = 1\n    '.repeat(50);
    const keystrokes = 10;
    const isValid = antiCheatService.validateSubmission('user-1', code, keystrokes);
    expect(isValid).toBe(false);
  });
});
