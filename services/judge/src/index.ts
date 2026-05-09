import express from 'express';
import pino from 'pino';
import { APP_NAME } from '@code-duel/shared';

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

const app = express();
const port = process.env.PORT || 3002;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Judge Service', app: APP_NAME });
});

app.listen(port, () => {
  logger.info(`Judge Service for ${APP_NAME} running on port ${port}`);
});
