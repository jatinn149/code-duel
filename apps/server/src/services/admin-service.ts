import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, PresenceStatus, Rank } from '@code-duel/types';
import { IUserRepository } from '@/repositories/interfaces';
import { logger } from '@/utils/logger';
import { redisCache } from '@/utils/redis-cache';
import { jsonStorage } from '@/storage/json-adapter';

export const ADMIN_EMAIL = 'admin@codeduel.io';
export const ADMIN_USERNAME = 'admin';
export const ADMIN_DEFAULT_PASSWORD = 'Admin@123456';

export async function ensureAdminUser(userRepository: IUserRepository): Promise<User> {
  try {
    const existingByEmail = await userRepository.findByEmail(ADMIN_EMAIL);
    if (existingByEmail) {
      if (existingByEmail.role !== UserRole.ADMIN) {
        return await userRepository.update(existingByEmail.id, { role: UserRole.ADMIN });
      }
      return existingByEmail;
    }

    const existingByUsername = await userRepository.findByUsername(ADMIN_USERNAME);
    if (existingByUsername) {
      if (existingByUsername.role !== UserRole.ADMIN) {
        return await userRepository.update(existingByUsername.id, { role: UserRole.ADMIN });
      }
      return existingByUsername;
    }

    const passwordHash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 12);
    const now = new Date().toISOString();

    const adminUser: User = {
      id: uuidv4(),
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      playerId: 'ADM-0001',
      passwordHash,
      role: UserRole.ADMIN,
      tokenVersion: 0,
      matchesPlayed: 100,
      matchesWon: 100,
      rating: 2500,
      xp: 99999,
      level: 99,
      rank: Rank.GRANDMASTER as any,
      wins: 100,
      losses: 0,
      streak: 99,
      highestStreak: 99,
      highestRating: 2500,
      dailyChallengeWins: 50,
      dailyChallengeBestRank: 1,
      dailyWins: 50,
      placementMatchesPlayed: 10,
      seasonalTier: 'GRANDMASTER',
      streakGraceAvailable: 3,
      status: PresenceStatus.OFFLINE,
      createdAt: now,
      updatedAt: now,
    };

    const created = await userRepository.create(adminUser);
    logger.info('👑 Super Admin account successfully provisioned: admin@codeduel.io / admin');
    return created;
  } catch (err: any) {
    logger.error({ err }, 'Failed to ensure admin user');
    throw err;
  }
}

function isPortReachable(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket
      .connect(port, host, () => {
        socket.end();
        resolve(true);
      })
      .on('error', () => {
        socket.destroy();
        resolve(false);
      })
      .on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
  });
}

export async function clearUserDatabase(
  userRepository: IUserRepository,
  options: { keepAdmin?: boolean } = { keepAdmin: true }
): Promise<{ deletedUsersCount: number; message: string }> {
  let deletedCount = 0;
  const isPostgresRunning = await isPortReachable(5432);
  const isPgEnabled = !!process.env.DATABASE_URL && isPostgresRunning;

  // 1. Clear relational database if PostgreSQL is enabled
  if (isPgEnabled) {
    try {
      const { prisma } = await import('@/db');
      await prisma.matchPlayerResult.deleteMany({});
      await prisma.problemHistory.deleteMany({});
      await prisma.friendRequest.deleteMany({});
      await prisma.friendship.deleteMany({});
      await prisma.session.deleteMany({});
      await prisma.matchResult.deleteMany({});

      if (options.keepAdmin) {
        const res = await prisma.user.deleteMany({
          where: {
            NOT: {
              role: UserRole.ADMIN,
            },
          },
        });
        deletedCount += res.count;
      } else {
        const res = await prisma.user.deleteMany({});
        deletedCount += res.count;
      }
    } catch (pgErr: any) {
      logger.warn({ pgErr }, 'Postgres clear attempt failed, falling back to repository level wipe');
    }
  }

  // 2. Clear JSON storage collections
  try {
    const allUsers = await userRepository.findAll();
    for (const u of allUsers) {
      if (options.keepAdmin && u.role === UserRole.ADMIN) continue;
      await userRepository.delete(u.id);
      deletedCount++;
    }

    await jsonStorage.write('sessions', []);
    await jsonStorage.write('activities', []);
    await jsonStorage.write('match-results', []);
    await jsonStorage.write('duel-invites', []);
  } catch (jsonErr: any) {
    logger.warn({ jsonErr }, 'JSON storage clear error');
  }

  // 3. Clear Redis keys for usernames, active rooms, leaderboards, and presence (if Redis is running)
  if (redisCache.status === 'ready') {
    try {
      const patternPrefixes = [
        'username_taken:*',
        'player_to_room:*',
        'daily_solved:*',
        'daily_leaderboard:*',
        'user_friends:*',
        'presence:*',
      ];

      for (const prefix of patternPrefixes) {
        const keys = await redisCache.keys(prefix);
        if (keys && keys.length > 0) {
          await redisCache.del(...keys);
        }
      }
    } catch (redisErr: any) {
      logger.warn({ redisErr }, 'Redis purge warning during clearUserDatabase');
    }
  }

  // 4. Ensure Super Admin account is intact
  await ensureAdminUser(userRepository);

  return {
    deletedUsersCount: deletedCount,
    message: 'User database purged successfully. Super Admin account preserved.',
  };
}

export async function flushAllRedisCache(): Promise<{ flushed: boolean }> {
  try {
    await redisCache.flushdb();
    return { flushed: true };
  } catch (err: any) {
    logger.error({ err }, 'Failed to flush Redis');
    throw err;
  }
}
