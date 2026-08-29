import pino from 'pino';
import { APP_NAME } from '@code-duel/shared';
import { bootstrapManager } from './infrastructure/bootstrap/bootstrap-manager';

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

async function bootstrap() {
  logger.info(`Starting Judge Service for ${APP_NAME}...`);
  await bootstrapManager.initialize();
}

const exitHandler = async () => {
  logger.info('Shutting down judge service...');
  await bootstrapManager.shutdown();
  logger.info('Judge service closed');
  process.exit(0);
};

process.on('SIGTERM', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  exitHandler();
});
process.on('unhandledRejection', (error) => {
  logger.error({ error }, 'Unhandled Rejection');
  exitHandler();
});

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to bootstrap Judge Service');
  process.exit(1);
});
