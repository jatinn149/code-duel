import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '@/controllers/auth-controller';
import { AuthService } from '@/services/auth-service';
import { SessionService } from '@/services/session-service';
import { JsonUserRepository } from '@/repositories/json-user-repository';
import { PgUserRepository } from '@/repositories/pg-user-repository';
import { JsonSessionRepository } from '@/repositories/json-session-repository';
import { PgSessionRepository } from '@/repositories/pg-session-repository';
import { PgMatchResultRepository } from '@/repositories/pg-match-result-repository';
import { JsonMatchResultRepository } from '@/repositories/json-match-result-repository';
import { JsonDailyChallengeRepository } from '@/repositories/json-daily-challenge-repository';
import { JsonDailyMissionRepository } from '@/repositories/json-daily-mission-repository';
import { PgProblemRepository } from '@/repositories/pg-problem-repository';
import { JsonProblemRepository } from '@/repositories/json-problem-repository';
import { ProgressionService } from '@/services/progression-service';
import { RetentionService } from '@/services/retention-service';
import { redisCache } from '@/utils/redis-cache';
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

  const isPgEnabled = !!process.env.DATABASE_URL;
  const userRepository = isPgEnabled ? new PgUserRepository() : new JsonUserRepository(jsonStorage);
  const sessionRepository = isPgEnabled ? new PgSessionRepository() : new JsonSessionRepository(jsonStorage);
  const sessionService = new SessionService(sessionRepository);
  const authService = new AuthService(userRepository, sessionService);
  const authController = new AuthController(authService);

  const authMiddleware = requireAuth(userRepository);

  router.post('/signup', authRateLimiter, validateRequest(signupSchema), authController.signup);

  router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);

  router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);

  router.post('/logout', authController.logout);

  router.post('/logout-all', authMiddleware, authController.logoutAll);

  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const userDetails = await userRepository.findById(req.user!.id);
      if (!userDetails) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const { passwordHash, ...safeUser } = userDetails;
      res.json({
        success: true,
        data: { user: safeUser },
      });
    } catch {
      res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
    }
  });

  router.get('/profile', authMiddleware, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const matchResultRepository = isPgEnabled ? new PgMatchResultRepository() : new JsonMatchResultRepository(jsonStorage);
      const matches = await matchResultRepository.findByUserId(userId);
      
      res.json({
        success: true,
        data: {
          matchHistory: matches,
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard', authMiddleware, async (req, res, next) => {
    try {
      const user = req.user!;
      const userId = user.id;

      // 1. Get latest user details (to refresh streak/highestStreak/rating)
      const userDetails = await userRepository.findById(userId);
      if (!userDetails) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // 2. Fetch daily challenge
      const dailyChallengeRepository = new JsonDailyChallengeRepository(jsonStorage);
      const problemRepository = isPgEnabled ? new PgProblemRepository() : new JsonProblemRepository(jsonStorage);
      
      const today = new Date().toISOString().split('T')[0];
      const rating = userDetails.rating;
      const tier = rating < 1000 ? 'BEGINNER' : rating < 2000 ? 'INTERMEDIATE' : 'ADVANCED';
      const challenge = await dailyChallengeRepository.getCurrent(tier, today);
      
      let challengeDetails: any = null;
      if (challenge) {
        const problem = await problemRepository.findById(challenge.problemId);
        if (problem) {
          challengeDetails = {
            id: challenge.id,
            problemId: challenge.problemId,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty <= 3 ? 'Easy' : problem.difficulty <= 6 ? 'Medium' : 'Hard',
            expiresAt: challenge.expiresAt,
            points: 50,
          };
        }
      }

      // 3. Fetch active directives (daily missions)
      const dailyMissionRepository = new JsonDailyMissionRepository(jsonStorage);
      const progressionService = new ProgressionService(userRepository);
      const retentionService = new RetentionService(userRepository, dailyMissionRepository, progressionService);
      const missions = await retentionService.getDailyMissions(userId);
      
      // 4. Fetch live arena matches (active rooms in Redis) and prune ghost/stale rooms
      const keys = await redisCache.keys('room:*');
      const roomKeys = keys.filter(key => {
        const parts = key.split(':');
        return parts.length === 2 && parts[1].includes('-'); // room:XXXX-XXXX-XXXX
      });

      const liveMatches = [];
      for (const key of roomKeys) {
        const roomStr = await redisCache.get(key);
        if (!roomStr) continue;

        try {
          const room = JSON.parse(roomStr);
          if (!room || !room.id || !room.players || room.players.length === 0) {
            await redisCache.del(key);
            continue;
          }

          // Delete finished or cancelled rooms
          if (room.state === 'RESULTS' || room.state === 'CANCELLED') {
            await redisCache.del(key);
            continue;
          }

          // Check if any player is currently connected
          const connectedPlayers = room.players.filter((p: any) => p.connected);
          if (connectedPlayers.length === 0) {
            const lastUpdated = new Date(room.updatedAt || room.createdAt || 0).getTime();
            if (Date.now() - lastUpdated > 3 * 60 * 1000) { // 3 mins with 0 connected players
              await redisCache.del(key);
              continue;
            }
          }

          // Verify the room owner actually exists in the PostgreSQL database
          const owner = await userRepository.findById(room.ownerId);
          if (!owner) {
            // Orphaned room from a deleted/reset account: permanently purge from Redis
            await redisCache.del(key);
            continue;
          }

          // Only list truly active rooms
          if (room.state === 'PLAYING' || room.state === 'COUNTDOWN' || (room.state === 'WAITING' && connectedPlayers.length > 0)) {
            liveMatches.push({
              roomId: room.id,
              mode: room.gameMode,
              state: room.state,
              players: room.players.map((p: any) => ({
                username: p.username,
                rating: p.rating,
                seasonalTier: p.seasonalTier,
                connected: p.connected
              }))
            });
          }
        } catch (e) {
          // Bad JSON or corrupted key: delete
          await redisCache.del(key).catch(() => {});
        }
      }

      res.json({
        success: true,
        data: {
          user: userDetails,
          dailyChallenge: challengeDetails,
          activeDirectives: missions,
          liveArena: liveMatches
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/leaderboard', authMiddleware, async (_req, res, next) => {
    try {
      const rawUsers = await userRepository.findAll();
      const users = rawUsers
        .map(u => ({
          id: u.id,
          username: u.username,
          rating: u.rating,
          level: u.level,
          wins: u.wins,
          losses: u.losses,
          matchesPlayed: u.matchesPlayed,
          seasonalTier: u.seasonalTier
        }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 50);

      res.json({
        success: true,
        data: {
          leaderboard: users
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
