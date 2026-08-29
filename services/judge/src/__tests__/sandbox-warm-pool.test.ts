import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DockerSandbox } from '../sandboxes/docker-sandbox';
import { workerPool } from '../workers/worker-pool';
import { ExecutionPipeline } from '../execution/execution-pipeline';
import { SubmissionPayload, GameMode } from '@code-duel/types';
import { ResultStream } from '../streaming/result-stream';
import { EventEmitter } from 'events';

// Mock ResultStream to prevent publishing to Redis in tests
vi.mock('../streaming/result-stream', () => ({
  ResultStream: {
    publishEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock dockerode
const mockInspect = vi.fn();
const mockStart = vi.fn();
const mockRemove = vi.fn();
const mockExecInspect = vi.fn();
const mockExecStart = vi.fn();

const mockContainer = {
  id: 'test-container-id',
  start: mockStart,
  inspect: mockInspect,
  remove: mockRemove,
  exec: vi.fn().mockImplementation(() => {
    return {
      start: mockExecStart,
      inspect: mockExecInspect,
    };
  }),
};

vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        createContainer: vi.fn().mockResolvedValue(mockContainer),
        modem: {
          demuxStream: vi.fn().mockImplementation((_stream, stdout, _stderr) => {
            // Write a dummy payload and trigger end
            stdout.write(Buffer.from('test-output'));
          }),
        },
      };
    }),
  };
});

describe('DockerSandbox Warm Pool and Pipeline Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    mockInspect.mockResolvedValue({ State: { Running: true } });
    mockExecInspect.mockResolvedValue({ ExitCode: 0 });
    
    mockExecStart.mockImplementation(() => {
      const stream = new EventEmitter() as any;
      stream.write = vi.fn();
      stream.end = vi.fn();
      process.nextTick(() => {
        stream.emit('end');
      });
      return Promise.resolve(stream);
    });
  });

  describe('DockerSandbox Initialization & Health Checks', () => {
    it('should initialize and pre-warm python sandbox container', async () => {
      const sandbox = new DockerSandbox('python');
      await sandbox.initialize();
      expect(sandbox.isReady).toBe(true);
    });

    it('should pass health checks when container is running and echo succeeds', async () => {
      const sandbox = new DockerSandbox('python');
      await sandbox.initialize();
      
      const healthyStream = new EventEmitter() as any;
      healthyStream.write = vi.fn();
      healthyStream.end = vi.fn();
      process.nextTick(() => {
        healthyStream.emit('data', Buffer.from('healthy'));
        healthyStream.emit('end');
      });
      mockExecStart.mockResolvedValue(healthyStream);

      const health = await sandbox.checkHealth();
      expect(health).toBe(true);
    });

    it('should clean workspace by running pkill and rm commands', async () => {
      const sandbox = new DockerSandbox('python');
      await sandbox.initialize();

      const cleaned = await sandbox.cleanWorkspace();
      expect(cleaned).toBe(true);
      expect(mockContainer.exec).toHaveBeenCalled();
    });
  });

  describe('WorkerPool Lifecycle & Reconstruction', () => {
    it('should acquire and release python workers', async () => {
      const sandbox = new DockerSandbox('python');
      await sandbox.initialize();
      
      vi.spyOn(sandbox, 'checkHealth').mockResolvedValue(true);
      vi.spyOn(sandbox, 'cleanWorkspace').mockResolvedValue(true);

      // Seed the pool manually
      (workerPool as any).availableWorkers.set('python', [sandbox]);

      // Acquire worker
      const acquired = await workerPool.acquire('python');
      expect(acquired).toBe(sandbox);

      // Release worker
      await workerPool.release('python', acquired);
      const pool = (workerPool as any).availableWorkers.get('python');
      expect(pool.length).toBe(1);
    });

    it('should destroy and recreate container if health check fails on acquire', async () => {
      const sandbox = new DockerSandbox('python');
      await sandbox.initialize();
      
      // Force health check failure
      mockInspect.mockResolvedValue({ State: { Running: false } });
      
      // Seed pool
      (workerPool as any).availableWorkers.set('python', [sandbox]);

      const acquired = await workerPool.acquire('python');
      expect(acquired).toBeDefined();
      expect(acquired).not.toBe(sandbox); // Should be a new sandbox
      expect(mockRemove).toHaveBeenCalled(); // Old container destroyed
    });
  });

  describe('ExecutionPipeline Execution Flows', () => {
    it('should execute submission with multiple testcases on the same container', async () => {
      const sandbox = new DockerSandbox('python');
      await sandbox.initialize();
      (workerPool as any).availableWorkers.set('python', [sandbox]);

      const payload: SubmissionPayload = {
        submissionId: 'sub-1',
        roomId: 'room-1',
        userId: 'user-1',
        language: 'python',
        code: 'print("hello")',
        testCases: [
          { id: 'tc-1', input: '1', expectedOutput: 'test-output', isHidden: false, weight: 5 },
          { id: 'tc-2', input: '2', expectedOutput: 'test-output', isHidden: true, weight: 10 },
        ],
        timeLimitMs: 2000,
        memoryLimitMb: 64,
        mode: GameMode.MULTI_ROUND,
      };

      await ExecutionPipeline.execute(payload);

      // Verify ResultStream events published
      expect(ResultStream.publishEvent).toHaveBeenCalled();
    });
  });
});
