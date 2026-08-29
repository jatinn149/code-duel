import { Room, GameMode, Round, MatchRuleSet, RoundType } from '@code-duel/types';
import { QuestionEngine } from './question-engine';
import { MULTI_ROUND_CATEGORIES } from '../config/multi-round-config';

export class MultiRoundService {
  constructor(private questionEngine: QuestionEngine) {}

  async initializeRoom(room: Room): Promise<void> {
    room.gameMode = GameMode.MULTI_ROUND;
    room.ruleSet = MatchRuleSet.RANKED;
    room.powerupsEnabled = false;
    const totalRounds = room.totalRounds || 3;
    room.totalRounds = totalRounds;
    room.currentRound = 0;
    room.rounds = [];
    room.roundResults = [];
    
    // Extensible category pool selection
    const categoriesPool = MULTI_ROUND_CATEGORIES.map(c => c.name);
    const selected: string[] = [];
    
    let lastCategory: string | null = null;
    while (selected.length < totalRounds) {
      const shuffled = [...categoriesPool].sort(() => 0.5 - Math.random());
      
      // Prevent consecutive category duplication across cycle boundaries
      if (lastCategory && shuffled[0] === lastCategory && shuffled.length > 1) {
        const temp = shuffled[0];
        shuffled[0] = shuffled[1];
        shuffled[1] = temp;
      }
      
      selected.push(...shuffled);
      lastCategory = shuffled[shuffled.length - 1];
    }
    
    room.selectedCategories = selected.slice(0, totalRounds);
  }

  async generateNextRound(room: Room, playerHistories: import('@code-duel/types').ProblemHistoryEntry[][] = []): Promise<Round | null> {
    if (!room.totalRounds || (room.currentRound ?? 0) >= room.totalRounds) {
      return null;
    }

    const nextRoundIndex = (room.currentRound ?? 0) + 1;
    
    // Get selected category
    const categories = room.selectedCategories || [];
    const roundType = (categories[nextRoundIndex - 1] as RoundType) || RoundType.SPEED;
    
    // Exclude already used problems in the room
    const excludeIds = room.rounds?.map((r) => r.problemId) || [];
    const problem = await this.questionEngine.allocateForMode(GameMode.MULTI_ROUND, roundType, excludeIds, playerHistories);

    if (!problem) throw new Error(`Failed to allocate problem for round with category ${roundType}`);

    // Look up duration
    let roundDurationSeconds: number | undefined;
    try {
      const fs = require('fs');
      const path = require('path');
      const problemsPath = path.resolve(__dirname, '../../data/problems.json');
      if (fs.existsSync(problemsPath)) {
        const raw = fs.readFileSync(problemsPath, 'utf8');
        const json = JSON.parse(raw);
        const matchProblem = json.find((p: any) => String(p.id) === String(problem.id));
        if (matchProblem && typeof matchProblem.roundDurationSeconds === 'number') {
          roundDurationSeconds = matchProblem.roundDurationSeconds;
        }
      }
    } catch (err) {
      // safe fallback
    }

    const config = MULTI_ROUND_CATEGORIES.find(c => c.name === roundType);
    const duration = roundDurationSeconds || (problem as any).roundDurationSeconds || config?.durationSeconds || 300;

    const clientProblem = {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      initialCode: problem.initialCode || undefined,
    };

    const testCaseWeights: Record<string, number> = {};
    problem.testCases?.forEach((tc: any) => {
      const tcId = tc.id || tc.testCaseId || '';
      testCaseWeights[tcId] = tc.weight || 10;
    });

    const limit = problem.timeLimit || 2000;
    const efficiencyThresholds = (problem as any).efficiencyThresholds || {
      excellent: limit * 0.1,
      good: limit * 0.25,
      acceptable: limit * 0.5,
      nearLimit: limit * 0.8,
    };

    const newRound: Round = {
      roundIndex: nextRoundIndex,
      roundType,
      problemId: problem.id,
      duration,
      submissions: {},
      problem: clientProblem,
      metadata: {
        testCaseWeights,
        efficiencyThresholds,
        timeLimit: limit
      }
    };

    room.rounds = room.rounds || [];
    room.rounds.push(newRound);
    room.currentRound = nextRoundIndex;
    
    // Set the room problemId for legacy compatibility if needed
    room.problemId = problem.id;

    return newRound;
  }

