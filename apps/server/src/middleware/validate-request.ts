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

      // Surgical update: only replace request data if the key was present in the schema-validated output.
      // This prevents stripping valid Express request objects (like req.params) when the schema doesn't define them.
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      if (parsed.cookies !== undefined) req.cookies = parsed.cookies;

      next();
    } catch (error: unknown) {
      // Use error name check instead of instanceof ZodError to be resilient in monorepo/symlink environments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error instanceof z.ZodError || (error as any).name === 'ZodError') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return next(new ValidationError((error as any).errors));
      }
      next(error);
    }
  };
};
