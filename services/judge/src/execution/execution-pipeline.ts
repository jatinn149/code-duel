import { SubmissionPayload, ExecutionState, TestCaseResult, ExecutionVerdict } from '@code-duel/types';
import { workerPool } from '../workers/worker-pool';
import { ResultStream } from '../streaming/result-stream';
import { VerdictEngine } from '../verdicts/verdict-engine';
import { OutputNormalizer } from '../utils/output-normalizer';
import { logger } from '../utils/logger';
import { healthService, JudgeInfrastructureStatus } from '../infrastructure/health/health-service';

export class ExecutionPipeline {
  static async execute(payload: SubmissionPayload): Promise<void> {
    await ResultStream.publishEvent({
      ...this.getBaseEvent(payload),
      state: ExecutionState.COMPILING,
    });

    // Check if infrastructure is degraded
    const overallHealth = healthService.getOverallStatus();
    if (overallHealth === JudgeInfrastructureStatus.OFFLINE) {
        logger.error({ submissionId: payload.submissionId }, 'Judge infrastructure is offline, cannot execute');
        await ResultStream.publishEvent({
          ...this.getBaseEvent(payload),
          state: ExecutionState.FINISHED,
          verdict: ExecutionVerdict.INTERNAL_ERROR,
          error: 'Execution infrastructure is currently offline',
        });
        return;
    }

    let sandbox;
    try {
      sandbox = await workerPool.acquire(payload.language);
    } catch (error) {
      logger.error({ error, submissionId: payload.submissionId }, 'Failed to acquire sandbox');
      await ResultStream.publishEvent({
        ...this.getBaseEvent(payload),
        state: ExecutionState.FINISHED,
        verdict: ExecutionVerdict.INTERNAL_ERROR,
        error: 'Execution infrastructure is currently unavailable (no workers)',
      });
      return;
    }

    const testResults: TestCaseResult[] = [];
    let hasInternalError = false;
    let totalDuration = 0;

    await ResultStream.publishEvent({
      ...this.getBaseEvent(payload),
      state: ExecutionState.RUNNING_PRETESTS, // Start with pretests
    });

    try {
      for (let i = 0; i < payload.testCases.length; i++) {
        const testCase = payload.testCases[i];
        
        if (testCase.isHidden && i > 0 && !payload.testCases[i - 1].isHidden) {
          await ResultStream.publishEvent({
            ...this.getBaseEvent(payload),
            state: ExecutionState.RUNNING_HIDDEN,
            progress: { passed: i, total: payload.testCases.length },
          });
        }

        const result = await sandbox.executeCodeWithStreams(payload.code, testCase.input, {
          timeLimitMs: payload.timeLimitMs,
          memoryLimitMb: payload.memoryLimitMb,
        });

        totalDuration += result.durationMs;

        const status = OutputNormalizer.getResultStatus(
          result.stdout,
          testCase.expectedOutput,
          result.exitCode,
          result.stderr,
          result.timeout
        );

        testResults.push({
          testCaseId: testCase.id,
          status,
          actualOutput: testCase.isHidden ? undefined : result.stdout,
          error: result.stderr || undefined,
          executionTimeMs: result.durationMs,
          memoryUsageMb: result.memoryUsageMb,
        });

        // Publish progressive update
        await ResultStream.publishEvent({
          ...this.getBaseEvent(payload),
          state: testCase.isHidden ? ExecutionState.RUNNING_HIDDEN : ExecutionState.RUNNING_PRETESTS,
          progress: { passed: testResults.filter(r => r.status === 'passed').length, total: payload.testCases.length },
        });

        // Short circuit on failure based on game mode
        if (status !== 'passed' && payload.mode === 'QUICKODE') {
           break;
        }
      }
    } catch (error) {
      logger.error({ error, submissionId: payload.submissionId }, 'Execution pipeline error');
      hasInternalError = true;
    } finally {
      await workerPool.release(payload.language, sandbox);
    }

    const verdict = VerdictEngine.determineVerdict(testResults, false, hasInternalError);

    await ResultStream.publishEvent({
      ...this.getBaseEvent(payload),
      state: ExecutionState.FINISHED,
      verdict,
      results: testResults,
      executionTimeMs: totalDuration,
    });
  }

  private static getBaseEvent(payload: SubmissionPayload) {
    return {
      submissionId: payload.submissionId,
      roomId: payload.roomId,
      userId: payload.userId,
    };
  }
}
