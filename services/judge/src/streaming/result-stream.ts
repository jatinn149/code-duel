import { ExecutionEventPayload } from '@code-duel/types';
import { logger } from '../utils/logger';
import { redisManager } from '../infrastructure/redis/redis-manager';

export class ResultStream {
  static async publishEvent(event: ExecutionEventPayload) {
    try {
      const client = redisManager.getClient();
      const channel = `execution-events:${event.roomId}`;
      await client.publish(channel, JSON.stringify(event));
      logger.debug({ event }, 'Published execution event');
    } catch (error) {
      logger.error({ error, event }, 'Failed to publish execution event');
    }
  }

  static async close() {
    // Connection is managed by RedisManager, no need to quit here
  }
}