  scoreRound(room: Room, roundIndex: number): void {
    const round = room.rounds?.find((r) => r.roundIndex === roundIndex);
    if (!round) return;

    const scores: Record<string, number> = {};
    let winnerId: string | undefined = undefined;
    let highestScore = -1;

    // Get testCaseWeights and efficiencyThresholds from metadata
    const testCaseWeights = round.metadata?.testCaseWeights || {};
    const efficiencyThresholds = round.metadata?.efficiencyThresholds;

    for (const [userId, sub] of Object.entries(round.submissions)) {
      // 1. Correctness Score (Max 800)
      let correctnessScore = 0;
      let isFullyCorrect = false;

      const testResults = sub.testResults || [];
      if (testResults.length > 0) {
        let passedWeight = 0;
        let totalWeight = 0;

        testResults.forEach((tr) => {
          const weight = testCaseWeights[tr.testCaseId] ?? 10;
          totalWeight += weight;
          if (tr.status === 'passed') {
            passedWeight += weight;
          }
        });

        if (totalWeight > 0) {
          correctnessScore = Math.round(800 * (passedWeight / totalWeight));
          isFullyCorrect = passedWeight === totalWeight;
        }
      } else {
        if (sub.status === 'passed' || sub.status === 'ACCEPTED') {
          correctnessScore = 800;
          isFullyCorrect = true;
        }
      }

      // 2. Efficiency Score (Max 120)
      let efficiencyScore = 0;
      if (isFullyCorrect) {
        const timeLimit = round.metadata?.timeLimit || 2000;
        const thresholds = efficiencyThresholds || {
          excellent: timeLimit * 0.1,
          good: timeLimit * 0.25,
          acceptable: timeLimit * 0.5,
          nearLimit: timeLimit * 0.8,
        };

        const runtime = sub.executionTimeMs || 0;
        if (runtime <= thresholds.excellent) {
          efficiencyScore = 120;
        } else if (runtime <= thresholds.good) {
          efficiencyScore = 90;
        } else if (runtime <= thresholds.acceptable) {
          efficiencyScore = 60;
        } else if (runtime <= thresholds.nearLimit) {
          efficiencyScore = 30;
        } else {
          efficiencyScore = 0;
        }
      }

      // 3. Solve Speed Score (Max 80)
      let speedScore = 0;
      if (isFullyCorrect && round.startedAt && sub.submittedAt) {
        const solveTimeSec = (new Date(sub.submittedAt).getTime() - new Date(round.startedAt).getTime()) / 1000;
        const durationSec = round.duration || 180;
        
        const timeRatio = Math.max(0, Math.min(1, solveTimeSec / durationSec));
        speedScore = Math.round(80 * (1 - timeRatio));
      }

      // 4. Total Round Score
      const totalRoundScore = Math.max(0, Math.min(1000, correctnessScore + efficiencyScore + speedScore));

      sub.correctnessScore = correctnessScore;
      sub.efficiencyScore = efficiencyScore;
      sub.speedScore = speedScore;
      sub.score = totalRoundScore;
      scores[userId] = totalRoundScore;

      if (totalRoundScore > highestScore) {
        highestScore = totalRoundScore;
        winnerId = userId;
      } else if (totalRoundScore === highestScore) {
        winnerId = undefined;
      }
    }

    round.winner = winnerId;
    
    room.roundResults = room.roundResults || [];
    const existingIndex = room.roundResults.findIndex(r => r.roundIndex === roundIndex);
    const resultObj = {
      roundIndex,
      winner: winnerId,
      scores,
    };
    
    if (existingIndex !== -1) {
      room.roundResults[existingIndex] = resultObj;
    } else {
      room.roundResults.push(resultObj);
    }
  }

  determineOverallWinner(room: Room): string | undefined {
    const cumulativeScore: Record<string, number> = {};
    const fullySolvedCount: Record<string, number> = {};
    const cumulativeCorrectness: Record<string, number> = {};
    const fullySolvedEfficiency: Record<string, number> = {};
    const fullySolvedSolveTime: Record<string, number> = {};

    room.players.forEach(p => {
      cumulativeScore[p.id] = 0;
      fullySolvedCount[p.id] = 0;
      cumulativeCorrectness[p.id] = 0;
      fullySolvedEfficiency[p.id] = 0;
      fullySolvedSolveTime[p.id] = 0;
    });

    room.rounds?.forEach((round) => {
      for (const player of room.players) {
        const sub = round.submissions[player.id];
        if (sub) {
          cumulativeScore[player.id] += sub.score || 0;
          cumulativeCorrectness[player.id] += sub.correctnessScore || 0;

          const isFullySolved = sub.correctnessScore !== undefined
            ? sub.correctnessScore === 800
            : (sub.status === 'passed' || sub.status === 'ACCEPTED');
          if (isFullySolved) {
            fullySolvedCount[player.id] += 1;
            fullySolvedEfficiency[player.id] += sub.efficiencyScore || 0;

            if (round.startedAt && sub.submittedAt) {
              const timeTakenMs = new Date(sub.submittedAt).getTime() - new Date(round.startedAt).getTime();
              fullySolvedSolveTime[player.id] += Math.max(0, timeTakenMs);
            }
          }
        }
      }
    });

    const comparePlayers = (a: string, b: string): number => {
      if (cumulativeScore[a] !== cumulativeScore[b]) {
        return cumulativeScore[b] - cumulativeScore[a];
      }
      if (fullySolvedCount[a] !== fullySolvedCount[b]) {
        return fullySolvedCount[b] - fullySolvedCount[a];
      }
      if (cumulativeCorrectness[a] !== cumulativeCorrectness[b]) {
        return cumulativeCorrectness[b] - cumulativeCorrectness[a];
      }
      if (fullySolvedEfficiency[a] !== fullySolvedEfficiency[b]) {
        return fullySolvedEfficiency[b] - fullySolvedEfficiency[a];
      }
      if (fullySolvedSolveTime[a] !== fullySolvedSolveTime[b]) {
        return fullySolvedSolveTime[a] - fullySolvedSolveTime[b];
      }
      return 0;
    };

    const playerIds = room.players.map(p => p.id);
    if (playerIds.length === 0) return undefined;
    if (playerIds.length === 1) return playerIds[0];

    const sorted = [...playerIds].sort(comparePlayers);

    if (comparePlayers(sorted[0], sorted[1]) === 0) {
      return undefined;
    }
    return sorted[0];
  }
}
