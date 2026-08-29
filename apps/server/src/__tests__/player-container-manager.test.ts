import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerContainerManager } from '../services/player-container-manager';

// Mock the environment variables to avoid validation failure during tests
vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-secret-value-longer-than-32-chars-for-test',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-value-longer-than-32-chars-for-test',
  },
}));

const mockCreateContainer = vi.hoisted(() => vi.fn());
const mockStart = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockInspect = vi.hoisted(() => vi.fn());

vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        createContainer: mockCreateContainer,
        listContainers: vi.fn().mockResolvedValue([]),
        getContainer: vi.fn().mockImplementation(() => ({
          remove: mockRemove,
        })),
      };
    }),
  };
});

describe('PlayerContainerManager', () => {
  let manager: PlayerContainerManager;

  beforeEach(() => {
    manager = new PlayerContainerManager();
    vi.clearAllMocks();

    mockStart.mockReset();
    mockRemove.mockReset();
    mockInspect.mockReset();
    mockCreateContainer.mockReset();
  });

  it('should successfully create and initialize a persistent container for a player', async () => {
    mockCreateContainer.mockResolvedValue({
      id: 'container-123',
      start: mockStart.mockResolvedValue(undefined),
    });

    await manager.createContainerForPlayer('match-1', 'player-1');

    expect(mockCreateContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        Image: 'python:3.11-slim',
        Cmd: ['tail', '-f', '/dev/null'],
        HostConfig: expect.objectContaining({
          Memory: 128 * 1024 * 1024,
          NetworkMode: 'none',
          ReadonlyRootfs: true,
          PidsLimit: 32,
        }),
      })
    );
    expect(mockStart).toHaveBeenCalled();
  });

  it('should reject runs when execution limit is reached', async () => {
    const mockContainer = {
      id: 'container-123',
      start: mockStart.mockResolvedValue(undefined),
      inspect: mockInspect.mockResolvedValue({ State: { Running: true } }),
    };
    mockCreateContainer.mockResolvedValue(mockContainer);

    // Artificially set remaining runs to 0
    await manager.createContainerForPlayer('match-1', 'player-1');
    (manager as any).remainingRuns.set('player-1', 0);

    const result = await manager.runCodeForPlayer('player-1', 'print("hello")', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Execution limit reached');
  });

  it('should prevent concurrent execution overlapping', async () => {
    const mockContainer = {
      id: 'container-123',
      start: mockStart.mockResolvedValue(undefined),
      inspect: mockInspect.mockResolvedValue({ State: { Running: true } }),
    };
    mockCreateContainer.mockResolvedValue(mockContainer);

    await manager.createContainerForPlayer('match-1', 'player-1');
    
    // Artificially set active executions
    (manager as any).activeExecutions.add('player-1');

    const result = await manager.runCodeForPlayer('player-1', 'print("hello")', '');
    expect(result.success).toBe(false);
    expect(result.error).toContain('already in progress');
  });

  it('should recreate and recover if container is unhealthy', async () => {
    const mockUnhealthyContainer = {
      id: 'container-old',
      start: mockStart.mockResolvedValue(undefined),
      inspect: vi.fn().mockRejectedValue(new Error('container not running')),
      remove: mockRemove.mockResolvedValue(undefined),
    };
    mockCreateContainer.mockResolvedValueOnce(mockUnhealthyContainer);

    await manager.createContainerForPlayer('match-1', 'player-1');

    // Second call to createContainer represents recovery recreation
    const mockHealthyContainer = {
      id: 'container-new',
      start: mockStart.mockResolvedValue(undefined),
      inspect: vi.fn().mockResolvedValue({ State: { Running: true } }),
      exec: vi.fn().mockResolvedValue({
        start: vi.fn().mockResolvedValue({
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn().mockImplementation((event, cb) => {
            if (event === 'end') cb();
          }),
        }),
      }),
    };
    mockCreateContainer.mockResolvedValueOnce(mockHealthyContainer);

    // Set some remaining runs so execution runs
    (manager as any).remainingRuns.set('player-1', 5);

    await manager.runCodeForPlayer('player-1', 'print("hello")', '');
    expect(mockCreateContainer).toHaveBeenCalledTimes(2);
  });

  it('should successfully clean up containers associated with a match', async () => {
    const mockContainer = {
      id: 'container-123',
      start: mockStart.mockResolvedValue(undefined),
      remove: mockRemove.mockResolvedValue(undefined),
    };
    mockCreateContainer.mockResolvedValue(mockContainer);

    await manager.createContainerForPlayer('match-1', 'player-1');
    await manager.destroyContainersForMatch('match-1');

    expect(mockRemove).toHaveBeenCalledWith({ force: true });
    expect((manager as any).containers.has('player-1')).toBe(false);
  });

  it('should not decrement remaining runs and should allow execution when isFree is true', async () => {
    const mockContainer = {
      id: 'container-123',
      start: mockStart.mockResolvedValue(undefined),
      inspect: mockInspect.mockResolvedValue({ State: { Running: true } }),
      exec: vi.fn().mockResolvedValue({
        start: vi.fn().mockResolvedValue({
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn().mockImplementation((event, cb) => {
            if (event === 'end') cb();
          }),
        }),
        inspect: vi.fn().mockResolvedValue({ ExitCode: 0 }),
      }),
    };
    mockCreateContainer.mockResolvedValue(mockContainer);

    await manager.createContainerForPlayer('match-1', 'player-1');
    (manager as any).remainingRuns.set('player-1', 0); // 0 remaining runs!

    // Run code with isFree = true. It should succeed and remainingRuns should stay 0.
    const result = await manager.runCodeForPlayer('player-1', 'print("hello")', '', true);
    expect(result.success).toBe(true);
    expect(result.remainingRuns).toBe(0);
  });
});
