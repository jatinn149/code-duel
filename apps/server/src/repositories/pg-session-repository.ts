import { Session } from '@code-duel/types';
import { ISessionRepository } from './interfaces';
import { prisma } from '../db';
import { Session as PrismaSession } from '@prisma/client';

export class PgSessionRepository implements ISessionRepository {
  async findById(id: string): Promise<Session | null> {
    const session = await prisma.session.findUnique({ where: { id } });
    return session ? this.mapToDomain(session) : null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const sessions = await prisma.session.findMany({ where: { userId } });
    return sessions.map(this.mapToDomain);
  }

  async create(session: Session): Promise<Session> {
    const created = await prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        userAgent: session.userAgent || null,
        ipAddress: session.ipAddress || null,
        expiresAt: new Date(session.expiresAt),
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
        createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
      },
    });
    return this.mapToDomain(created);
  }

  async update(id: string, data: Partial<Session>): Promise<Session> {
    const updateData: Record<string, any> = { ...data };
    if (data.expiresAt !== undefined) updateData.expiresAt = new Date(data.expiresAt);
    if (data.revokedAt !== undefined) updateData.revokedAt = data.revokedAt ? new Date(data.revokedAt) : null;
    if (data.createdAt !== undefined) updateData.createdAt = new Date(data.createdAt);
    delete updateData.id;

    try {
      const updated = await prisma.session.update({
        where: { id },
        data: updateData,
      });
      return this.mapToDomain(updated);
    } catch (err: any) {
      if (err.code === 'P2025') {
        return {
          id,
          userId: data.userId || '',
          refreshTokenHash: data.refreshTokenHash || '',
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          expiresAt: data.expiresAt || new Date().toISOString(),
          revokedAt: data.revokedAt || new Date().toISOString(),
          createdAt: data.createdAt || new Date().toISOString(),
        };
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.session.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return;
      }
      throw err;
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  }

  private mapToDomain(session: PrismaSession): Session {
    return {
      id: session.id,
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      userAgent: session.userAgent || undefined,
      ipAddress: session.ipAddress || undefined,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() || undefined,
      createdAt: session.createdAt.toISOString(),
    };
  }
}
