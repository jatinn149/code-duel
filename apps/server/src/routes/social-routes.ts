import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '@/middleware/auth-middleware';
import { IUserRepository, IFriendRepository } from '@/repositories/interfaces';
import { ValidationError, NotFoundError } from '@/errors';

export const createSocialRouter = (
  userRepository: IUserRepository,
  friendRepository: IFriendRepository
) => {
  const router = Router();

  // Rate limiter specifically for search to prevent abuse
  const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 search requests per minute
    message: {
      success: false,
      message: 'Too many search requests. Please try again later.',
    },
  });

  router.get('/search', requireAuth(userRepository), searchLimiter, async (req, res, next) => {
    try {
      const rawQuery = (req.query.username || req.query.playerId || req.query.q) as string | undefined;
      if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
        throw new ValidationError('Username or Player ID is required');
      }

      const cleanQuery = rawQuery.trim().replace(/^@/, '');
      const currentUserId = req.user!.id;

      // Try finding by username first, then by Player ID
      let targetUser = await userRepository.findByUsername(cleanQuery);
      if (!targetUser) {
        targetUser = await userRepository.findByPlayerId(cleanQuery.toUpperCase());
      }
      if (!targetUser) {
        throw new NotFoundError('Player not found');
      }

      // Determine friendship state
      let relationshipState: 'None' | 'Pending Sent' | 'Pending Received' | 'Friends' = 'None';

      if (currentUserId !== targetUser.id) {
        const isFriend = await friendRepository.isFriend(currentUserId, targetUser.id);
        if (isFriend) {
          relationshipState = 'Friends';
        } else {
          const sentPending = await friendRepository.hasPendingRequest(currentUserId, targetUser.id);
          if (sentPending) {
            relationshipState = 'Pending Sent';
          } else {
            const receivedPending = await friendRepository.hasPendingRequest(targetUser.id, currentUserId);
            if (receivedPending) {
              relationshipState = 'Pending Received';
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          id: targetUser.id,
          username: targetUser.username,
          playerId: targetUser.playerId,
          rank: targetUser.rank,
          rating: targetUser.rating,
          wins: targetUser.wins,
          losses: targetUser.losses,
          streak: targetUser.streak,
          relationshipState,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/summary/:userId', requireAuth(userRepository), async (req, res, next) => {
    try {
      const currentUserId = req.user!.id;
      const targetUserId = req.params.userId;

      const targetUser = await userRepository.findById(targetUserId);
      if (!targetUser) {
        throw new NotFoundError('Player not found');
      }

      // Determine friendship state
      let relationshipState: 'None' | 'Pending Sent' | 'Pending Received' | 'Friends' | 'Self' = 'None';

      if (currentUserId === targetUserId) {
        relationshipState = 'Self';
      } else {
        const isFriend = await friendRepository.isFriend(currentUserId, targetUserId);
        if (isFriend) {
          relationshipState = 'Friends';
        } else {
          const sentPending = await friendRepository.hasPendingRequest(currentUserId, targetUserId);
          if (sentPending) {
            relationshipState = 'Pending Sent';
          } else {
            const receivedPending = await friendRepository.hasPendingRequest(targetUserId, currentUserId);
            if (receivedPending) {
              relationshipState = 'Pending Received';
            }
          }
        }
      }

      // Calculate win rate
      const winRate = targetUser.matchesPlayed > 0 
        ? Math.round((targetUser.wins / targetUser.matchesPlayed) * 100)
        : 0;

      res.json({
        success: true,
        data: {
          id: targetUser.id,
          username: targetUser.username,
          playerId: targetUser.playerId,
          rank: targetUser.rank,
          rating: targetUser.rating,
          wins: targetUser.wins,
          losses: targetUser.losses,
          streak: targetUser.streak,
          matchesPlayed: targetUser.matchesPlayed,
          winRate,
          status: targetUser.status,
          relationshipState,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
