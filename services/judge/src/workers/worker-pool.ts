import { DockerSandbox } from '../sandboxes/docker-sandbox';
import { logger } from '../utils/logger';
import { healthService, JudgeInfrastructureStatus } from '../infrastructure/health/health-service';

export class WorkerPool {
  private availableWorkers: Map<string, DockerSandbox[]> = new Map();
  private maxWorkersPerLanguage = parseInt(process.env.MAX_WORKERS_PER_LANG || '5', 10);
  private isDegraded = false;

  constructor() {}

  async initialize() {
    logger.info('Initializing worker pool...');
    try {
       await this.replenishPool('python');
    } catch (err) {
       logger.error({ err }, 'Worker pool initialization failed completely');
       this.isDegraded = true;
       healthService.updateComponent('WorkerPool', JudgeInfrastructureStatus.DEGRADED, 'Failed to pre-warm workers');
    }
  }

  private async replenishPool(language: string) {
    if (!this.availableWorkers.has(language)) {
      this.availableWorkers.set(language, []);
    }

    const pool = this.availableWorkers.get(language)!;
    const needed = this.maxWorkersPerLanguage - pool.length;

    for (let i = 0; i < needed; i++) {
      try {
        const sandbox = new DockerSandbox(language);
        await sandbox.initialize();
        pool.push(sandbox);
      } catch (err) {
        logger.error({ err, language }, 'Failed to initialize worker');
        healthService.updateComponent('WorkerPool', JudgeInfrastructureStatus.DEGRADED, 'Partial failure: could not initialize all workers');
        this.isDegraded = true;
      }
    }
    
    // If we managed to replenish successfully without errors
    if (pool.length > 0 && !this.isDegraded) {
       healthService.updateComponent('WorkerPool', JudgeInfrastructureStatus.HEALTHY, `Ready with ${pool.length} workers`);
    } else if (pool.length === 0) {
       healthService.updateComponent('WorkerPool', JudgeInfrastructureStatus.OFFLINE, 'No workers available');
    }
  }

  async acquire(language: string): Promise<DockerSandbox> {
    if (!this.availableWorkers.has(language)) {
      this.availableWorkers.set(language, []);
    }

    const pool = this.availableWorkers.get(language)!;
    let unhealthyCount = 0;
    
    while (pool.length > 0) {
      const sandbox = pool.pop()!;
      try {
        const isHealthy = await sandbox.checkHealth();
        if (isHealthy) {
          const cleaned = await sandbox.cleanWorkspace();
          if (cleaned) {
            if (unhealthyCount > 0) {
              this.replenishPool(language).catch(() => {});
            }
            return sandbox;
          }
        }
      } catch (err) {
        logger.error({ err, language }, 'Error checking health or cleaning workspace of warm worker');
      }
      
      unhealthyCount++;
      await sandbox.cleanup().catch(() => {});
    }

    if (unhealthyCount > 0) {
      this.replenishPool(language).catch(() => {});
    }

    logger.warn({ language }, 'No healthy workers available, creating a new one on the fly');
    const sandbox = new DockerSandbox(language);
    await sandbox.initialize();
    const cleaned = await sandbox.cleanWorkspace();
    if (!cleaned) {
      throw new Error('Failed to clean workspace of fresh sandbox');
    }
    return sandbox;
  }

  async release(language: string, sandbox: DockerSandbox) {
    if (sandbox.isReady) {
      // Perform post-submission workspace cleanup to return container to idle state cleanly
      try {
        const cleaned = await sandbox.cleanWorkspace();
        if (cleaned) {
          const pool = this.availableWorkers.get(language) || [];
          pool.push(sandbox);
          this.availableWorkers.set(language, pool);
          return;
        }
      } catch (err) {
        logger.error({ err, language }, 'Error cleaning workspace on worker release');
      }
      
      // Clean failed or threw: destroy and replenish
      await sandbox.cleanup().catch(() => {});
    }
    
    // Sandbox was tainted or cleanup failed: replenish the pool
    await this.replenishPool(language).catch(() => {});
  }

  async shutdown() {
    logger.info('Shutting down worker pool...');
    for (const pool of this.availableWorkers.values()) {
      for (const sandbox of pool) {
        await sandbox.cleanup();
      }
    }
  }
}

export const workerPool = new WorkerPool();
