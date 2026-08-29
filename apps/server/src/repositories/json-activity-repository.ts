import { ActivityEvent } from '@code-duel/types';
import { IActivityRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonActivityRepository implements IActivityRepository {
  private collection = 'activities';

  constructor(private storage: JsonStorageAdapter) {}

  async create(event: ActivityEvent): Promise<ActivityEvent> {
    const activities = await this.storage.read<ActivityEvent>(this.collection);
    activities.unshift(event); // Newest first
    // Keep last 100 activities
    const trimmed = activities.slice(0, 100);
    await this.storage.write(this.collection, trimmed);
    return event;
  }

  async getGlobalFeed(limit: number): Promise<ActivityEvent[]> {
    const activities = await this.storage.read<ActivityEvent>(this.collection);
    return activities.slice(0, limit);
  }

  async getUserFeed(userId: string, limit: number): Promise<ActivityEvent[]> {
    const activities = await this.storage.read<ActivityEvent>(this.collection);
    return activities.filter((a) => a.userId === userId).slice(0, limit);
  }
}
