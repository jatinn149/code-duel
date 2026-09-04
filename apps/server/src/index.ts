import 'dotenv/config';
import { Server } from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { jsonStorage } from './storage/json-adapter';
import { shutdownDb, initializeAndValidateDb } from './db';

import { initSocket } from './socket';
import { JsonUserRepository } from './repositories/json-user-repository';
import { PgUserRepository } from './repositories/pg-user-repository';
import { JsonDailyChallengeRepository } from './repositories/json-daily-challenge-repository';
import { JsonDailyMissionRepository } from './repositories/json-daily-mission-repository';
import { JsonProblemRepository } from './repositories/json-problem-repository';
import { PgProblemRepository } from './repositories/pg-problem-repository';
import { JsonFriendRepository } from './repositories/json-friend-repository';
import { PgFriendRepository } from './repositories/pg-friend-repository';
import { JsonNotificationRepository } from './repositories/json-notification-repository';
import { JsonActivityRepository } from './repositories/json-activity-repository';
import { JsonDuelInviteRepository } from './repositories/json-duel-invite-repository';
import { PgMatchResultRepository } from './repositories/pg-match-result-repository';
import { JsonMatchResultRepository } from './repositories/json-match-result-repository';
import { createSocialRouter } from './routes/social-routes';
import { createAdminRouter } from './routes/admin-routes';
import { ensureAdminUser } from './services/admin-service';

import { ProgressionService } from './services/progression-service';
import { RetentionService } from './services/retention-service';
import { DailyResetEngine } from './services/daily-reset-engine';
import { backupService } from './utils/backup';
import { playerContainerManager } from './services/player-container-manager';

let server: Server;
let backupInterval: NodeJS.Timeout;
let isExiting = false;

async function bootstrap() {
  if (server) {
    logger.warn('Bootstrap called but server already exists');
    return;
  }

  try {
    // Initialize storage & backups
    await jsonStorage.initialize();
    await backupService.initialize();
    logger.info('Storage and Backup services initialized');

    // Create initial snapshot (skip in development to avoid nodemon reload churn)
    if (env.NODE_ENV !== 'development') {
      await backupService.createSnapshot();
    } else {
      logger.info('Skipping initial backup snapshot in development mode');
    }

    const isPgEnabled = !!process.env.DATABASE_URL;
    if (isPgEnabled) {
      logger.info('PostgreSQL Persistence Enabled. Using Pg Repositories.');
      await initializeAndValidateDb();
    } else {
      logger.info('PostgreSQL Persistence Disabled. Using JSON Repositories.');
    }

    const userRepository = isPgEnabled ? new PgUserRepository() : new JsonUserRepository(jsonStorage);
    // Ensure Super Admin account exists on startup
    await ensureAdminUser(userRepository);

    const progressionService = new ProgressionService(userRepository);
    const dailyChallengeRepository = new JsonDailyChallengeRepository(jsonStorage);
    const dailyMissionRepository = new JsonDailyMissionRepository(jsonStorage);
    const problemRepository = isPgEnabled ? new PgProblemRepository() : new JsonProblemRepository(jsonStorage);

    // Phase 4 Repositories
    const friendRepository = isPgEnabled ? new PgFriendRepository() : new JsonFriendRepository(jsonStorage);
    const notificationRepository = new JsonNotificationRepository(jsonStorage);
    const activityRepository = new JsonActivityRepository(jsonStorage);
    const duelInviteRepository = new JsonDuelInviteRepository(jsonStorage);

    const retentionService = new RetentionService(userRepository, dailyMissionRepository, progressionService);
    const dailyResetEngine = new DailyResetEngine(dailyChallengeRepository, problemRepository);

    // Run a manual reset at startup to ensure today's challenges exist
    await dailyResetEngine.executeReset();
    dailyResetEngine.startScheduler();

    const matchResultRepository = isPgEnabled
      ? new PgMatchResultRepository()
      : new JsonMatchResultRepository(jsonStorage);

    app.use('/api/v1/social', createSocialRouter(userRepository, friendRepository));
    app.use('/api/v1/admin', createAdminRouter(userRepository, dailyResetEngine));

    server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Initialize Sockets
    initSocket(server, userRepository, progressionService, retentionService, {
      friendRepository,
      notificationRepository,
      activityRepository,
      duelInviteRepository,
      problemRepository,
      matchResultRepository,
    });
    logger.info('Socket.io initialized');

    // Start periodic backups (every 6 hours)
    backupInterval = setInterval(
      () => {
        backupService.createSnapshot();
      },
      6 * 60 * 60 * 1000,
    );

    const exitHandler = async (signal?: string) => {
      if (isExiting) return;
      isExiting = true;

      if (signal) {
        logger.info(`${signal} received`);
      }

      if (backupInterval) {
        clearInterval(backupInterval);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backupInterval = undefined as any;
      }

      logger.info('Attempting graceful shutdown...');

      try {
        // Cleanup all player persistent execution containers
        await playerContainerManager.destroyAllContainers();
      } catch (error) {
        logger.error({ error }, 'Failed to cleanup player containers during shutdown');
      }

      try {
        // Final backup before exit
        await backupService.createSnapshot();
        await shutdownDb();
      } catch (error) {
        logger.error({ error }, 'Final backup failed during shutdown');
      }

      if (server) {
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });

        // Force exit after 10 seconds if server.close hangs
        setTimeout(() => {
          logger.error('Graceful shutdown timed out, forcing exit');
          process.exit(1);
        }, 10000).unref();
      } else {
        process.exit(0);
      }
    };

    const unexpectedErrorHandler = (error: unknown) => {
      logger.error({ error }, 'Unexpected error');
      exitHandler('UNEXPECTED_ERROR');
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGTERM', () => exitHandler('SIGTERM'));
    process.on('SIGINT', () => exitHandler('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
