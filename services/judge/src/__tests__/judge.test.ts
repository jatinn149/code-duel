import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JudgeService } from '../judge-service';
import { JudgeRequest } from '@code-duel/types';

// Mock ContainerManager
const mockRunPython = vi.fn();
vi.mock('../container-manager', () => {
  return {
    ContainerManager: vi.fn().mockImplementation(function () {
      return {
        runPython: (
          code: string,
          input: string,
          options: { timeLimitMs: number; memoryLimitMb: number },
        ) => mockRunPython(code, input, options),
      };
    }),
  };
});

describe('JudgeService', () => {
  let judgeService: JudgeService;

  beforeEach(() => {
    judgeService = new JudgeService();
    mockRunPython.mockReset();
  });

  it('should correctly score a submission', async () => {
    const request: JudgeRequest = {
      submissionId: 'sub-1',
      language: 'python',
      code: 'print(input())',
      testCases: [
        { id: '1', input: 'hello', expectedOutput: 'hello', isHidden: false, weight: 10 },
        { id: '2', input: 'world', expectedOutput: 'wrong', isHidden: true, weight: 20 },
      ],
      timeLimitMs: 1000,
      memoryLimitMb: 128,
    };

    mockRunPython
      .mockResolvedValueOnce({
        stdout: 'hello',
        stderr: '',
        exitCode: 0,
        timeout: false,
        durationMs: 50,
      })
      .mockResolvedValueOnce({
        stdout: 'world',
        stderr: '',
        exitCode: 0,
        timeout: false,
        durationMs: 50,
      });

    const result = await judgeService.judge(request);

    expect(result.overallStatus).toBe('failed');
    expect(result.totalScore).toBe(10);
    expect(result.maxScore).toBe(30);
    expect(result.testResults[0].status).toBe('passed');
    expect(result.testResults[1].status).toBe('failed');
    expect(result.testResults[1].actualOutput).toBeUndefined(); // Hidden test
  });

  it('should handle timeouts', async () => {
    const request: JudgeRequest = {
      submissionId: 'sub-2',
      language: 'python',
      code: 'while True: pass',
      testCases: [{ id: '1', input: '', expectedOutput: '', isHidden: false, weight: 10 }],
      timeLimitMs: 1000,
      memoryLimitMb: 128,
    };

    mockRunPython.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 137,
      timeout: true,
      durationMs: 1000,
    });

    const result = await judgeService.judge(request);

    expect(result.overallStatus).toBe('timeout');
    expect(result.totalScore).toBe(0);
    expect(result.testResults[0].status).toBe('timeout');
  });
});
