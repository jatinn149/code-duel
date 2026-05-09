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
    const sessions = await this.storage.read<Session>(this.collection);
    sessions.push(session);
    await this.storage.write(this.collection, sessions);
    return session;
  }

  async update(id: string, data: Partial<Session>): Promise<Session> {
    const sessions = await this.storage.read<Session>(this.collection);
    const index = sessions.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Session with id ${id} not found`);
    }
    sessions[index] = { ...sessions[index], ...data };
    await this.storage.write(this.collection, sessions);
    return sessions[index];
  }

  async delete(id: string): Promise<void> {
    let sessions = await this.storage.read<Session>(this.collection);
    sessions = sessions.filter((s) => s.id !== id);
    await this.storage.write(this.collection, sessions);
  }

  async deleteByUserId(userId: string): Promise<void> {
    let sessions = await this.storage.read<Session>(this.collection);
    sessions = sessions.filter((s) => s.userId !== userId);
    await this.storage.write(this.collection, sessions);
  }
}
