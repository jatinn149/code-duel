import { User, DailyMission, MissionType } from '@code-duel/types';
import { IUserRepository, IDailyMissionRepository } from '@/repositories/interfaces';
import { PROGRESSION, RETENTION_XP } from '@code-duel/shared';
import { v4 as uuidv4 } from 'uuid';
import { ProgressionService } from './progression-service';

export class RetentionService {
  constructor(
    private userRepository: IUserRepository,
    private missionRepository: IDailyMissionRepository,
    private progressionService: ProgressionService
  ) {}

  /**
   * Generates a new set of 5 daily missions for a user.
   */
  async generateDailyMissions(userId: string, date: string): Promise<DailyMission[]> {
    const missions: DailyMission[] = [
      {
        id: uuidv4(),
        userId,
        type: MissionType.WIN_DUELS,
        description: 'Win 1 Duel',
        progress: 0,
        target: 1,
        xpReward: RETENTION_XP.DAILY_MISSION,
        completed: false,
        claimed: false,
        resetAt: date,
      },
      {
        id: uuidv4(),
        userId,
        type: MissionType.WIN_DUELS,
        description: 'Win 3 Duels',
        progress: 0,
        target: 3,
        xpReward: RETENTION_XP.DAILY_MISSION,
        completed: false,
        claimed: false,
        resetAt: date,
      },
      {
        id: uuidv4(),
        userId,
        type: MissionType.PLAY_MATCHES,
        description: 'Play 2 Matches',
        progress: 0,
        target: 2,
        xpReward: RETENTION_XP.DAILY_MISSION,
        completed: false,
        claimed: false,
        resetAt: date,
      },
      {
        id: uuidv4(),
        userId,
        type: MissionType.COMPLETE_CHALLENGE,
        description: 'Complete Daily Challenge',
        progress: 0,
        target: 1,
        xpReward: RETENTION_XP.DAILY_MISSION,
        completed: false,
        claimed: false,
        resetAt: date,
      },
      {
        id: uuidv4(),
        userId,
        type: MissionType.PERFECT_SOLVE,
        description: 'Solve without runtime error',
        progress: 0,
        target: 1,
        xpReward: RETENTION_XP.DAILY_MISSION,
        completed: false,
        claimed: false,
        resetAt: date,
      }
    ];

    return this.missionRepository.createMany(missions);
  }

  /**
   * Get missions for today, generating them if they don't exist.
   */
  async getDailyMissions(userId: string): Promise<DailyMission[]> {
    const date = new Date().toISOString().split('T')[0];
    const missions = await this.missionRepository.findByUserId(userId, date);
    
    if (missions.length === 0) {
      return this.generateDailyMissions(userId, date);
    }
    
    return missions;
  }

  /**
   * Update progress for a specific mission type.
   */
  async trackMissionProgress(userId: string, type: MissionType, amount = 1): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const missions = await this.missionRepository.findByUserId(userId, date);
    
    for (const mission of missions) {
      if (mission.type === type && !mission.completed) {
        await this.missionRepository.updateProgress(mission.id, amount);
      }
    }
  }

  /**
   * Claim a completed mission.
   */
  async claimMissionReward(userId: string, missionId: string): Promise<{ user: User; mission: DailyMission }> {
    const mission = await this.missionRepository.markClaimed(missionId);
    
    // Add XP to user
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const { level, xp } = this.progressionService.calculateLevelProgress(user.level, user.xp, mission.xpReward);
    
    const updatedUser = await this.userRepository.update(userId, { level, xp });
    
    return { user: updatedUser, mission };
  }

  /**
   * Evaluates streak based on daily wins.
   * Called during the daily reset or upon login if a day has passed.
   */
  async evaluateStreak(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const today = new Date().toISOString().split('T')[0];
    if (user.lastDailyResetAt && user.lastDailyResetAt.startsWith(today)) {
      return user; // Already evaluated today
    }

    let { streak: currentStreak, highestStreak, streakGraceAvailable, lastStreakResetAt } = user;
    const winsToday = user.dailyWins || 0;

    if (winsToday >= PROGRESSION.STREAK_WINS_REQUIRED) {
      currentStreak += 1;
      highestStreak = Math.max(highestStreak, currentStreak);
    } else {
      // Failed to meet requirements
      if (streakGraceAvailable > 0) {
        streakGraceAvailable -= 1; // Use grace
      } else {
        currentStreak = 0; // Reset streak
        lastStreakResetAt = today;
      }
    }

    // Refresh grace period every 7 days
    if (lastStreakResetAt) {
      const daysSinceReset = Math.floor((new Date().getTime() - new Date(lastStreakResetAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceReset >= PROGRESSION.STREAK_GRACE_REFRESH_DAYS) {
        streakGraceAvailable = 1;
        lastStreakResetAt = today; // Reset the counter for grace
      }
    } else {
      streakGraceAvailable = 1;
      lastStreakResetAt = today;
    }

    const updatedUser = await this.userRepository.update(userId, {
      streak: currentStreak,
      highestStreak,
      streakGraceAvailable,
      lastStreakResetAt,
      lastDailyResetAt: new Date().toISOString(),
      dailyWins: 0, // Reset for the new day
    });

    return updatedUser;
  }
}
