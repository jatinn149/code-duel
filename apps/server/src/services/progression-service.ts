import { User, Rank } from '@code-duel/types';
import { IUserRepository } from '@/repositories/interfaces';
import { logger } from '@/utils/logger';
import { getXpForLevel, calculateCpRank } from '@code-duel/shared';

export function calculateDailyStreak(currentStreak: number, lastActiveAt?: string | null): number {
  const current = Math.max(0, currentStreak || 0);
  if (!lastActiveAt) return 1;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const lastDate = new Date(lastActiveAt);
  lastDate.setUTCHours(0, 0, 0, 0);

  const diffMs = today.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Already active today: maintain active streak
    return Math.max(1, current);
  } else if (diffDays === 1) {
    // Consecutive day activity: increment streak
    return Math.max(1, current + 1);
  } else {
    // Missed a day or more: starts a new streak today
    return 1;
  }
}

export class ProgressionService {
  constructor(private userRepository: IUserRepository) {}

  /**
   * Calculate rank based on Coder Points using centralized calculateCpRank helper
   */
  calculateRank(rating: number, _matchesPlayed: number): Rank {
    return calculateCpRank(rating) as Rank;
  }

  /**
   * Add XP and handle level up
   */
  calculateLevelProgress(currentLevel: number, currentXp: number, xpToAdd: number): { level: number; xp: number } {
    let level = currentLevel;
    let xp = currentXp + xpToAdd;

    while (xp >= getXpForLevel(level)) {
      xp -= getXpForLevel(level);
      level++;
    }

    return { level, xp };
  }

  /**
   * Update user stats after a match
   */
  async updateMatchStats(
    userId: string,
    result: {
      isWin: boolean;
      ratingChange: number;
      xpGain: number;
      isRanked?: boolean;
    }
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const newMatchesPlayed = user.matchesPlayed + 1;
    const newWins = result.isWin ? user.wins + 1 : user.wins;
    const newLosses = result.isWin ? user.losses : user.losses + 1;
    const newRating = Math.max(0, user.rating + result.ratingChange);
    const newHighestRating = Math.max(user.highestRating, newRating);

    // Daily Coding Streak logic (never reset to 0 on match loss; competing in a duel maintains/extends daily streak)
    const currentStreak = Math.max(0, user.streak || 0);
    const lastActive = user.lastDailyWinAt || user.lastDailyResetAt;
    const newStreak = calculateDailyStreak(currentStreak, lastActive);
    const newHighestStreak = Math.max(user.highestStreak || 0, newStreak);
    const newDailyWins = result.isWin ? (user.dailyWins || 0) + 1 : (user.dailyWins || 0);
    const nowIso = new Date().toISOString();

    const { level: newLevel, xp: newXp } = this.calculateLevelProgress(user.level, user.xp, result.xpGain);
    const newRank = this.calculateRank(newRating, newMatchesPlayed);

    // Track placement matches
    let newPlacementMatches = user.placementMatchesPlayed ?? 0;
    if (result.isRanked !== false && result.ratingChange !== 0) {
      newPlacementMatches = Math.min(10, newPlacementMatches + 1);
    }

    const updatedUser = await this.userRepository.update(userId, {
      matchesPlayed: newMatchesPlayed,
      matchesWon: newWins, // Sync with wins for compatibility
      wins: newWins,
      losses: newLosses,
      rating: newRating,
      highestRating: newHighestRating,
      streak: newStreak,
      highestStreak: newHighestStreak,
      dailyWins: newDailyWins,
      lastDailyWinAt: result.isWin ? nowIso : (user.lastDailyWinAt || nowIso),
      lastDailyResetAt: nowIso,
      level: newLevel,
      xp: newXp,
      rank: newRank,
      placementMatchesPlayed: newPlacementMatches,
      updatedAt: nowIso,
    });

    logger.info(
      { userId, rating: newRating, rank: newRank, level: newLevel, placementMatchesPlayed: newPlacementMatches },
      'User progression updated'
    );

    return updatedUser;
  }
}
