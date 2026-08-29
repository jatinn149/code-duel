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
      const { playerId } = req.query;
      if (!playerId || typeof playerId !== 'string') {
        throw new ValidationError('Player ID is required');
      }

      // Format validation: CD-XXXX-YYYY where X and Y are uppercase alphanumeric
      const playerIdRegex = /^CD-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      if (!playerIdRegex.test(playerId)) {
        throw new ValidationError('Invalid Player ID format (expected CD-XXXX-YYYY)');
      }

      const currentUserId = req.user!.id;
      const targetUser = await userRepository.findByPlayerId(playerId);
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
