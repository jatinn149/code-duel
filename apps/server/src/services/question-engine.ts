import { Problem, GameMode, RoundType, ProblemHistoryEntry } from '@code-duel/types';
import { IProblemRepository } from '@/repositories/interfaces';
import { redisCache, CACHE_KEYS, CACHE_TTL } from '@/utils/redis-cache';
import { logger } from '@/utils/logger';

export class QuestionEngine {
  constructor(private problemRepository: IProblemRepository) {}

  private async getCachedProblems(): Promise<Problem[]> {
    try {
      const cached = await redisCache.get(CACHE_KEYS.ALL_PROBLEMS);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      logger.error({ error: e }, 'Redis cache read failed in QuestionEngine');
    }

    const start = performance.now();
    const problems = await this.problemRepository.findAll();
    logger.debug({ durationMs: performance.now() - start, count: problems.length }, 'ProblemRepository.findAll duration');

    try {
      if (problems.length > 0) {
        await redisCache.setex(CACHE_KEYS.ALL_PROBLEMS, CACHE_TTL.PROBLEMS, JSON.stringify(problems));
      }
    } catch (e) {
      logger.error({ error: e }, 'Redis cache write failed in QuestionEngine');
    }

    return problems;
  }

  async allocateForMode(
    mode: GameMode,
    roundType: RoundType,
    excludeIds: string[] = [],
    playerHistories: ProblemHistoryEntry[][] = [],
    targetDifficulty?: number
  ): Promise<Problem | null> {
    const allocStart = performance.now();
    const allProblems = await this.getCachedProblems();
    
    // Efficient Set lookups
    const excludeSet = new Set(excludeIds);

    // 1. Initial Filtering for Mode & Round Compatibility
    const compatibleProblems = allProblems.filter(p => 
      p.compatibleModes.includes(mode) && 
      p.compatibleRounds.includes(roundType) &&
      !excludeSet.has(p.id)
    );

    let candidatePool = compatibleProblems;

    if (candidatePool.length === 0) {
      candidatePool = allProblems.filter(p => 
        p.compatibleModes.includes(mode) && 
        !excludeSet.has(p.id)
      );
    }

    if (candidatePool.length === 0) {
      candidatePool = allProblems.filter(p => !excludeSet.has(p.id));
    }
    
    if (candidatePool.length === 0) {
      candidatePool = allProblems;
    }

    if (candidatePool.length === 0) return null;

    // Fast mapping of histories
    const playedProblemIds = new Set<string>();
    const playedFamilyIds = new Set<string>();
    const recentPlayTimes = new Map<string, number>();

    const nowTime = Date.now();

    for (const playerHistory of playerHistories) {
       for (const h of playerHistory) {
          playedProblemIds.add(h.problemId);
          if (h.familyId) playedFamilyIds.add(h.familyId);
          
          const time = new Date(h.solvedAt).getTime();
          const existingTime = recentPlayTimes.get(h.problemId);
          if (!existingTime || time > existingTime) {
             recentPlayTimes.set(h.problemId, time);
          }
       }
    }

    // 2. Score Candidates
    // Lower score is better.
    let bestPenalty = Infinity;
    const scoredCandidates = candidatePool.map(p => {
      let penalty = 0;
      
      // Exact problem repeat
      if (playedProblemIds.has(p.id)) {
        penalty += 1000;
        
        // Recency penalty
        const recentTime = recentPlayTimes.get(p.id);
        if (recentTime) {
          const hoursSincePlayed = (nowTime - recentTime) / (1000 * 60 * 60);
          if (hoursSincePlayed < 24) penalty += 500;
        }
      }

      // Family repeat
      if (p.questionFamilyId && playedFamilyIds.has(p.questionFamilyId)) {
        penalty += 500;
      }

      // Difficulty penalty (if target is provided)
      if (targetDifficulty !== undefined) {
        penalty += Math.abs(p.difficulty - targetDifficulty) * 10;
      }

      if (penalty < bestPenalty) bestPenalty = penalty;

      return { problem: p, penalty };
    });

    // Pick from the top cluster (O(n) instead of sorting)
    const topCluster = [];
    for (let i = 0; i < scoredCandidates.length; i++) {
        if (scoredCandidates[i].penalty <= bestPenalty + 10) {
            topCluster.push(scoredCandidates[i]);
        }
    }
    
    const randomPick = topCluster[Math.floor(Math.random() * topCluster.length)];
    
    logger.debug({ durationMs: performance.now() - allocStart, problemId: randomPick.problem.id }, 'QuestionEngine allocation complete');

    return randomPick.problem;
  }
}
