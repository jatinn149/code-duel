import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { requestLogger } from '@/middleware/request-logger';
import { errorHandler } from '@/middleware/error-handler';
import { env } from '@/config/env';
import { createAuthRouter } from '@/routes/auth-routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin.endsWith('.trycloudflare.com') || origin.endsWith('.trycloudflared.com')) {
        callback(null, true);
        return;
      }
      const frontendUrl = process.env.FRONTEND_URL;
      if (frontendUrl && (origin === frontendUrl || origin === frontendUrl.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
        return;
      }
      if (env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
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

// Routes
app.use('/api/v1/auth', createAuthRouter());

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
