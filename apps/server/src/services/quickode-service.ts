import { Room, GameMode, RoundType, Round, MatchRuleSet } from '@code-duel/types';
import { QuestionEngine } from './question-engine';

export class QuickodeService {
  constructor(private questionEngine: QuestionEngine) {}

  async initializeRoom(room: Room, durationOptions: { duration: number }): Promise<void> {
    room.gameMode = GameMode.QUICKODE;
    room.ruleSet = room.ruleSet || MatchRuleSet.RANKED;
    room.powerupsEnabled = false;
    room.totalRounds = 1;
    room.currentRound = 0;
    room.rounds = [];
    room.roundResults = [];
    // Store duration in room metadata for round generation
    room.roundTimer = { duration: durationOptions.duration || 120 }; 
  }

  async generateNextRound(room: import('@code-duel/types').Room, playerHistories: import('@code-duel/types').ProblemHistoryEntry[][] = []): Promise<Round | null> {
    if (!room.totalRounds || (room.currentRound ?? 0) >= room.totalRounds) {
      return null;
    }

    const nextRoundIndex = (room.currentRound ?? 0) + 1;
    // Quickode is generally SPEED type or FAST_DEBUGGING
    const roundType = RoundType.SPEED; 
    const duration = room.roundTimer?.duration || 120;

    // Exclude already used problems if we implement rematch
    const excludeIds = room.rounds?.map((r) => r.problemId) || [];
    const problem = await this.questionEngine.allocateForMode(GameMode.QUICKODE, roundType, excludeIds, playerHistories);

    if (!problem) throw new Error('Failed to allocate problem for Quickode');

    const clientProblem = {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      initialCode: problem.initialCode || undefined,
    };

    const newRound: Round = {
      roundIndex: nextRoundIndex,
      roundType,
      problemId: problem.id,
      duration,
      submissions: {},
      problem: clientProblem,
    };

    room.rounds = room.rounds || [];
    room.rounds.push(newRound);
    room.currentRound = nextRoundIndex;
    room.problemId = problem.id;

    return newRound;
  }

  scoreRound(room: Room, roundIndex: number): void {
    const round = room.rounds?.find((r) => r.roundIndex === roundIndex);
    if (!round) return;

    const scores: Record<string, number> = {};
    let winnerId: string | undefined = undefined;
    let highestScore = -1;
    let bestCorrectness = -1;
    let lowestRuntime = Infinity;
    let earliestSubmission = Infinity;

    for (const [userId, sub] of Object.entries(round.submissions)) {
      const testResults = sub.testResults || [];
      const totalCount = testResults.length > 0 ? testResults.length : 1;
      const passedCount = testResults.filter(t => t.status === 'passed').length;
      const isFullyCorrect = passedCount === totalCount && (sub.status === 'ACCEPTED' || sub.status === 'passed');

      // 1. Correctness Score (0 - 800 PTS)
      let correctnessScore = 0;
      if (testResults.length > 0) {
        correctnessScore = Math.round(800 * (passedCount / totalCount));
      } else if (isFullyCorrect) {
        correctnessScore = 800;
      }

      // 2. Efficiency Score (0 - 120 PTS based on runtime vs 2000ms standard limit)
      let efficiencyScore = 0;
      const runtime = sub.executionTimeMs || 0;
      if (isFullyCorrect) {
        if (runtime <= 100) {
          efficiencyScore = 120;
        } else if (runtime <= 300) {
          efficiencyScore = 90;
        } else if (runtime <= 800) {
          efficiencyScore = 60;
        } else if (runtime <= 1500) {
          efficiencyScore = 30;
        } else {
          efficiencyScore = 10;
        }
      }

      // 3. Solve Speed Score (0 - 80 PTS based on solve time vs duration)
      let speedScore = 0;
      if (isFullyCorrect && round.startedAt && sub.submittedAt) {
        const solveTimeSec = Math.max(0, (new Date(sub.submittedAt).getTime() - new Date(round.startedAt).getTime()) / 1000);
        const durationSec = round.duration || 120;
        const timeRatio = Math.max(0, Math.min(1, solveTimeSec / durationSec));
        speedScore = Math.round(80 * (1 - timeRatio));
      }

      // Total Score (0 - 1000 PTS)
      const totalScore = Math.max(0, Math.min(1000, correctnessScore + efficiencyScore + speedScore));

      sub.correctnessScore = correctnessScore;
      sub.efficiencyScore = efficiencyScore;
      sub.speedScore = speedScore;
      sub.score = totalScore;
      scores[userId] = totalScore;

      // Tie-break ranking: Highest score -> Highest correctness -> Lowest runtime -> Earliest submit
      const submitTime = sub.submittedAt ? new Date(sub.submittedAt).getTime() : Infinity;
      const isBetter = 
        totalScore > highestScore ||
        (totalScore === highestScore && correctnessScore > bestCorrectness) ||
        (totalScore === highestScore && correctnessScore === bestCorrectness && runtime < lowestRuntime) ||
        (totalScore === highestScore && correctnessScore === bestCorrectness && runtime === lowestRuntime && submitTime < earliestSubmission);

      if (totalScore > 0 && isBetter) {
        highestScore = totalScore;
        bestCorrectness = correctnessScore;
        lowestRuntime = runtime;
        earliestSubmission = submitTime;
        winnerId = userId;
      } else if (totalScore === highestScore && totalScore === 0) {
        // If everyone has 0, it is a draw
        winnerId = undefined;
      }
    }

    round.winner = winnerId;
    
    room.roundResults = room.roundResults || [];
    const existingIndex = room.roundResults.findIndex(r => r.roundIndex === roundIndex);
    if (existingIndex >= 0) {
      room.roundResults[existingIndex] = {
        roundIndex,
        winner: winnerId,
        scores,
      };
    } else {
      room.roundResults.push({
        roundIndex,
        winner: winnerId,
        scores,
      });
    }
  }

  determineOverallWinner(room: Room): string | undefined {
    // Quickode is 1 round, winner of round 1 is overall winner
    return room.roundResults?.[0]?.winner;
  }
}
