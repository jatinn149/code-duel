import { Server } from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { jsonStorage } from './storage/json-adapter';

import { initSocket } from './socket';
import { JsonUserRepository } from './repositories/json-user-repository';
import { backupService } from './utils/backup';

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

    const userRepository = new JsonUserRepository(jsonStorage);

    server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Initialize Sockets
    initSocket(server, userRepository);
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
        // Final backup before exit
        await backupService.createSnapshot();
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
