import { MatchSummary } from '@code-duel/types';
import { IMatchResultRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';
import { logger } from '@/utils/logger';

export class JsonMatchResultRepository implements IMatchResultRepository {
  private collection = 'match-results';

  constructor(private storage: JsonStorageAdapter) {}

  async create(summary: MatchSummary): Promise<void> {
    await this.saveMatchWithLock(summary, true);
  }

  async saveMatchWithLock(summary: MatchSummary, applyMMR: boolean): Promise<boolean> {
    try {
      let isSaved = false;
      await this.storage.updateCollection<any>(this.collection, async (matches) => {
        const existing = matches.find((m: any) => m.roomId === summary.roomId);
        if (existing) {
          logger.warn({ roomId: summary.roomId }, 'Duplicate match finalization prevented (JSON)');
          return;
        }

        matches.push({
          id: summary.roomId,
          roomId: summary.roomId,
          mode: summary.mode || 'UNKNOWN',
          winnerId: summary.winnerId || null,
          endedAt: summary.endedAt,
          durationMs: summary.durationMs,
          results: summary.results,
        });
        isSaved = true;
      });

      if (!isSaved) return false;

      if (applyMMR) {
        await this.storage.updateCollection<any>('users', (users) => {
          for (const player of summary.results) {
            if (player.status === 'disqualified') continue;
            const user = users.find((u: any) => u.id === player.userId);
            if (user) {
              user.rating = player.newRating;
              user.matchesPlayed = (user.matchesPlayed || 0) + 1;
              user.wins = (user.wins || 0) + (summary.winnerId === player.userId ? 1 : 0);
              user.matchesWon = user.wins;
              user.losses = (user.losses || 0) + (summary.winnerId && summary.winnerId !== player.userId ? 1 : 0);
              user.highestRating = Math.max(user.highestRating || 0, player.newRating);

              if (player.newLevel !== undefined) user.level = player.newLevel;
              if (player.newXp !== undefined) user.xp = player.newXp;
              if (player.newRank !== undefined) user.rank = player.newRank;
              if (player.placementMatchesPlayed !== undefined) user.placementMatchesPlayed = player.placementMatchesPlayed;
              if (player.seasonalTier !== undefined) user.seasonalTier = player.seasonalTier;
              if (player.newStreak !== undefined) {
                user.streak = player.newStreak;
                user.highestStreak = Math.max(user.highestStreak || 0, player.newStreak);
              }
            }
          }
        });
      }

      return true;
    } catch (error) {
      logger.error({ error, roomId: summary.roomId }, 'Failed to save match in JSON storage');
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<MatchSummary[]> {
    const matches = await this.storage.read<any>(this.collection);
    return matches
      .filter((m: any) => m.results.some((p: any) => p.userId === userId))
      .map((m: any) => ({
        roomId: m.roomId,
        winnerId: m.winnerId || undefined,
        durationMs: m.durationMs,
        endedAt: m.endedAt,
        mode: m.mode,
        results: m.results,
      }));
  }

  async findById(matchId: string): Promise<MatchSummary | null> {
    const matches = await this.storage.read<any>(this.collection);
    const m = matches.find((x: any) => x.roomId === matchId);
    if (!m) return null;
    return {
      roomId: m.roomId,
      winnerId: m.winnerId || undefined,
      durationMs: m.durationMs,
      endedAt: m.endedAt,
      mode: m.mode,
      results: m.results,
    };
  }
}
