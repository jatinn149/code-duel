import { SubmissionPayload, ExecutionState } from '@code-duel/types';
import { ExecutionPipeline } from '../execution/execution-pipeline';
import { ResultStream } from '../streaming/result-stream';
import { logger } from '../utils/logger';

export class JudgeOrchestrator {
  constructor() {}

  async processSubmission(payload: SubmissionPayload): Promise<void> {
    logger.info({ submissionId: payload.submissionId }, 'Orchestrator starting submission execution');
    try {
      await ResultStream.publishEvent({
        submissionId: payload.submissionId,
        roomId: payload.roomId,
        userId: payload.userId,
        state: ExecutionState.QUEUED,
      });

      await ExecutionPipeline.execute(payload);
      
    } catch (error) {
      logger.error({ error, submissionId: payload.submissionId }, 'Orchestrator failed to process submission');
    }
  }
}
