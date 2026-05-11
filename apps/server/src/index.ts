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

async function bootstrap() {
  try {
    // Initialize storage & backups
    await jsonStorage.initialize();
    await backupService.initialize();
    logger.info('Storage and Backup services initialized');

    // Create initial snapshot
    await backupService.createSnapshot();

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

    const exitHandler = async () => {
      if (backupInterval) clearInterval(backupInterval);

      logger.info('Attempting graceful shutdown...');

      // Final backup before exit
      await backupService.createSnapshot();

      if (server) {
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    const unexpectedErrorHandler = (error: unknown) => {
      logger.error({ error }, 'Unexpected error');
      exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      if (server) {
        server.close();
      }
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      if (server) {
        server.close();
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
