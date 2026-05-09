import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@/errors';

export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      // Replace req data with parsed/sanitized data
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      req.cookies = parsed.cookies;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError(error.errors));
      }
      next(error);
    }
  };
};
