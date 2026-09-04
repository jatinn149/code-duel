import { Router } from 'express';
import { IUserRepository } from '@/repositories/interfaces';
import { requireAuth, requireRole } from '@/middleware/auth-middleware';
import { UserRole } from '@code-duel/types';
import { calculateCpRank } from '@code-duel/shared';
import { clearUserDatabase, flushAllRedisCache } from '@/services/admin-service';
import { redisCache } from '@/utils/redis-cache';
import { DailyResetEngine } from '@/services/daily-reset-engine';
import { logger } from '@/utils/logger';

export const createAdminRouter = (
  userRepository: IUserRepository,
  dailyResetEngine?: DailyResetEngine,
) => {
  const router = Router();
  const auth = requireAuth(userRepository);
  const adminOnly = requireRole([UserRole.ADMIN]);

  // Apply authentication & admin-only role to all endpoints
  router.use(auth);
  router.use(adminOnly);

  // 1. System & Diagnostic Stats
  router.get('/stats', async (_req, res, next) => {
    try {
      const users = await userRepository.findAll();
      const isPgEnabled = !!process.env.DATABASE_URL;

      let activeRoomCount = 0;
      try {
        const roomKeys = await redisCache.keys('room:*');
        activeRoomCount = roomKeys ? roomKeys.length : 0;
      } catch {
        // Redis may be offline or empty
      }

      const mem = process.memoryUsage();
      res.json({
        success: true,
        data: {
          totalUsers: users.length,
          activeRooms: activeRoomCount,
          storageMode: isPgEnabled ? 'PostgreSQL' : 'JSON Storage Adapter',
          uptimeSec: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memoryMb: Math.round(mem.rss / (1024 * 1024)),
          heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // 2. User Management: Get All Users
  router.get('/users', async (_req, res, next) => {
    try {
      const users = await userRepository.findAll();
      // Omit password hashes
      const safeUsers = users.map((u) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _p, ...safe } = u;
        return safe;
      });
      res.json({ success: true, data: safeUsers });
    } catch (error) {
      next(error);
    }
  });

  // 3. User Management: Modify User (CP, XP, Streak, Role, etc.)
  router.patch('/users/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updates: any = {};
      if (req.body.rating !== undefined) {
        updates.rating = Number(req.body.rating);
        updates.rank = calculateCpRank(updates.rating);
      }
      if (req.body.xp !== undefined) updates.xp = Number(req.body.xp);
      if (req.body.level !== undefined) updates.level = Number(req.body.level);
      if (req.body.streak !== undefined) updates.streak = Number(req.body.streak);
      if (req.body.wins !== undefined) updates.wins = Number(req.body.wins);
      if (req.body.losses !== undefined) updates.losses = Number(req.body.losses);
      if (req.body.role !== undefined && Object.values(UserRole).includes(req.body.role)) {
        updates.role = req.body.role;
      }

      const updated = await userRepository.update(id, updates);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _p, ...safe } = updated;
      res.json({ success: true, data: safe, message: `User ${updated.username} updated` });
    } catch (error) {
      next(error);
    }
  });

  // 4. User Management: Delete User
  router.delete('/users/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).json({ success: false, message: 'Cannot delete your own admin account' });
      }
      await userRepository.delete(id);
      res.json({ success: true, message: 'User successfully deleted' });
    } catch (error) {
      next(error);
    }
  });

  // 5. Database Purge / Reset User Database
  router.post('/users/clear', async (req, res, next) => {
    try {
      const keepAdmin = req.body.keepAdmin !== false;
      const result = await clearUserDatabase(userRepository, { keepAdmin });
      logger.info({ adminId: req.user?.id }, 'User database cleared by admin');
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  });

  // 6. Active Live Rooms
  router.get('/rooms', async (_req, res, next) => {
    try {
      const roomKeys = await redisCache.keys('room:*');
      const rooms: any[] = [];
      for (const key of roomKeys) {
        try {
          const raw = await redisCache.get(key);
          if (raw) rooms.push(JSON.parse(raw));
        } catch {
          // ignore corrupted keys
        }
      }
      res.json({ success: true, data: rooms });
    } catch (error) {
      next(error);
    }
  });

  // 7. Terminate / Disband Room
  router.post('/rooms/:roomId/terminate', async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const roomKey = `room:${roomId}`;
      const raw = await redisCache.get(roomKey);
      if (raw) {
        const room = JSON.parse(raw);
        if (room.players) {
          for (const p of room.players) {
            await redisCache.del(`player_to_room:${p.id}`);
          }
        }
        await redisCache.del(roomKey);
      }
      res.json({ success: true, message: `Room ${roomId} terminated by admin.` });
    } catch (error) {
      next(error);
    }
  });

  // 8. Redis Purge / Cache Flush
  router.post('/system/flush-redis', async (_req, res, next) => {
    try {
      const result = await flushAllRedisCache();
      res.json({ success: true, message: 'Redis cache flushed successfully', data: result });
    } catch (error) {
      next(error);
    }
  });

  // 9. Daily Challenge Force Reset
  router.post('/daily-challenge/reset', async (_req, res, next) => {
    try {
      if (!dailyResetEngine) {
        return res.status(400).json({ success: false, message: 'Daily Reset Engine not available' });
      }
      await dailyResetEngine.executeReset();
      res.json({ success: true, message: "Today's daily challenges rotated successfully" });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
