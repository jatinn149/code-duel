import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { requestLogger } from '@/middleware/request-logger';
import { errorHandler } from '@/middleware/error-handler';
import { env } from '@/config/env';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === 'development' ? true : ['your-production-domain.com'],
    credentials: true,
  }),
);

// Request Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());

// Request Tracking
app.use(requestLogger);

// Health Check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    data: {
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    },
  });
});

// Error Handling (Must be last)
app.use(errorHandler);

export { app };
