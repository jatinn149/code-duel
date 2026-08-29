import { Session } from '@code-duel/types';
import { ISessionRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonSessionRepository implements ISessionRepository {
  private collection = 'sessions';

  constructor(private storage: JsonStorageAdapter) {}

  async findById(id: string): Promise<Session | null> {
    const sessions = await this.storage.read<Session>(this.collection);
    return sessions.find((s) => s.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const sessions = await this.storage.read<Session>(this.collection);
    return sessions.filter((s) => s.userId === userId);
  }

  async create(session: Session): Promise<Session> {
    await this.storage.updateCollection<Session>(this.collection, (sessions) => {
      sessions.push(session);
    });
    return session;
  }

  async update(id: string, data: Partial<Session>): Promise<Session> {
    let updatedSession: Session | undefined;
    await this.storage.updateCollection<Session>(this.collection, (sessions) => {
      const index = sessions.findIndex((s) => s.id === id);
      if (index === -1) {
        throw new Error(`Session with id ${id} not found`);
      }
      sessions[index] = { ...sessions[index], ...data };
      updatedSession = sessions[index];
    });
    return updatedSession!;
  }

  async delete(id: string): Promise<void> {
    await this.storage.updateCollection<Session>(this.collection, (sessions) => {
      const index = sessions.findIndex((s) => s.id === id);
      if (index !== -1) sessions.splice(index, 1);
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.storage.updateCollection<Session>(this.collection, (sessions) => {
      for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].userId === userId) {
          sessions.splice(i, 1);
        }
      }
    });
  }
}
