import { JudgeOrchestrator } from '../../orchestrator/judge-orchestrator';
import { SubmissionQueue } from '../../queue/submission-queue';
import { ResultStream } from '../../streaming/result-stream';
import { redisManager, RedisConnectionState } from '../redis/redis-manager';
import { imageManager } from '../docker/image-manager';
import { healthService, JudgeInfrastructureStatus } from '../health/health-service';
import { logger } from '../../utils/logger';

export class BootstrapManager {
  private queue: SubmissionQueue | null = null;
  private isDegradedMode = false;

  async initialize() {
    logger.info('Starting Judge Infrastructure Bootstrap...');

    // 1. Initialize Redis
    const redisReady = await redisManager.initialize();
    if (!redisReady || redisManager.getState() !== RedisConnectionState.CONNECTED) {
      logger.error('Redis initialization failed. Judge will start in DEGRADED mode.');
      healthService.updateComponent('Redis', JudgeInfrastructureStatus.OFFLINE, 'Connection failed');
      this.isDegradedMode = true;
    } else {
      healthService.updateComponent('Redis', JudgeInfrastructureStatus.HEALTHY, 'Connected');
    }

    // 2. Ensure Docker Images are ready
    const dockerImageReady = await imageManager.ensureImageExists('python:3.11-slim');
    if (!dockerImageReady) {
      logger.error('Required Docker image is missing. Judge will start in DEGRADED mode.');
      healthService.updateComponent('Docker', JudgeInfrastructureStatus.OFFLINE, 'Image missing');
      this.isDegradedMode = true;
    } else {
      healthService.updateComponent('Docker', JudgeInfrastructureStatus.HEALTHY, 'Available');
    }

    // 3. Start Judge components safely
    if (this.isDegradedMode) {
      logger.warn('⚠️ JUDGE STARTED IN DEGRADED MODE ⚠️');
      logger.warn('Submissions may not be processed until infrastructure recovers.');
      // Initialize what we can, but don't crash
    } else {
       await this.startCoreComponents();
    }
    
    this.startHealthMonitor();
  }

  private async startCoreComponents() {
      try {
          const orchestrator = new JudgeOrchestrator();
          
          // Worker Pool requires Docker
          healthService.updateComponent('WorkerPool', JudgeInfrastructureStatus.DEGRADED, 'Initializing');
          const { workerPool } = await import('../../workers/worker-pool');
          await workerPool.initialize();
          healthService.updateComponent('WorkerPool', JudgeInfrastructureStatus.HEALTHY, 'Initialized');

          // Queue requires Redis
          healthService.updateComponent('Queue', JudgeInfrastructureStatus.DEGRADED, 'Initializing');
          this.queue = new SubmissionQueue(orchestrator);
          healthService.updateComponent('Queue', JudgeInfrastructureStatus.HEALTHY, 'Listening');

          logger.info('✅ All core Judge components initialized successfully.');
      } catch (err) {
          logger.error({ err }, 'Failed to start core components');
          this.isDegradedMode = true;
          healthService.updateComponent('Core', JudgeInfrastructureStatus.OFFLINE, 'Startup error');
      }
  }

  private startHealthMonitor() {
      setInterval(() => {
          const currentStatus = healthService.getOverallStatus();
          const report = healthService.getStatusReport();
          
          if (currentStatus !== JudgeInfrastructureStatus.HEALTHY) {
              logger.warn({ report }, 'Judge Health Monitor: Infrastructure DEGRADED/OFFLINE');
          } else if (this.isDegradedMode) {
              // We recovered!
              logger.info('Infrastructure recovered. Attempting to restart core components...');
              this.isDegradedMode = false;
              this.startCoreComponents().catch(() => {
                  this.isDegradedMode = true;
                  logger.error('Failed to restart core components after recovery.');
              });
          }
      }, 10000);
  }

  async shutdown() {
    logger.info('Shutting down infrastructure...');
    if (this.queue) {
      try { await this.queue.close(); } catch(e) { logger.error({e}, 'Error closing queue'); }
    }
    try { await ResultStream.close(); } catch { /* ignore */ }
    try { 
       const { workerPool } = await import('../../workers/worker-pool');
       await workerPool.shutdown(); 
    } catch { /* ignore */ }
    await redisManager.close();
    logger.info('Infrastructure shutdown complete.');
  }
}

export const bootstrapManager = new BootstrapManager();
