import express from 'express';
import pino from 'pino';
import { APP_NAME } from '@code-duel/shared';

const logger = pino({
  transport: {
    target: 'pino-pretty',
  },
});

const app = express();
const port = process.env.PORT || 3001;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: APP_NAME });
});

app.listen(port, () => {
  logger.info(`${APP_NAME} Server running on port ${port}`);
});
