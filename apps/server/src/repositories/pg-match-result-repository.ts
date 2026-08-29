import { IMatchResultRepository } from './interfaces';
import { MatchSummary } from '@code-duel/types';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export class PgMatchResultRepository implements IMatchResultRepository {
  async create(summary: MatchSummary): Promise<void> {
    await this.saveMatchWithLock(summary, true);
  }

  async saveMatchWithLock(summary: MatchSummary, applyMMR: boolean): Promise<boolean> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Idempotency Check
        const existingMatch = await tx.matchResult.findUnique({
          where: { roomId: summary.roomId }
        });

        if (existingMatch) {
          logger.warn({ roomId: summary.roomId }, 'Duplicate match finalization prevented');
          return false;
        }

        // 2. Insert Match Data
        const match = await tx.matchResult.create({
          data: {
            roomId: summary.roomId,
            mode: summary.mode || 'UNKNOWN',
            winnerId: summary.winnerId || null,
            startedAt: new Date(new Date(summary.endedAt).getTime() - summary.durationMs),
            endedAt: new Date(summary.endedAt),
            durationMs: summary.durationMs,
          },
        });

        for (const player of summary.results) {
          await tx.matchPlayerResult.create({
            data: {
              matchResultId: match.id,
              userId: player.userId,
              score: player.score,
              ratingChange: player.ratingChange,
              newRating: player.newRating,
              status: player.status,
            },
          });
          
          // 3. Atomic MMR update using incremental locking
          if (applyMMR && player.status !== 'disqualified') {
            const user = await tx.user.findUnique({ where: { id: player.userId } });
            if (user) {
              const updateData: Record<string, any> = {
                rating: player.newRating,
                matchesPlayed: { increment: 1 },
                wins: { increment: summary.winnerId === player.userId ? 1 : 0 },
                matchesWon: { increment: summary.winnerId === player.userId ? 1 : 0 },
                losses: { increment: summary.winnerId && summary.winnerId !== player.userId ? 1 : 0 },
                highestRating: Math.max(user.highestRating, player.newRating),
              };

              if (player.newLevel !== undefined) updateData.level = player.newLevel;
              if (player.newXp !== undefined) updateData.xp = player.newXp;
              if (player.newRank !== undefined) updateData.rank = player.newRank;
              if (player.placementMatchesPlayed !== undefined) updateData.placementMatchesPlayed = player.placementMatchesPlayed;
              if (player.seasonalTier !== undefined) updateData.seasonalTier = player.seasonalTier;
              if (player.newStreak !== undefined) {
                updateData.streak = player.newStreak;
                updateData.highestStreak = Math.max(user.highestStreak, player.newStreak);
              }

              await tx.user.update({
                 where: { id: player.userId },
                 data: updateData
              });
            }
          }
        }
        return true;
      }, {
        isolationLevel: 'Serializable', // Highest protection against concurrent finalizations
        maxWait: 5000,
        timeout: 10000
      });
    } catch (error) {
       logger.error({ error, roomId: summary.roomId }, 'Failed to save match with lock');
       throw error;
    }
  }

  async findByUserId(userId: string): Promise<MatchSummary[]> {
    const playerResults = await prisma.matchPlayerResult.findMany({
      where: { userId },
      include: {
        matchResult: {
          include: {
            players: {
              include: {
                user: {
                  select: { username: true }
                }
              }
            }
          }
        }
      },
      orderBy: { matchResult: { endedAt: 'desc' } },
    });

    return playerResults.map(pr => {
      const match = pr.matchResult;
      return {
        roomId: match.roomId,
        winnerId: match.winnerId || undefined,
        durationMs: match.durationMs,
        endedAt: match.endedAt.toISOString(),
        mode: match.mode,
        results: match.players.map(p => ({
          userId: p.userId,
          username: p.user.username,
          score: p.score,
          ratingChange: p.ratingChange,
          newRating: p.newRating,
          status: p.status as 'completed' | 'disconnected' | 'disqualified',
        })),
      };
    });
  }

  async findById(matchId: string): Promise<MatchSummary | null> {
    const match = await prisma.matchResult.findUnique({
      where: { roomId: matchId },
      include: {
        players: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      },
    });

    if (!match) return null;

    return {
        roomId: match.roomId,
        winnerId: match.winnerId || undefined,
        durationMs: match.durationMs,
        endedAt: match.endedAt.toISOString(),
        mode: match.mode,
        results: match.players.map(p => ({
          userId: p.userId,
          username: p.user.username,
          score: p.score,
          ratingChange: p.ratingChange,
          newRating: p.newRating,
          status: p.status as 'completed' | 'disconnected' | 'disqualified',
        })),
      };
  }
}
