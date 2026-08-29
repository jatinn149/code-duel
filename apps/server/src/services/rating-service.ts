import { prisma } from '../db';
import { jsonStorage } from '../storage/json-adapter';
import { logger } from '../utils/logger';
import { getCpKFactor, CP_CONFIG } from '@code-duel/shared';

export class RatingService {
  /**
   * Calculates the expected win probability of player A against player B
   */
  static getExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Retrieves the number of matches between two players in the last 24 hours
   * only counting competitive matches that had CP impacts.
   */
  static async getRecentMatchCount(playerA: string, playerB: string): Promise<number> {
    const isPgEnabled = !!process.env.DATABASE_URL;
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (isPgEnabled) {
      try {
        return await prisma.matchResult.count({
          where: {
            mode: { in: ['MULTI_ROUND', 'QUICKODE'] },
            players: {
              some: {
                ratingChange: { not: 0 }
              }
            },
            AND: [
              { players: { some: { userId: playerA } } },
              { players: { some: { userId: playerB } } }
            ],
            endedAt: { gte: past24Hours }
          }
        });
      } catch (err) {
        logger.error({ err, playerA, playerB }, 'Error querying recent match count from PG');
        return 0;
      }
    } else {
      try {
        const matches = await jsonStorage.read<any>('match-results');
        const cutoffTime = past24Hours.getTime();
        return matches.filter((m: any) => {
          const endedTime = new Date(m.endedAt).getTime();
          return (
            endedTime >= cutoffTime &&
            ['MULTI_ROUND', 'QUICKODE'].includes(m.mode) &&
            m.results.some((p: any) => p.userId === playerA) &&
            m.results.some((p: any) => p.userId === playerB) &&
            m.results.some((p: any) => p.ratingChange !== 0)
          );
        }).length;
      } catch (err) {
        logger.error({ err, playerA, playerB }, 'Error reading recent match count from JSON');
        return 0;
      }
    }
  }

  /**
   * Calculates Elo rating changes for two players based on outcomes and anti-abuse policies.
   * Kept for backward compatibility with 2-player match logic.
   */
  static async calculateRatings(
    playerA: { id: string; rating: number; status: string; placementMatchesPlayed?: number },
    playerB: { id: string; rating: number; status: string; placementMatchesPlayed?: number },
    winnerId?: string,
    mode?: string,
    isRanked: boolean = true
  ): Promise<{ ratingChangeA: number; ratingChangeB: number }> {
    const scoreA = winnerId === playerA.id ? 10 : (winnerId === undefined ? 5 : 0);
    const scoreB = winnerId === playerB.id ? 10 : (winnerId === undefined ? 5 : 0);

    const results = await this.calculateMultiplayerRatings(
      [
        {
          id: playerA.id,
          rating: playerA.rating,
          status: playerA.status,
          placementMatchesPlayed: playerA.placementMatchesPlayed ?? 0,
          score: scoreA
        },
        {
          id: playerB.id,
          rating: playerB.rating,
          status: playerB.status,
          placementMatchesPlayed: playerB.placementMatchesPlayed ?? 0,
          score: scoreB
        }
      ],
      mode || 'MULTI_ROUND',
      isRanked
    );

    const changeA = results.find(r => r.id === playerA.id)?.ratingChange ?? 0;
    const changeB = results.find(r => r.id === playerB.id)?.ratingChange ?? 0;

    return { ratingChangeA: changeA, ratingChangeB: changeB };
  }

  /**
   * General multiplayer Elo calculator using pairwise comparisons.
   * E = 1 / (1 + 10^((OpponentCP - PlayerCP) / 400))
   * delta = K * (Actual - Expected)
   * The pairwise deltas are averaged, multiplied by the mode multiplier,
   * capped at ±50, rounded to nearest integer, and clamped to a minimum of 0 CP.
   */
  static async calculateMultiplayerRatings(
    players: { id: string; rating: number; status: string; placementMatchesPlayed: number; score: number }[],
    mode: string,
    isRanked: boolean = true
  ): Promise<{ id: string; ratingChange: number; newRating: number }[]> {
    const results = players.map(p => ({ id: p.id, ratingChange: 0, newRating: p.rating }));

    // 1. CP calculation is completely disabled for unranked matches or Chaos Arena
    if (!isRanked || mode === 'CHAOS_ARENA') {
      return results;
    }

    const n = players.length;
    if (n < 2) return results;

    // 2. Ignore rating calculations if any player has not completed the match
    const allCompleted = players.every(p => p.status === 'completed');
    if (!allCompleted) {
      return results;
    }

    for (let i = 0; i < n; i++) {
      const pI = players[i];
      let sumDeltasForI = 0;

      const kI = getCpKFactor(pI.rating, pI.placementMatchesPlayed);

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const pJ = players[j];

        // Expected score of I against J
        const expectedIJ = 1 / (1 + Math.pow(10, (pJ.rating - pI.rating) / 400));

        // Actual outcome score
        let actualIJ = 0.5;
        if (pI.score > pJ.score) {
          actualIJ = 1.0;
        } else if (pI.score < pJ.score) {
          actualIJ = 0.0;
        }

        // Pairwise Elo delta
        let pairwiseDelta = kI * (actualIJ - expectedIJ);

        // Enforce anti-farming same-opponent limit (max 5 ranked matches per 24h)
        const recentMatchesCount = await this.getRecentMatchCount(pI.id, pJ.id);
        if (recentMatchesCount >= CP_CONFIG.ANTI_FARM_MAX_MATCHES_24H) {
          pairwiseDelta = 0;
        }

        sumDeltasForI += pairwiseDelta;
      }

      // Average pairwise deltas
      const avgDeltaI = sumDeltasForI / (n - 1);

      // Mode multiplier application
      let multiplier = 0.0;
      if (mode === 'MULTI_ROUND') {
        multiplier = CP_CONFIG.MULTI_ROUND_MULTIPLIER;
      } else if (mode === 'QUICKODE') {
        multiplier = CP_CONFIG.QUICKODE_RANKED_MULTIPLIER;
      }

      let finalDelta = avgDeltaI * multiplier;

      // Absolute CP movement limit cap (max 50)
      finalDelta = Math.max(-CP_CONFIG.MAX_MOVEMENT, Math.min(CP_CONFIG.MAX_MOVEMENT, finalDelta));

      // Round to nearest integer
      const roundedDelta = Math.round(finalDelta);

      // Floor CP at 0
      const newRating = Math.max(0, pI.rating + roundedDelta);
      const actualChange = newRating - pI.rating;

      const resIdx = results.findIndex(r => r.id === pI.id);
      if (resIdx !== -1) {
        results[resIdx].ratingChange = actualChange;
        results[resIdx].newRating = newRating;
      }
    }

    return results;
  }
}
