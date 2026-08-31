import { Room, GameMode, RoundType, Round, MatchRuleSet } from '@code-duel/types';
import { QuestionEngine } from './question-engine';

export class QuickodeService {
  constructor(private questionEngine: QuestionEngine) {}

  async initializeRoom(room: Room, durationOptions: { duration: number }): Promise<void> {
    room.gameMode = GameMode.QUICKODE;
    room.ruleSet = MatchRuleSet.CASUAL;
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

    for (const [userId, sub] of Object.entries(round.submissions)) {
      if (sub.status === 'passed' || sub.status === 'ACCEPTED') {
        const timeTakenMs = new Date(sub.submittedAt).getTime() - new Date(round.startedAt || 0).getTime();
        
        // Instant scoring based primarily on speed
        let score = 1000;
        const maxTimeMs = round.duration * 1000;
        const timeRatio = Math.max(0, 1 - (timeTakenMs / maxTimeMs));
        score += Math.floor(timeRatio * 1000); // Up to 1000 bonus points for extreme speed

        scores[userId] = score;

        if (score > highestScore) {
          highestScore = score;
          winnerId = userId;
        }
      } else {
        scores[userId] = 0;
      }
    }

    round.winner = winnerId;
    
    room.roundResults = room.roundResults || [];
    room.roundResults.push({
      roundIndex,
      winner: winnerId,
      scores,
    });
  }

  determineOverallWinner(room: Room): string | undefined {
    // Quickode is 1 round, winner of round 1 is overall winner
    return room.roundResults?.[0]?.winner;
  }
}
