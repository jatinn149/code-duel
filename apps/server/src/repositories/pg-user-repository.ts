import { IUserRepository } from './interfaces';
import { User, UserRole, Rank, PresenceStatus } from '@code-duel/types';
import { prisma } from '../db';
import { User as PrismaUser } from '@prisma/client';

export class PgUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.mapToDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? this.mapToDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? this.mapToDomain(user) : null;
  }

  async findByPlayerId(playerId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { playerId } });
    return user ? this.mapToDomain(user) : null;
  }

  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(this.mapToDomain);
  }

  async create(user: User): Promise<User> {
    const created = await prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        playerId: user.playerId,
        passwordHash: user.passwordHash,
        role: user.role,
        tokenVersion: user.tokenVersion,
        matchesPlayed: user.matchesPlayed,
        matchesWon: user.matchesWon,
        rating: user.rating,
        xp: user.xp,
        level: user.level,
        rank: user.rank,
        wins: user.wins,
        losses: user.losses,
        streak: user.streak,
        highestStreak: user.highestStreak,
        highestRating: user.highestRating,
        dailyChallengeWins: user.dailyChallengeWins,
        dailyChallengeBestRank: user.dailyChallengeBestRank,
        dailyWins: user.dailyWins,
        lastDailyWinAt: user.lastDailyWinAt ? new Date(user.lastDailyWinAt) : null,
        streakGraceAvailable: user.streakGraceAvailable,
        lastStreakResetAt: user.lastStreakResetAt ? new Date(user.lastStreakResetAt) : null,
        lastDailyResetAt: user.lastDailyResetAt ? new Date(user.lastDailyResetAt) : null,
        status: user.status,
        placementMatchesPlayed: user.placementMatchesPlayed ?? 0,
        seasonalTier: user.seasonalTier ?? 'UNRANKED',
      },
    });
    return this.mapToDomain(created);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // Map dates
    const updateData: Record<string, unknown> = { ...data };
    if (data.lastDailyWinAt !== undefined) updateData.lastDailyWinAt = data.lastDailyWinAt ? new Date(data.lastDailyWinAt) : null;
    if (data.lastStreakResetAt !== undefined) updateData.lastStreakResetAt = data.lastStreakResetAt ? new Date(data.lastStreakResetAt) : null;
    if (data.lastDailyResetAt !== undefined) updateData.lastDailyResetAt = data.lastDailyResetAt ? new Date(data.lastDailyResetAt) : null;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Ignore inline arrays (they are in separate tables now)
    delete updateData.solvedProblemHistory;
    delete updateData.playedQuestionFamilies;
    delete updateData.recentQuestionHistory;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async search(query: string): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
    return users.map(this.mapToDomain);
  }

  private mapToDomain(user: PrismaUser): User {
    return {
      ...user,
      role: user.role as UserRole,
      rank: user.rank as Rank,
      status: user.status as PresenceStatus,
      placementMatchesPlayed: user.placementMatchesPlayed ?? 0,
      seasonalTier: user.seasonalTier ?? 'UNRANKED',
      lastDailyWinAt: user.lastDailyWinAt?.toISOString(),
      lastStreakResetAt: user.lastStreakResetAt?.toISOString(),
      lastDailyResetAt: user.lastDailyResetAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
