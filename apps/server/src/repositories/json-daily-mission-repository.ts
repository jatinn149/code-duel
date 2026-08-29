import { DailyMission } from '@code-duel/types';
import { IDailyMissionRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonDailyMissionRepository implements IDailyMissionRepository {
  private collection = 'daily-missions';

  constructor(private storage: JsonStorageAdapter) {}

  async findByUserId(userId: string, date: string): Promise<DailyMission[]> {
    const missions = await this.storage.read<DailyMission>(this.collection);
    return missions.filter((m) => m.userId === userId && m.resetAt.startsWith(date));
  }

  async updateProgress(missionId: string, progress: number): Promise<DailyMission> {
    let updatedMission: DailyMission | undefined;
    await this.storage.updateCollection<DailyMission>(this.collection, (missions) => {
      const index = missions.findIndex((m) => m.id === missionId);
      if (index === -1) throw new Error('Mission not found');

      missions[index] = {
        ...missions[index],
        progress: Math.min(missions[index].target, missions[index].progress + progress),
      };

      if (missions[index].progress >= missions[index].target) {
        missions[index].completed = true;
      }
      updatedMission = missions[index];
    });
    return updatedMission!;
  }

  async markClaimed(missionId: string): Promise<DailyMission> {
    let updatedMission: DailyMission | undefined;
    await this.storage.updateCollection<DailyMission>(this.collection, (missions) => {
      const index = missions.findIndex((m) => m.id === missionId);
      if (index === -1) throw new Error('Mission not found');

      if (!missions[index].completed) throw new Error('Mission not completed');

      missions[index] = {
        ...missions[index],
        claimed: true,
      };
      updatedMission = missions[index];
    });
    return updatedMission!;
  }

  async createMany(newMissions: DailyMission[]): Promise<DailyMission[]> {
    await this.storage.updateCollection<DailyMission>(this.collection, (missions) => {
      missions.push(...newMissions);
    });
    return newMissions;
  }
}
