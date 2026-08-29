import { DuelInvite } from '@code-duel/types';
import { IDuelInviteRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonDuelInviteRepository implements IDuelInviteRepository {
  private collection = 'duel-invites';

  constructor(private storage: JsonStorageAdapter) {}

  async create(invite: DuelInvite): Promise<DuelInvite> {
    const invites = await this.storage.read<DuelInvite>(this.collection);
    invites.push(invite);
    await this.storage.write(this.collection, invites);
    return invite;
  }

  async getById(id: string): Promise<DuelInvite | null> {
    const invites = await this.storage.read<DuelInvite>(this.collection);
    return invites.find((i) => i.id === id) || null;
  }

  async updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED' | 'EXPIRED'): Promise<void> {
    const invites = await this.storage.read<DuelInvite>(this.collection);
    const index = invites.findIndex((i) => i.id === id);
    if (index !== -1) {
      invites[index].status = status;
      await this.storage.write(this.collection, invites);
    }
  }

  async getPendingForUser(userId: string): Promise<DuelInvite[]> {
    const invites = await this.storage.read<DuelInvite>(this.collection);
    const now = new Date().toISOString();
    return invites.filter(
      (i) => i.toUserId === userId && i.status === 'PENDING' && i.expiresAt > now,
    );
  }
}
