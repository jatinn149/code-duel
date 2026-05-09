import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '@/controllers/auth-controller';
import { AuthService } from '@/services/auth-service';
import { SessionService } from '@/services/session-service';
import { JsonUserRepository } from '@/repositories/json-user-repository';
import { JsonSessionRepository } from '@/repositories/json-session-repository';
import { jsonStorage } from '@/storage/json-adapter';
import { validateRequest } from '@/middleware/validate-request';
import { signupSchema, loginSchema, refreshTokenSchema } from '@code-duel/validation';
import { requireAuth } from '@/middleware/auth-middleware';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createAuthRouter = () => {
  const router = Router();

  const userRepository = new JsonUserRepository(jsonStorage);
  const sessionRepository = new JsonSessionRepository(jsonStorage);
  const sessionService = new SessionService(sessionRepository);
  const authService = new AuthService(userRepository, sessionService);
  const authController = new AuthController(authService);

  const authMiddleware = requireAuth(userRepository);

  router.post('/signup', authRateLimiter, validateRequest(signupSchema), authController.signup);

  router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);

  router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);

  router.post('/logout', authController.logout);

  router.post('/logout-all', authMiddleware, authController.logoutAll);

  router.get('/me', authMiddleware, (req, res) => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  });

  return router;
};
