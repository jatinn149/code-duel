import express, { Request, Response } from 'express';
import pino from 'pino';
import { APP_NAME } from '@code-duel/shared';
import { executionQueue } from './execution-queue';
import { judgeRequestSchema } from '@code-duel/validation';
import { ZodError } from 'zod';
import { judgeService } from './judge-service';
import { Server } from 'http';

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

const app = express();
app.use(express.json());

const port = process.env.PORT || 3002;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Judge Service', app: APP_NAME });
});

app.post('/api/v1/judge', async (req: Request, res: Response) => {
  try {
    const parsed = judgeRequestSchema.parse(req.body);
    const result = await executionQueue.submit(parsed);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const isZodError =
      error instanceof ZodError ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        (error as any).name === 'ZodError');

    if (isZodError) {
      return (
        res
          .status(400)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .json({ success: false, error: 'Invalid judge request', details: (error as any).errors })
      );
    }
    logger.error({ error }, 'Judge request failed');
    res.status(500).json({ success: false, error: 'Internal Judge Error' });
  }
});

const server: Server = app.listen(port, () => {
  logger.info(`Judge Service for ${APP_NAME} running on port ${port}`);
});

const exitHandler = async () => {
  logger.info('Shutting down judge service...');

  // Prune any judge containers before exiting
  await judgeService.pruneOrphans();

  server.close(() => {
    logger.info('Judge service closed');
    process.exit(0);
  });
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
