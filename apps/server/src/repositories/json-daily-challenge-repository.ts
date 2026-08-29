import { DailyChallenge } from '@code-duel/types';
import { IDailyChallengeRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonDailyChallengeRepository implements IDailyChallengeRepository {
  private collection = 'daily-challenges';

  constructor(private storage: JsonStorageAdapter) {}

  async getCurrent(tierGroup: string, date: string): Promise<DailyChallenge | null> {
    const challenges = await this.storage.read<DailyChallenge>(this.collection);
    return challenges.find((c) => c.tierGroup === tierGroup && c.date === date) || null;
  }

  async create(challenge: DailyChallenge): Promise<DailyChallenge> {
    const challenges = await this.storage.read<DailyChallenge>(this.collection);
    challenges.push(challenge);
    await this.storage.write(this.collection, challenges);
    return challenge;
  }

  async getHistory(tierGroup: string, limit: number): Promise<DailyChallenge[]> {
    const challenges = await this.storage.read<DailyChallenge>(this.collection);
    return challenges
      .filter((c) => c.tierGroup === tierGroup)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }
}
