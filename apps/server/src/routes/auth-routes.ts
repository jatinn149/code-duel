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
import { JsonNotificationRepository } from '@/repositories/json-notification-repository';
import { PgProblemRepository } from '@/repositories/pg-problem-repository';
import { JsonProblemRepository } from '@/repositories/json-problem-repository';
import { ProgressionService } from '@/services/progression-service';
import { RetentionService } from '@/services/retention-service';
import { DailyResetEngine } from '@/services/daily-reset-engine';
import { JudgeService } from '@/services/judge-pipeline';
import { redisCache } from '@/utils/redis-cache';
import { jsonStorage } from '@/storage/json-adapter';
import { validateRequest } from '@/middleware/validate-request';
import { signupSchema, loginSchema, refreshTokenSchema } from '@code-duel/validation';
import { requireAuth } from '@/middleware/auth-middleware';
import { UserRole } from '@code-duel/types';
import { calculateCpRank } from '@code-duel/shared';

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

  router.get('/check-username', async (req, res) => {
    try {
      const rawUsername = (req.query.username as string || '').trim();
      if (!rawUsername) {
        return res.json({ available: false, message: 'Username is required' });
      }
      if (rawUsername.length < 3) {
        return res.json({ available: false, message: 'Username must be at least 3 characters' });
      }
      if (rawUsername.length > 20) {
        return res.json({ available: false, message: 'Username must be less than 20 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(rawUsername)) {
        return res.json({ available: false, message: 'Only alphanumeric characters and underscores are allowed' });
      }

      const existing = await userRepository.findByUsername(rawUsername);
      if (existing) {
        const rand = Math.floor(10 + Math.random() * 89);
        const suggestions = [
          `${rawUsername}_coder`,
          `${rawUsername}${rand}`,
          `dev_${rawUsername}`,
        ];
        return res.json({ available: false, suggestions, message: 'Username already in use' });
      }

      return res.json({ available: true, message: 'Username is available' });
    } catch (err: any) {
      return res.status(500).json({ available: false, message: 'Failed to verify username availability' });
    }
  });

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
      (safeUser as any).seasonalTier = calculateCpRank(userDetails.rating);
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
      const notificationRepository = new JsonNotificationRepository(jsonStorage);
      const notifications = await notificationRepository.getByUserId(userId);

      const cpHistory: any[] = [];

      for (const m of matches) {
        const myResult = m.results?.find((r: any) => r.userId === userId);
        if (myResult && myResult.ratingChange !== undefined) {
          const opponent = m.results?.find((r: any) => r.userId !== userId);
          cpHistory.push({
            id: `match-${m.roomId}`,
            type: 'MATCH',
            source: `${m.mode} Duel`,
            reason: myResult.ratingChange >= 0 ? `Victory vs @${opponent?.username || 'Opponent'}` : `Defeat vs @${opponent?.username || 'Opponent'}`,
            change: myResult.ratingChange,
            newCp: myResult.newRating,
            timestamp: m.endedAt,
          });
        }
      }

      for (const n of notifications) {
        const data = n.data as any;
        if (data && (data.giftCp || data.tierUpgrade)) {
          cpHistory.push({
            id: `notif-${n.id}`,
            type: data.tierUpgrade ? 'TIER_PROMOTION' : 'ADMIN_GRANT',
            source: data.tierUpgrade ? `Tier Promotion: ${data.tierUpgrade}` : 'Administration Grant',
            reason: n.title || 'League Commendation',
            change: Number(data.giftCp || 0),
            timestamp: n.createdAt,
            note: n.message,
          });
        }
      }

      cpHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({
        success: true,
        data: {
          matchHistory: matches,
          cpHistory,
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

          // Keep admin accounts out of reach of regular users
          const isUserAdmin = req.user?.role === UserRole.ADMIN;
          if (!isUserAdmin && owner.role === UserRole.ADMIN) {
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

      userDetails.seasonalTier = calculateCpRank(userDetails.rating);

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

  router.post('/missions/:id/claim', authMiddleware, async (req, res) => {
    try {
      const userId = req.user!.id;
      const missionId = req.params.id;

      const dailyMissionRepository = new JsonDailyMissionRepository(jsonStorage);
      const progressionService = new ProgressionService(userRepository);
      const retentionService = new RetentionService(userRepository, dailyMissionRepository, progressionService);

      const result = await retentionService.claimMissionReward(userId, missionId);

      const { passwordHash, ...safeUser } = result.user as any;
      safeUser.seasonalTier = calculateCpRank(safeUser.rating);

      res.json({
        success: true,
        data: {
          user: safeUser,
          mission: result.mission,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to claim directive reward',
      });
    }
  });

  router.get('/leaderboard', authMiddleware, async (_req, res, next) => {
    try {
      const rawUsers = await userRepository.findAll();
      const users = rawUsers
        .filter(u => u.role !== UserRole.ADMIN)
        .map(u => ({
          id: u.id,
          username: u.username,
          rating: u.rating,
          level: u.level,
          wins: u.wins,
          losses: u.losses,
          matchesPlayed: u.matchesPlayed,
          seasonalTier: calculateCpRank(u.rating),
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

  const judgeService = new JudgeService();

  router.get('/daily-challenge', authMiddleware, async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.user!.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const dailyChallengeRepository = new JsonDailyChallengeRepository(jsonStorage);
      const problemRepository = isPgEnabled ? new PgProblemRepository() : new JsonProblemRepository(jsonStorage);

      const today = new Date().toISOString().split('T')[0];
      const tier = user.rating < 1000 ? 'BEGINNER' : user.rating < 2000 ? 'INTERMEDIATE' : 'ADVANCED';
      
      let challenge = await dailyChallengeRepository.getCurrent(tier, today);
      if (!challenge) {
        const dailyResetEngine = new DailyResetEngine(dailyChallengeRepository, problemRepository);
        await dailyResetEngine.ensureDailyChallenges(today);
        challenge = await dailyChallengeRepository.getCurrent(tier, today);
      }

      if (!challenge) {
        return res.status(404).json({ success: false, message: 'No daily challenge available today' });
      }

      const problem = await problemRepository.findById(challenge.problemId);
      if (!problem) {
        return res.status(404).json({ success: false, message: 'Challenge problem not found' });
      }

      // Check if user has already solved today
      const solvedKey = `daily_solved:${today}:${user.id}`;
      const solvedRaw = await redisCache.get(solvedKey);
      const alreadySolved = !!solvedRaw;
      const userResult = solvedRaw ? JSON.parse(solvedRaw) : null;

      // Get today's leaderboard
      const leaderboardKey = `daily_leaderboard:${today}`;
      const leaderboardRaw = await redisCache.get(leaderboardKey);
      const leaderboard: any[] = leaderboardRaw ? JSON.parse(leaderboardRaw) : [];

      // Calculate time remaining until midnight UTC
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const timeRemainingSec = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));

      res.json({
        success: true,
        data: {
          problem: {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty <= 3 ? 'Easy' : problem.difficulty <= 6 ? 'Medium' : 'Hard',
            initialCode: problem.initialCode || '# Write your solution here in Python\ndef solution():\n    pass\n',
            sampleTestCases: (problem.testCases || []).slice(0, 3),
          },
          alreadySolved,
          userResult,
          leaderboard: leaderboard.filter((e) => !e.role || e.role !== UserRole.ADMIN).slice(0, 20),
          todayDate: today,
          timeRemainingSec,
          streak: user.streak || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/daily-challenge/run', authMiddleware, async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.user!.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const { code, language } = req.body;
      const dailyChallengeRepository = new JsonDailyChallengeRepository(jsonStorage);
      const problemRepository = isPgEnabled ? new PgProblemRepository() : new JsonProblemRepository(jsonStorage);
      const today = new Date().toISOString().split('T')[0];
      const tier = user.rating < 1000 ? 'BEGINNER' : user.rating < 2000 ? 'INTERMEDIATE' : 'ADVANCED';
      const challenge = await dailyChallengeRepository.getCurrent(tier, today);
      if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });
      const problem = await problemRepository.findById(challenge.problemId);
      if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

      const sampleTests = (problem.testCases || []).slice(0, 3);
      const facts = await judgeService.execute(code, language || 'python', sampleTests);
      res.json({
        success: true,
        data: {
          verdict: facts.verdict,
          results: facts.testResults,
          executionTimeMs: facts.executionTimeMs,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/daily-challenge/submit', authMiddleware, async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.user!.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const { code, language, timeElapsedSec } = req.body;
      const dailyChallengeRepository = new JsonDailyChallengeRepository(jsonStorage);
      const problemRepository = isPgEnabled ? new PgProblemRepository() : new JsonProblemRepository(jsonStorage);
      const today = new Date().toISOString().split('T')[0];
      const tier = user.rating < 1000 ? 'BEGINNER' : user.rating < 2000 ? 'INTERMEDIATE' : 'ADVANCED';
      const challenge = await dailyChallengeRepository.getCurrent(tier, today);
      if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });
      const problem = await problemRepository.findById(challenge.problemId);
      if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

      const facts = await judgeService.execute(code, language || 'python', problem.testCases || []);
      const passed = facts.verdict === 'ACCEPTED';

      let xpEarned = 0;
      let cpEarned = 0;
      let newStreak = user.streak || 0;

      if (passed) {
        const solvedKey = `daily_solved:${today}:${user.id}`;
        const alreadySolved = await redisCache.get(solvedKey);

        if (!alreadySolved) {
          xpEarned = 500;
          cpEarned = 50;
          newStreak = (user.streak || 0) + 1;

          await userRepository.update(user.id, {
            dailyChallengeWins: (user.dailyChallengeWins || 0) + 1,
            xp: (user.xp || 0) + xpEarned,
            rating: (user.rating || 0) + cpEarned,
            streak: newStreak,
            highestStreak: Math.max(user.highestStreak || 0, newStreak),
          });

          const resultRecord = {
            timeElapsedSec: timeElapsedSec || 60,
            completedAt: new Date().toISOString(),
          };
          await redisCache.set(solvedKey, JSON.stringify(resultRecord), 'EX', 86400 * 2);

          if (user.role !== UserRole.ADMIN) {
            const leaderboardKey = `daily_leaderboard:${today}`;
            const leaderboardRaw = await redisCache.get(leaderboardKey);
            const leaderboard = leaderboardRaw ? JSON.parse(leaderboardRaw) : [];
            leaderboard.push({
              userId: user.id,
              username: user.username,
              timeElapsedSec: timeElapsedSec || 60,
              completedAt: new Date().toISOString(),
            });
            leaderboard.sort((a: any, b: any) => a.timeElapsedSec - b.timeElapsedSec);
            await redisCache.set(leaderboardKey, JSON.stringify(leaderboard), 'EX', 86400 * 2);
          }
        }
      }

      res.json({
        success: true,
        data: {
          passed,
          verdict: facts.verdict,
          results: facts.testResults,
          executionTimeMs: facts.executionTimeMs,
          xpEarned,
          cpEarned,
          streak: newStreak,
          timeElapsedSec: timeElapsedSec || 60,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
