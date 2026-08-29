import { Queue, Worker, Job } from 'bullmq';
import { SubmissionPayload } from '@code-duel/types';
import { logger } from '../utils/logger';
import { JudgeOrchestrator } from '../orchestrator/judge-orchestrator';
import { redisManager, RedisConnectionState } from '../infrastructure/redis/redis-manager';

export class SubmissionQueue {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private isDegraded = false;

  constructor(private orchestrator: JudgeOrchestrator) {
    if (redisManager.getState() !== RedisConnectionState.CONNECTED) {
       logger.error('Cannot initialize SubmissionQueue: Redis is not connected.');
       this.isDegraded = true;
       return;
    }

    try {
        const connection = redisManager.getClient();

        this.queue = new Queue('submissions', { connection });

        this.worker = new Worker(
          'submissions',
          async (job: Job<SubmissionPayload>) => {
            logger.info({ jobId: job.id, submissionId: job.data.submissionId }, 'Processing submission');
            await this.orchestrator.processSubmission(job.data);
          },
          {
            connection,
            concurrency: parseInt(process.env.JUDGE_CONCURRENCY || '4', 10),
          }
        );

        this.worker.on('completed', (job) => {
          logger.info({ jobId: job.id }, 'Job completed successfully');
        });

        this.worker.on('failed', (job, err) => {
          logger.error({ jobId: job?.id, err }, 'Job failed');
        });
    } catch (err) {
       logger.error({ err }, 'Failed to initialize SubmissionQueue');
       this.isDegraded = true;
    }
  }

  async addSubmission(payload: SubmissionPayload) {
    if (this.isDegraded || !this.queue) {
       logger.error({ submissionId: payload.submissionId }, 'Submission rejected: Queue is degraded/offline.');
       return; // Handle graceful failure
    }

    logger.info({ submissionId: payload.submissionId }, 'Adding submission to queue');
    await this.queue.add('execute', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async close() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}


