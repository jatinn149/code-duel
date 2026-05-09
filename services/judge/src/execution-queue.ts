import fastq, { queueAsPromised } from 'fastq';
import { JudgeRequest, JudgeResult } from '@code-duel/types';
import { judgeService } from './judge-service';
import { logger } from './utils/logger';

export class ExecutionQueue {
  private queue: queueAsPromised<JudgeRequest, JudgeResult>;

  constructor(concurrency: number = 2) {
    this.queue = fastq.promise(this.worker, concurrency);
  }

  private async worker(request: JudgeRequest): Promise<JudgeResult> {
    try {
      return await judgeService.judge(request);
    } catch (error) {
      logger.error({ error, submissionId: request.submissionId }, 'Queue worker failed');
      throw error;
    }
  }

  async submit(request: JudgeRequest): Promise<JudgeResult> {
    logger.info(
      { submissionId: request.submissionId, queueLength: this.queue.length() },
      'Submission added to queue',
    );
    return this.queue.push(request);
  }

  get length(): number {
    return this.queue.length();
  }
}

export const executionQueue = new ExecutionQueue();
