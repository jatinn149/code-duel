import { User, Rank } from '@code-duel/types';
import { IUserRepository } from '@/repositories/interfaces';
import { logger } from '@/utils/logger';
import { getXpForLevel, calculateCpRank } from '@code-duel/shared';

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
    
    // Streak logic
    const newStreak = result.isWin 
      ? (user.streak > 0 ? user.streak + 1 : 1)
      : (user.streak < 0 ? user.streak - 1 : -1);

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
      level: newLevel,
      xp: newXp,
      rank: newRank,
      placementMatchesPlayed: newPlacementMatches,
      updatedAt: new Date().toISOString(),
    });

    logger.info(
      { userId, rating: newRating, rank: newRank, level: newLevel, placementMatchesPlayed: newPlacementMatches },
      'User progression updated'
    );

    return updatedUser;
  }
}
