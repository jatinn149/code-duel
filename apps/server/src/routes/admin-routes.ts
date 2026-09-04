import { Router } from 'express';
import { IUserRepository, INotificationRepository } from '@/repositories/interfaces';
import { requireAuth, requireRole } from '@/middleware/auth-middleware';
import { UserRole, NotificationType, Rank } from '@code-duel/types';
import { calculateCpRank, SocketEvents } from '@code-duel/shared';
import { clearUserDatabase, flushAllRedisCache } from '@/services/admin-service';
import { redisCache } from '@/utils/redis-cache';
import { DailyResetEngine } from '@/services/daily-reset-engine';
import { logger } from '@/utils/logger';

export const createAdminRouter = (
  userRepository: IUserRepository,
  dailyResetEngine?: DailyResetEngine,
  notificationRepository?: INotificationRepository,
  getIo?: () => any,
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

  // 4.1 Gift XP, CP/Rating, Level, Tier to User
  router.post('/users/:id/gift', async (req, res, next) => {
    try {
      const { id } = req.params;
      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const { xp, rating, level, seasonalTier, note } = req.body;
      const updates: any = {};

      if (rating !== undefined && !isNaN(Number(rating))) {
        updates.rating = Math.max(0, (targetUser.rating || 0) + Number(rating));
        updates.rank = calculateCpRank(updates.rating);
      }
      if (xp !== undefined && !isNaN(Number(xp))) {
        updates.xp = Math.max(0, (targetUser.xp || 0) + Number(xp));
      }
      if (level !== undefined && !isNaN(Number(level))) {
        updates.level = Math.max(1, Number(level));
      }
      if (seasonalTier) {
        updates.seasonalTier = String(seasonalTier);
      }

      const updatedUser = await userRepository.update(id, updates);

      if (notificationRepository) {
        const giftDesc = [
          xp ? `+${xp} XP` : null,
          rating ? `+${rating} CP` : null,
          level ? `Level ${level}` : null,
          seasonalTier ? `Tier ${seasonalTier}` : null,
        ].filter(Boolean).join(' • ');

        const notif = await notificationRepository.create({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          userId: id,
          type: NotificationType.ADMIN_REWARD,
          title: 'HQ Command: Resources Granted!',
          message: note?.trim() || `The administration granted rewards to your account: ${giftDesc}`,
          data: {
            giftXp: xp ? Number(xp) : undefined,
            giftCp: rating ? Number(rating) : undefined,
            newLevel: updates.level,
            newTier: updates.seasonalTier,
            grantedBy: (req.user as any)?.username || 'HQ Admin',
          },
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        const io = getIo?.();
        if (io) {
          io.to(`user:${id}`).emit(SocketEvents.NOTIFICATION_RECEIVED, notif);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _p, ...safe } = updatedUser;
      res.json({
        success: true,
        message: `Successfully granted rewards to @${updatedUser.username}`,
        data: safe,
      });
    } catch (error) {
      next(error);
    }
  });

  // 4.2 Send Direct System Mail to User
  router.post('/users/:id/mail', async (req, res, next) => {
    try {
      const { id } = req.params;
      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const { title, message, giftXp, giftCp } = req.body;
      if (!title?.trim() || !message?.trim()) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
      }

      const updates: any = {};
      if (giftCp && !isNaN(Number(giftCp))) {
        updates.rating = Math.max(0, (targetUser.rating || 0) + Number(giftCp));
        updates.rank = calculateCpRank(updates.rating);
      }
      if (giftXp && !isNaN(Number(giftXp))) {
        updates.xp = Math.max(0, (targetUser.xp || 0) + Number(giftXp));
      }

      if (Object.keys(updates).length > 0) {
        await userRepository.update(id, updates);
      }

      if (notificationRepository) {
        const notif = await notificationRepository.create({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          userId: id,
          type: (giftXp || giftCp) ? NotificationType.ADMIN_REWARD : NotificationType.SYSTEM_MAIL,
          title: title.trim(),
          message: message.trim(),
          data: {
            giftXp: giftXp ? Number(giftXp) : undefined,
            giftCp: giftCp ? Number(giftCp) : undefined,
            sender: (req.user as any)?.username || 'HQ Administration',
          },
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        const io = getIo?.();
        if (io) {
          io.to(`user:${id}`).emit(SocketEvents.NOTIFICATION_RECEIVED, notif);
        }
      }

      res.json({
        success: true,
        message: `System mail dispatched to @${targetUser.username}`,
      });
    } catch (error) {
      next(error);
    }
  });

  // 4.3 Broadcast System Mail to All Non-Admin Users
  router.post('/broadcast-mail', async (req, res, next) => {
    try {
      const { title, message, giftXp, giftCp } = req.body;
      if (!title?.trim() || !message?.trim()) {
        return res.status(400).json({ success: false, message: 'Title and message are required' });
      }

      const allUsers = await userRepository.findAll();
      const regularUsers = allUsers.filter(u => u.role !== UserRole.ADMIN);

      for (const u of regularUsers) {
        const updates: any = {};
        if (giftCp && !isNaN(Number(giftCp))) {
          updates.rating = Math.max(0, (u.rating || 0) + Number(giftCp));
          updates.rank = calculateCpRank(updates.rating);
        }
        if (giftXp && !isNaN(Number(giftXp))) {
          updates.xp = Math.max(0, (u.xp || 0) + Number(giftXp));
        }

        if (Object.keys(updates).length > 0) {
          await userRepository.update(u.id, updates);
        }

        if (notificationRepository) {
          const notif = await notificationRepository.create({
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId: u.id,
            type: (giftXp || giftCp) ? NotificationType.ADMIN_REWARD : NotificationType.SYSTEM_MAIL,
            title: title.trim(),
            message: message.trim(),
            data: {
              giftXp: giftXp ? Number(giftXp) : undefined,
              giftCp: giftCp ? Number(giftCp) : undefined,
              sender: 'HQ Broadcast',
              isBroadcast: true,
            },
            isRead: false,
            createdAt: new Date().toISOString(),
          });

          const io = getIo?.();
          if (io) {
            io.to(`user:${u.id}`).emit(SocketEvents.NOTIFICATION_RECEIVED, notif);
          }
        }
      }

      res.json({
        success: true,
        message: `Broadcast successfully sent to ${regularUsers.length} operative(s)`,
        data: { recipientsCount: regularUsers.length },
      });
    } catch (error) {
      next(error);
    }
  });

  // 4.4 Reset User Progression Stats (Keep account, reset rating, XP, rank)
  router.post('/users/:id/reset-stats', async (req, res, next) => {
    try {
      const { id } = req.params;
      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updated = await userRepository.update(id, {
        rating: 1000,
        rank: Rank.INITIATE,
        xp: 0,
        level: 1,
        wins: 0,
        losses: 0,
        streak: 0,
        highestStreak: 0,
        highestRating: 1000,
        matchesPlayed: 0,
        dailyChallengeWins: 0,
        seasonalTier: 'Initiate',
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _p, ...safe } = updated;
      res.json({
        success: true,
        message: `Progression stats for @${targetUser.username} have been reset to starter values`,
        data: safe,
      });
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
        const io = getIo?.();
        if (io) {
          io.to('admin:channel').emit('admin:rooms_changed');
        }
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
