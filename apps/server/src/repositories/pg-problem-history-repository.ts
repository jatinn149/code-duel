import { IProblemHistoryRepository } from './interfaces';
import { ProblemHistoryEntry, GameMode } from '@code-duel/types';
import { prisma } from '../db';

export class PgProblemHistoryRepository implements IProblemHistoryRepository {
  async create(entry: ProblemHistoryEntry & { userId: string }): Promise<void> {
    await prisma.problemHistory.create({
      data: {
        userId: entry.userId,
        problemId: entry.problemId,
        familyId: entry.familyId,
        modePlayed: entry.modePlayed,
        solvedAt: new Date(entry.solvedAt),
        result: entry.result,
        attempts: entry.attempts,
        completionSpeedMs: entry.completionSpeedMs || null,
      },
    });
  }

  async findByUserId(userId: string): Promise<(ProblemHistoryEntry & { userId: string })[]> {
    const history = await prisma.problemHistory.findMany({
      where: { userId },
      orderBy: { solvedAt: 'desc' },
    });
    
    return history.map(h => ({
      userId: h.userId,
      problemId: h.problemId,
      familyId: h.familyId || undefined,
      modePlayed: h.modePlayed as GameMode,
      solvedAt: h.solvedAt.toISOString(),
      result: h.result as 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR',
      attempts: h.attempts,
      completionSpeedMs: h.completionSpeedMs || undefined,
    }));
  }
}
