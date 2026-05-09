import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '@/errors';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.headers['x-request-id'];

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, requestId }, 'Non-operational error');
    }

    const response = {
      success: false as const,
      message: err.message,
      errorCode: err.errorCode,
      errors: err instanceof ValidationError ? err.errors : undefined,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    };

    return res.status(err.statusCode).json(response);
  }

  // Programmer errors or unexpected errors
  logger.error({ err, requestId }, 'Unexpected error');

  const response = {
    success: false as const,
    message: 'Internal Server Error',
    errorCode: 'INTERNAL_SERVER_ERROR',
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    ...(env.NODE_ENV === 'development' ? { errorMessage: err.message } : {}),
  };

  return res.status(500).json(response);
};
