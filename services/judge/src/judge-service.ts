import { JudgeRequest, JudgeResult, TestCaseResult } from '@code-duel/types';
import { ContainerManager } from './container-manager';
import { OutputNormalizer } from './utils/output-normalizer';
import { logger } from './utils/logger';

export class JudgeService {
  private containerManager: ContainerManager;

  constructor() {
    this.containerManager = new ContainerManager();
  }

  async judge(request: JudgeRequest): Promise<JudgeResult> {
    const testResults: TestCaseResult[] = [];
    let totalScore = 0;
    let maxScore = 0;

    logger.info(
      { submissionId: request.submissionId, language: request.language },
      'Judging started',
    );

    for (const testCase of request.testCases) {
      maxScore += testCase.weight;

      try {
        const execution = await this.containerManager.runPython(request.code, testCase.input, {
          timeLimitMs: request.timeLimitMs,
          memoryLimitMb: request.memoryLimitMb,
        });

        const status = OutputNormalizer.getResultStatus(
          execution.stdout,
          testCase.expectedOutput,
          execution.exitCode,
          execution.stderr,
          execution.timeout,
        );

        if (status === 'passed') {
          totalScore += testCase.weight;
        }

        testResults.push({
          testCaseId: testCase.id,
          status,
          actualOutput: testCase.isHidden ? undefined : execution.stdout,
          error: execution.stderr || undefined,
          executionTimeMs: execution.durationMs,
          memoryUsageMb: 0, // In a real production system, we'd fetch this from stats
        });

        // Optimization: If a critical error occurs, we might want to stop further tests
        // but for a duel platform, running all cases is usually better for feedback.
      } catch (error) {
        logger.error({ error, testCaseId: testCase.id }, 'Test case execution error');
        testResults.push({
          testCaseId: testCase.id,
          status: 'error',
          error: 'Internal Judge Error',
          executionTimeMs: 0,
          memoryUsageMb: 0,
        });
      }
    }

    const overallStatus = this.determineOverallStatus(testResults);

    const result: JudgeResult = {
      submissionId: request.submissionId,
      overallStatus,
      totalScore,
      maxScore,
      testResults,
    };

    logger.info(
      { submissionId: request.submissionId, overallStatus, totalScore },
      'Judging completed',
    );
    return result;
  }

  private determineOverallStatus(results: TestCaseResult[]): JudgeResult['overallStatus'] {
    if (results.some((r) => r.status === 'timeout')) return 'timeout';
    if (results.some((r) => r.status === 'error')) return 'error';
    if (results.every((r) => r.status === 'passed')) return 'passed';
    return 'failed';
  }

  async pruneOrphans(): Promise<void> {
    await this.containerManager.pruneOrphans();
  }
}

export const judgeService = new JudgeService();
