import { describe, it, expect, vi, beforeEach, Mock, afterAll } from 'vitest';
import { QuestionEngine } from '../services/question-engine';
import { GameMode, RoundType, Problem, ProblemType } from '@code-duel/types';
import { IProblemRepository } from '../repositories/interfaces';

vi.mock('../utils/redis-cache', () => {
  return {
    redisCache: {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    },
    CACHE_KEYS: {
      ALL_PROBLEMS: 'cache:problems:all',
    },
  };
});

import { redisCache, CACHE_KEYS } from '../utils/redis-cache';

describe('QuestionEngine', () => {
  let mockProblemRepository: IProblemRepository;
  let questionEngine: QuestionEngine;

  afterAll(async () => {
    await redisCache.quit().catch(() => {});
  });

  const mockProblems: Problem[] = [
    {
      id: 'p1',
      title: 'Implementation Easy',
      description: '',
      difficulty: 2,
      timeLimit: 1000,
      memoryLimit: 128,
      compatibleModes: [GameMode.MULTI_ROUND, GameMode.QUICKODE],
      compatibleRounds: [RoundType.SPEED],
      speedRating: 5,
      pressureRating: 2,
      estimatedSolveTimeSec: 60,
      tags: [],
      questionType: ProblemType.SIGNATURE_FUNCTION,
      questionFamilyId: 'f1',
    },
    {
      id: 'p2',
      title: 'Implementation Medium (Same Family)',
      description: '',
      difficulty: 5,
      timeLimit: 1000,
      memoryLimit: 128,
      compatibleModes: [GameMode.MULTI_ROUND, GameMode.QUICKODE],
      compatibleRounds: [RoundType.SPEED],
      speedRating: 5,
      pressureRating: 5,
      estimatedSolveTimeSec: 120,
      tags: [],
      questionType: ProblemType.SIGNATURE_FUNCTION,
      questionFamilyId: 'f1',
    },
    {
      id: 'p3',
      title: 'Debugging Hard',
      description: '',
      difficulty: 8,
      timeLimit: 1000,
      memoryLimit: 128,
      compatibleModes: [GameMode.MULTI_ROUND],
      compatibleRounds: [RoundType.DEBUG],
      speedRating: 2,
      pressureRating: 8,
      estimatedSolveTimeSec: 300,
      tags: [],
      questionType: ProblemType.DEBUGGING,
      questionFamilyId: 'f2',
    },
  ];

  beforeEach(async () => {
    await redisCache.del(CACHE_KEYS.ALL_PROBLEMS).catch(() => {});
    mockProblemRepository = {
      findAll: vi.fn().mockResolvedValue(mockProblems),
      findById: vi.fn(),
      create: vi.fn(),
      findByDifficulty: vi.fn(),
    };
    questionEngine = new QuestionEngine(mockProblemRepository);
  });

  it('allocates a compatible problem when history is empty', async () => {
    const problem = await questionEngine.allocateForMode(
      GameMode.MULTI_ROUND,
      RoundType.DEBUG
    );
    expect(problem?.id).toBe('p3');
  });

  it('avoids exact repeats with high penalty', async () => {
    // Both p1 and p2 match MULTI_ROUND + SPEED. 
    // Player played p1 recently. p2 should be picked.
    const histories = [[{
      problemId: 'p1',
      familyId: 'f1',
      modePlayed: GameMode.MULTI_ROUND,
      solvedAt: new Date().toISOString(),
      result: 'PASSED' as const,
      attempts: 1
    }]];
    
    const freshProblems = [
      ...mockProblems,
      {
        id: 'p4',
        title: 'Fresh Problem',
        description: '',
        difficulty: 3,
        timeLimit: 1000,
        memoryLimit: 128,
        compatibleModes: [GameMode.MULTI_ROUND],
        compatibleRounds: [RoundType.SPEED],
        speedRating: 5,
        pressureRating: 3,
        estimatedSolveTimeSec: 60,
        tags: [],
        questionType: ProblemType.SIGNATURE_FUNCTION,
        questionFamilyId: 'f3',
      }
    ];

    (mockProblemRepository.findAll as Mock).mockResolvedValue(freshProblems);

    const problem = await questionEngine.allocateForMode(
      GameMode.MULTI_ROUND,
      RoundType.SPEED,
      [],
      histories
    );
    expect(problem?.id).toBe('p4');
  });

  it('falls back to family repeat if no fresh problems exist', async () => {
    const histories = [[{
      problemId: 'p1',
      familyId: 'f1',
      modePlayed: GameMode.MULTI_ROUND,
      solvedAt: new Date().toISOString(),
      result: 'PASSED' as const,
      attempts: 1
    }]];

    const problem = await questionEngine.allocateForMode(
      GameMode.MULTI_ROUND,
      RoundType.SPEED,
      [],
      histories
    );
    expect(problem?.id).toBe('p2');
  });

  it('respects room excludeIds strictly', async () => {
    const problem = await questionEngine.allocateForMode(
      GameMode.MULTI_ROUND,
      RoundType.SPEED,
      ['p1']
    );
    expect(problem?.id).toBe('p2');
  });

  it('falls back to relaxing mode matching if no problems exist', async () => {
    const problem = await questionEngine.allocateForMode(
      GameMode.CHAOS_ARENA,
      RoundType.SPEED,
      ['p1', 'p2']
    );
    expect(problem?.id).toBe('p3');
  });

  it('considers target difficulty', async () => {
    const problem = await questionEngine.allocateForMode(
      GameMode.MULTI_ROUND,
      RoundType.SPEED,
      [],
      [],
      5
    );
    expect(problem?.id).toBe('p2');
  });
});
