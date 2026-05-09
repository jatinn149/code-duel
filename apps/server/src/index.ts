import { Server } from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { jsonStorage } from './storage/json-adapter';

import { initSocket } from './socket';
import { JsonUserRepository } from './repositories/json-user-repository';

let server: Server;

async function bootstrap() {
  try {
    // Initialize storage
    await jsonStorage.initialize();
    logger.info('Storage initialized');

    const userRepository = new JsonUserRepository(jsonStorage);

    server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Initialize Sockets
    initSocket(server, userRepository);
    logger.info('Socket.io initialized');

    const exitHandler = () => {
      if (server) {
        server.close(() => {
          logger.info('Server closed');
          process.exit(1);
        });
      } else {
        process.exit(1);
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
