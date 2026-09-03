import { User, Rank } from '@code-duel/types';
import { IUserRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonUserRepository implements IUserRepository {
  private collection = 'users';

  constructor(private storage: JsonStorageAdapter) {}

  private normalize(user: User): User {
    return {
      ...user,
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      rank: user.rank ?? Rank.UNRANKED,
      wins: user.wins ?? user.matchesWon ?? 0,
      losses: user.losses ?? ((user.matchesPlayed || 0) - (user.wins ?? user.matchesWon ?? 0)),
      streak: Math.max(0, user.streak ?? 0),
      highestStreak: Math.max(0, user.highestStreak ?? user.streak ?? 0),
      highestRating: user.highestRating ?? user.rating ?? 0,
      dailyChallengeWins: user.dailyChallengeWins ?? 0,
      dailyChallengeBestRank: user.dailyChallengeBestRank ?? 0,
      dailyWins: user.dailyWins ?? 0,
      streakGraceAvailable: user.streakGraceAvailable ?? 1,
      lastStreakResetAt: user.lastStreakResetAt,
      lastDailyResetAt: user.lastDailyResetAt,
      placementMatchesPlayed: user.placementMatchesPlayed ?? 0,
      seasonalTier: user.seasonalTier ?? 'UNRANKED',
    };
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    const user = users.find((u) => u.id === id);
    return user ? this.normalize(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    const user = users.find((u) => u.email === email);
    return user ? this.normalize(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    const user = users.find((u) => u.username === username);
    return user ? this.normalize(user) : null;
  }

  async findByPlayerId(playerId: string): Promise<User | null> {
    const users = await this.storage.read<User>(this.collection);
    const user = users.find((u) => u.playerId === playerId);
    return user ? this.normalize(user) : null;
  }

  async create(user: User): Promise<User> {
    await this.storage.updateCollection<User>(this.collection, (users) => {
      users.push(user);
    });
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    let updatedUser: User | undefined;
    await this.storage.updateCollection<User>(this.collection, (users) => {
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) {
        throw new Error(`User with id ${id} not found`);
      }
      const merged = { ...users[index], ...data };
      if (data.streak !== undefined) merged.streak = Math.max(0, data.streak);
      if (data.highestStreak !== undefined) merged.highestStreak = Math.max(0, data.highestStreak);
      users[index] = merged;
      updatedUser = this.normalize(users[index]);
    });
    return updatedUser!;
  }

  async delete(id: string): Promise<void> {
    await this.storage.updateCollection<User>(this.collection, (users) => {
      const index = users.findIndex((u) => u.id === id);
      if (index !== -1) users.splice(index, 1);
    });
  }

  async search(query: string): Promise<User[]> {
    const users = await this.storage.read<User>(this.collection);
    const lowerQuery = query.toLowerCase();
    return users
      .filter((u) => u.username.toLowerCase().includes(lowerQuery))
      .map((u) => this.normalize(u))
      .slice(0, 10); // Limit search results
  }

  async findAll(): Promise<User[]> {
    const users = await this.storage.read<User>(this.collection);
    return users.map((u) => this.normalize(u));
  }
}
