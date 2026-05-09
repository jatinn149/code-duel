import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { UnauthorizedError, ForbiddenError } from '@/errors';
import { UserRole } from '@code-duel/types';
import { IUserRepository } from '@/repositories/interfaces';

export interface JWTPayload {
  sub: string;
  role: UserRole;
  version: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        version: number;
      };
    }
  }
}

export const requireAuth = (userRepository: IUserRepository) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authentication required');
      }

      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

      const user = await userRepository.findById(payload.sub);
      if (!user || user.tokenVersion !== payload.version) {
        throw new UnauthorizedError('Session expired or user not found');
      }

      req.user = {
        id: user.id,
        role: user.role,
        version: user.tokenVersion,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(new UnauthorizedError('Token expired'));
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new UnauthorizedError('Invalid token'));
      }
      next(error);
    }
  };
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};
