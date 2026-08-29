import { logger } from '@/utils/logger';
import { IDailyChallengeRepository, IProblemRepository } from '@/repositories/interfaces';
import { TierGroup, DailyChallenge } from '@code-duel/types';
import { v4 as uuidv4 } from 'uuid';

export class DailyResetEngine {
  private isResetting = false;

  constructor(
    private challengeRepository: IDailyChallengeRepository,
    private problemRepository: IProblemRepository
  ) {}

  /**
   * Initializes the scheduler to run exactly at UTC midnight.
   */
  startScheduler() {
    this.scheduleNextReset();
  }

  private scheduleNextReset() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0); // Next UTC midnight
    
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
    
    logger.info(`Next daily reset scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes.`);
    
    setTimeout(() => {
      this.executeReset().finally(() => this.scheduleNextReset());
    }, timeUntilMidnight);
  }

  /**
   * Executes the daily reset logic. Safe to call manually or on startup.
   */
  async executeReset() {
    if (this.isResetting) return;
    this.isResetting = true;
    
    logger.info('Starting daily reset sequence...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Generate Daily Challenges for all Tier Groups
      await this.ensureDailyChallenges(today);

      // Leaderboard and Missions reset implicitly via date-based filtering in repositories.
      // Streaks are evaluated lazily on user interaction (via RetentionService) to prevent massive DB spikes.

      logger.info('Daily reset sequence completed successfully.');
    } catch (error) {
      logger.error({ error }, 'Daily reset sequence failed.');
    } finally {
      this.isResetting = false;
    }
  }

  /**
   * Ensures that daily challenges exist for the given date across all tiers.
   */
  async ensureDailyChallenges(date: string) {
    const tiers = [TierGroup.BEGINNER, TierGroup.INTERMEDIATE, TierGroup.ADVANCED];
    
    for (const tier of tiers) {
      const existing = await this.challengeRepository.getCurrent(tier, date);
      if (!existing) {
        // Generate new
        let difficulty = 2; // Beginner
        if (tier === TierGroup.INTERMEDIATE) difficulty = 5;
        if (tier === TierGroup.ADVANCED) difficulty = 8;

        const problems = await this.problemRepository.findByDifficulty(difficulty);
        
        // Pick a random problem, ideally avoiding recent ones (simplified logic here)
        const problem = problems[Math.floor(Math.random() * problems.length)];
        
        if (problem) {
          const challenge: DailyChallenge = {
            id: uuidv4(),
            date,
            tierGroup: tier,
            problemId: String(problem.id),
            expiresAt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString()
          };
          
          await this.challengeRepository.create(challenge);
          logger.info(`Generated ${tier} daily challenge for ${date}`);
        }
      }
    }
  }
}
