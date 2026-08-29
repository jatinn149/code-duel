import { Queue } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';
import { SubmissionPayload, ExecutionEventPayload, ExecutionState, ExecutionVerdict } from '@code-duel/types';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { Server } from 'socket.io';
import { MatchFlowEngine } from './match-flow-engine';
import { roomManager } from '../socket/room-manager';

const getRedisOptions = (): RedisOptions => ({
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    // exponential backoff with max delay
    const delay = Math.min(times * 100, 3000);
    if (times > 20) {
      logger.error('JudgeClient Redis connection failed after 20 attempts. Submissions will fail.');
      return null;
    }
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

// Force IPv4 if using default or if URL contains localhost
const redisUrl = env.REDIS_URL.replace('localhost', '127.0.0.1');

const redisConnection = new Redis(redisUrl, getRedisOptions());
const redisSub = new Redis(redisUrl, getRedisOptions());

export class JudgeClient {
  private queue: Queue;
  private io: Server;
  private matchFlowEngine: MatchFlowEngine;
  private isDegraded = false;

  constructor(io: Server, matchFlowEngine: MatchFlowEngine) {
    this.queue = new Queue('submissions', { connection: redisConnection });
    this.io = io;
    this.matchFlowEngine = matchFlowEngine;

    redisConnection.on('error', (err: Error & { code?: string }) => {
        if (err.code === 'ECONNREFUSED') {
            if (!this.isDegraded) {
                logger.error('JudgeClient Redis connection refused. Entering DEGRADED mode.');
                this.isDegraded = true;
            }
        } else {
            logger.error({ err }, 'JudgeClient Redis error');
        }
    });

    redisConnection.on('ready', () => {
        if (this.isDegraded) {
            logger.info('JudgeClient Redis connection recovered. Leaving DEGRADED mode.');
            this.isDegraded = false;
        }
    });

    // Listen to execution events across all rooms
    redisSub.psubscribe('execution-events:*', (err) => {
      if (err) {
        logger.error({ err }, 'Failed to subscribe to execution events');
      } else {
        logger.info('Subscribed to judge execution events');
      }
    });

    redisSub.on('pmessage', (_pattern, _channel, message) => {
      try {
        const event = JSON.parse(message) as ExecutionEventPayload;
        this.handleExecutionEvent(event).catch((err) => {
          logger.error({ err, event }, 'Error in handleExecutionEvent');
        });
      } catch (err) {
        logger.error({ err, message }, 'Failed to parse execution event');
      }
    });
  }

  async submitCode(payload: SubmissionPayload) {
    if (this.isDegraded) {
      logger.warn({ submissionId: payload.submissionId }, 'Judge Infrastructure DEGRADED. Emitting immediate failure.');
      this.handleExecutionEvent({
         submissionId: payload.submissionId,
         roomId: payload.roomId,
         userId: payload.userId,
         state: ExecutionState.FINISHED,
         verdict: ExecutionVerdict.INTERNAL_ERROR,
         error: 'Execution infrastructure is currently offline.'
      });
      return;
    }

    try {
       logger.info({ submissionId: payload.submissionId }, 'Submitting code to judge');
       await this.queue.add('execute', payload);
    } catch (err) {
       logger.error({ err, submissionId: payload.submissionId }, 'Failed to push to queue.');
       this.handleExecutionEvent({
         submissionId: payload.submissionId,
         roomId: payload.roomId,
         userId: payload.userId,
         state: ExecutionState.FINISHED,
         verdict: ExecutionVerdict.INTERNAL_ERROR,
         error: 'Execution infrastructure is currently overloaded.'
      });
    }
  }

  private async handleExecutionEvent(event: ExecutionEventPayload) {
    // Send full event only to the submitting player, and sanitized event to others (Issue 1)
    const clients = await this.io.in(event.roomId).fetchSockets();
    
    // Sanitized event for opponent and spectators
    const sanitizedEvent = {
      submissionId: event.submissionId,
      roomId: event.roomId,
      userId: event.userId,
      state: event.state,
      verdict: event.verdict,
      testCaseIndex: (event as any).testCaseIndex,
      totalTestCases: (event as any).totalTestCases,
    };

    // Sanitized event for the submitting player themselves (hides inputs/outputs of hidden testcases)
    const playerEvent = JSON.parse(JSON.stringify(event)) as ExecutionEventPayload;
    if (playerEvent.results) {
      playerEvent.results = playerEvent.results.map((tr: any) => {
        if (tr.isHidden) {
          return {
            id: tr.id,
            testCaseId: tr.testCaseId,
            isHidden: true,
            passed: tr.passed,
            status: tr.status,
          };
        }
        return tr;
      });
    }

    for (const client of clients) {
      const clientUserId = (client as any).data?.user?.id;
      if (clientUserId === event.userId) {
        client.emit('judge:progress', playerEvent);
      } else {
        client.emit('judge:progress', sanitizedEvent);
      }
    }

    if (event.state === ExecutionState.FINISHED) {
      // Acquire fencing token
      const fencingToken = await roomManager.acquireLock(event.roomId);
      if (!fencingToken) {
        logger.debug({ roomId: event.roomId, submissionId: event.submissionId }, 'Another node is processing judge result');
        return;
      }

      try {
        await roomManager.updateRoom(event.roomId, async (room) => {
          logger.debug({ event }, 'Processing execution event from judge');
          await this.matchFlowEngine.handleJudgeResult(room, event, this.io);
        }, fencingToken);
      } catch (err) {
        logger.error({ err, roomId: event.roomId }, 'Failed to process judge result with CAS / Fencing Token');
      } finally {
        await roomManager.releaseLock(event.roomId);
      }
    }
  }



  async close() {
    await this.queue.close();
    redisSub.quit();
    redisConnection.quit();
  }
}

