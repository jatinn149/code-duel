import { IProblemRepository } from './interfaces';
import { Problem, ProblemType, GameMode, RoundType, DifficultyTier } from '@code-duel/types';
import { prisma } from '../db';
import { Problem as PrismaProblem } from '@prisma/client';

export class PgProblemRepository implements IProblemRepository {
  async findById(id: string): Promise<Problem | null> {
    const problem = await prisma.problem.findUnique({ where: { id } });
    return problem ? this.mapToDomain(problem) : null;
  }

  async findAll(): Promise<Problem[]> {
    const problems = await prisma.problem.findMany();
    return problems.map(this.mapToDomain);
  }

  async create(problem: Problem): Promise<Problem> {
    const created = await prisma.problem.create({
      data: {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        compatibleModes: problem.compatibleModes,
        compatibleRounds: problem.compatibleRounds,
        speedRating: problem.speedRating,
        pressureRating: problem.pressureRating,
        estimatedSolveTimeSec: problem.estimatedSolveTimeSec,
        tags: problem.tags,
        questionType: problem.questionType,
        questionFamilyId: problem.questionFamilyId,
        realWorldDomain: problem.realWorldDomain,
        initialCode: problem.initialCode,
        solutionCode: problem.solutionCode,
        testCases: problem.testCases as any,
      },
    });
    return this.mapToDomain(created);
  }

  async findByDifficulty(difficulty: number): Promise<Problem[]> {
    const problems = await prisma.problem.findMany({
      where: { difficulty },
    });
    return problems.map(this.mapToDomain);
  }

  private mapToDomain(problem: PrismaProblem): Problem {
    return {
      ...problem,
      questionFamilyId: problem.questionFamilyId || '',
      realWorldDomain: problem.realWorldDomain || undefined,
      initialCode: problem.initialCode || undefined,
      solutionCode: problem.solutionCode || undefined,
      testCases: (problem.testCases as any) || undefined,
      compatibleModes: problem.compatibleModes as GameMode[],
      compatibleRounds: problem.compatibleRounds as RoundType[],
      questionType: problem.questionType as ProblemType,
      difficulty: problem.difficulty as DifficultyTier,
    };
  }
}
