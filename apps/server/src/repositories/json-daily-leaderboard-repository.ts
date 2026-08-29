import { DailyLeaderboardEntry } from '@code-duel/types';
import { IDailyLeaderboardRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonDailyLeaderboardRepository implements IDailyLeaderboardRepository {
  private collection = 'daily-leaderboard';

  constructor(private storage: JsonStorageAdapter) {}

  async getLeaderboard(tierGroup: string, date: string): Promise<DailyLeaderboardEntry[]> {
    const entries = await this.storage.read<DailyLeaderboardEntry>(this.collection);
    
    // Filter for tier group and date (assuming submittedAt starts with date)
    const filtered = entries.filter((e) => e.tierGroup === tierGroup && e.submittedAt.startsWith(date));
    
    // Sort logic prioritizing:
    // 1. Fastest solve time
    // 2. Earliest submission timestamp (implicitly tied to submittedAt, but solveTimeMs is primary)
    // Correctness is assumed as only accepted submissions are recorded here.
    filtered.sort((a, b) => {
      if (a.solveTimeMs !== b.solveTimeMs) {
        return a.solveTimeMs - b.solveTimeMs;
      }
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

    // Assign dynamic ranks based on sorted order
    return filtered.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  async submit(entry: DailyLeaderboardEntry): Promise<void> {
    const entries = await this.storage.read<DailyLeaderboardEntry>(this.collection);
    
    const date = entry.submittedAt.split('T')[0];
    const existingIndex = entries.findIndex(e => e.userId === entry.userId && e.submittedAt.startsWith(date));
    
    if (existingIndex !== -1) {
      // Only keep the first accepted submission per user per day.
      // So if it exists, we DO NOT overwrite it. (As per "first accepted submission" rule).
      return; 
    }
    
    entries.push(entry);
    await this.storage.write(this.collection, entries);
  }

  async getEntry(userId: string, date: string): Promise<DailyLeaderboardEntry | null> {
    const entries = await this.storage.read<DailyLeaderboardEntry>(this.collection);
    const entry = entries.find((e) => e.userId === userId && e.submittedAt.startsWith(date));
    
    if (!entry) return null;
    
    // Need to calculate rank by grabbing the whole leaderboard for the tier
    const leaderboard = await this.getLeaderboard(entry.tierGroup, date);
    return leaderboard.find(e => e.userId === userId) || null;
  }
}
