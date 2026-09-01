import { Room, GameMode, RoundType, Round, MatchRuleSet, PowerupType, PowerupState, ChaosEventType, ChaosEventState } from '@code-duel/types';
import { QuestionEngine } from './question-engine';

export class ChaosService {
  constructor(private questionEngine: QuestionEngine) {}

  async initializeRoom(room: Room): Promise<void> {
    room.gameMode = GameMode.CHAOS_ARENA;
    room.ruleSet = MatchRuleSet.CHAOS;
    room.powerupsEnabled = true;
    room.powerups = [];
    room.totalRounds = 1; // Can be multi-round later, keep 1 for now
    room.currentRound = 0;
    room.rounds = [];
    room.roundResults = [];
  }

  async generateNextRound(room: import('@code-duel/types').Room, playerHistories: import('@code-duel/types').ProblemHistoryEntry[][] = []): Promise<Round | null> {
    if (!room.totalRounds || (room.currentRound ?? 0) >= room.totalRounds) {
      return null;
    }

    const nextRoundIndex = (room.currentRound ?? 0) + 1;
    const roundType = RoundType.SPEED; 
    const duration = 300; // 5 mins default

    const excludeIds = room.rounds?.map((r) => r.problemId) || [];
    const problem = await this.questionEngine.allocateForMode(GameMode.CHAOS_ARENA, roundType, excludeIds, playerHistories);

    if (!problem) throw new Error('Failed to allocate problem for Chaos Arena');

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
    // Reset powerups for new round
    room.powerups = [];

    return newRound;
  }

  activatePowerup(room: Room, userId: string, powerupType: PowerupType, targetId?: string): PowerupState {
    if (!room.powerupsEnabled) {
      throw new Error('Powerups are not enabled in this room');
    }
    
    // Anti-spam protection: Check if user already activated this powerup recently
    const recentActivations = room.powerups?.filter(p => p.activatedBy === userId && p.type === powerupType);
    if (recentActivations && recentActivations.length > 0) {
       // Just a simple cooldown check, e.g., 30 seconds
       const lastAct = new Date(recentActivations[recentActivations.length - 1].activatedAt).getTime();
       if (Date.now() - lastAct < 30000) {
         throw new Error('Powerup on cooldown');
       }
    }

    const now = new Date();
    let durationMs = 10000; // Default 10 seconds

    switch (powerupType) {
      case PowerupType.FREEZE_OPPONENT:
        durationMs = 5000;
        break;
      case PowerupType.TIME_STEAL:
        durationMs = 0; // Instant
        // Actually implement time steal on timers (advanced feature)
        break;
      case PowerupType.SHIELD:
        durationMs = 15000;
        break;
      case PowerupType.SUDDEN_DEATH:
        durationMs = 60000; // Lasts 1 minute
        break;
      case PowerupType.SPEED_BOOST:
        durationMs = 10000;
        break;
      case PowerupType.REVEAL_PROGRESS:
        durationMs = 10000;
        break;
    }

    const powerupState: PowerupState = {
      type: powerupType,
      activatedBy: userId,
      targetId,
      activatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationMs).toISOString()
    };

    room.powerups = room.powerups || [];
    room.powerups.push(powerupState);

    return powerupState;
  }

  cleanExpiredPowerups(room: Room): boolean {
    if (!room.powerups) return false;
    const now = Date.now();
    const activePowerups = room.powerups.filter(p => new Date(p.expiresAt).getTime() > now);
    
    if (activePowerups.length !== room.powerups.length) {
       room.powerups = activePowerups;
       return true; // changed
    }
    return false;
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

      // 2. Efficiency Score (0 - 120 PTS)
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

      // 3. Solve Speed Score (0 - 80 PTS)
      let speedScore = 0;
      if (isFullyCorrect && round.startedAt && sub.submittedAt) {
        const solveTimeSec = Math.max(0, (new Date(sub.submittedAt).getTime() - new Date(round.startedAt).getTime()) / 1000);
        const durationSec = round.duration || 300;
        const timeRatio = Math.max(0, Math.min(1, solveTimeSec / durationSec));
        speedScore = Math.round(80 * (1 - timeRatio));
      }

      // Bonus points (Chaos events)
      const bonus = (sub as any).bonus || 0;
      const totalScore = Math.max(0, correctnessScore + efficiencyScore + speedScore + bonus);

      sub.correctnessScore = correctnessScore;
      sub.efficiencyScore = efficiencyScore;
      sub.speedScore = speedScore;
      sub.score = totalScore;
      scores[userId] = totalScore;

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
    const totalScores: Record<string, number> = {};
    
    room.roundResults?.forEach((res) => {
       for (const [userId, score] of Object.entries(res.scores)) {
         totalScores[userId] = (totalScores[userId] || 0) + score;
       }
    });

    let overallWinner: string | undefined = undefined;
    let maxScore = -1;

    for (const [userId, score] of Object.entries(totalScores)) {
      if (score > maxScore) {
        maxScore = score;
        overallWinner = userId;
      }
    }

    return overallWinner;
  }

  triggerChaosEvent(room: Room): ChaosEventState {
    const eventTypes = [
      ChaosEventType.CODE_SWAP,
      ChaosEventType.LIGHTNING_MATH,
      ChaosEventType.FREE_DRY_RUN,
      ChaosEventType.BONUS_ACCEPTED,
      ChaosEventType.TIME_WARP,
      ChaosEventType.OPPONENT_CODE_VIEW,
      ChaosEventType.EDITOR_FREEZE,
    ];

    // Pick a random event type
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const now = new Date();
    let durationMs = 10000; // Default 10 seconds
    const data: Record<string, any> = {};

    const playerIds = room.players.map((p) => p.id);

    if (type === ChaosEventType.FREE_DRY_RUN) {
      durationMs = 10000;
    } else if (type === ChaosEventType.BONUS_ACCEPTED) {
      durationMs = 5000;
    } else if (type === ChaosEventType.OPPONENT_CODE_VIEW) {
      durationMs = 10000;
      // Generate circular shift mapping for code viewing
      const mapping: Record<string, string> = {};
      for (let i = 0; i < playerIds.length; i++) {
        const nextIndex = (i + 1) % playerIds.length;
        mapping[playerIds[i]] = playerIds[nextIndex];
      }
      data.mapping = mapping;
    } else if (type === ChaosEventType.CODE_SWAP) {
      durationMs = 5000;
      // Generate circular shift mapping for code swap
      const mapping: Record<string, string> = {};
      for (let i = 0; i < playerIds.length; i++) {
        const nextIndex = (i + 1) % playerIds.length;
        mapping[playerIds[i]] = playerIds[nextIndex];
      }
      data.mapping = mapping;

      // Actually swap the code inside round submissions!
      const currentRoundIndex = room.currentRound ?? 1;
      const currentRound = room.rounds?.find((r) => r.roundIndex === currentRoundIndex);
      if (currentRound) {
        const newCodes: Record<string, string> = {};
        for (const [from, to] of Object.entries(mapping)) {
          const sub = currentRound.submissions?.[from];
          newCodes[to] = sub?.code || '';
        }
        for (const pid of playerIds) {
          if (!currentRound.submissions[pid]) {
            currentRound.submissions[pid] = {
              userId: pid,
              code: '',
              language: 'python',
              status: 'DRAFT',
              submittedAt: '',
              attempts: 0,
            };
          }
          currentRound.submissions[pid].code = newCodes[pid] || '';
          currentRound.submissions[pid].status = 'DRAFT';
        }
      }
    } else if (type === ChaosEventType.TIME_WARP) {
      durationMs = 5000;
      const isPositive = Math.random() > 0.5;
      const delta = isPositive ? 30 : -30;
      data.delta = delta;

      const currentRoundIndex = room.currentRound ?? 1;
      const currentRound = room.rounds?.find((r) => r.roundIndex === currentRoundIndex);
      if (currentRound) {
        // Enforce delta. If negative, ensure we don't drop below 15s remaining.
        const elapsedMs = Date.now() - new Date(currentRound.startedAt || 0).getTime();
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const currentRemaining = currentRound.duration - elapsedSec;
        let newRemaining = currentRemaining + delta;
        if (newRemaining < 15) {
          newRemaining = 15;
        }
        currentRound.duration = elapsedSec + newRemaining;
      }
    } else if (type === ChaosEventType.LIGHTNING_MATH) {
      durationMs = 15000;
      const num1 = Math.floor(Math.random() * 20) + 5;
      const num2 = Math.floor(Math.random() * 20) + 5;
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      const equation = `${num1} ${op} ${num2}`;
      let answer = 0;
      if (op === '+') answer = num1 + num2;
      else if (op === '-') answer = num1 - num2;
      else if (op === '*') answer = num1 * num2;

      data.equation = equation;
      data.answer = answer;
    } else if (type === ChaosEventType.EDITOR_FREEZE) {
      durationMs = 4000;
      const freezeHistory = (room as any).freezeHistory || {};
      const eligiblePlayers = playerIds.filter((pid) => (freezeHistory[pid] || 0) < 2);

      let frozenUserId = '';
      if (eligiblePlayers.length > 0) {
        frozenUserId = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        freezeHistory[frozenUserId] = (freezeHistory[frozenUserId] || 0) + 1;
        (room as any).freezeHistory = freezeHistory;
      } else {
        frozenUserId = playerIds[Math.floor(Math.random() * playerIds.length)];
      }

      data.frozenUserId = frozenUserId;
    }

    const eventState: ChaosEventState = {
      type,
      activatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationMs).toISOString(),
      durationMs,
      data,
    };

    room.chaosEvent = eventState;
    return eventState;
  }

  processMathAnswer(room: Room, userId: string, answer: number): { correct: boolean; updatedRoom: Room | null } {
    if (!room.chaosEvent || room.chaosEvent.type !== ChaosEventType.LIGHTNING_MATH) {
      return { correct: false, updatedRoom: null };
    }

    const correctAns = room.chaosEvent.data?.answer;
    if (correctAns !== undefined && Number(answer) === Number(correctAns)) {
      const currentRoundIndex = room.currentRound ?? 1;
      const currentRound = room.rounds?.find((r) => r.roundIndex === currentRoundIndex);
      if (currentRound) {
        currentRound.duration += 30;
      }

      room.chaosEvent.data = {
        ...room.chaosEvent.data,
        winnerId: userId,
        solved: true,
      };
      room.chaosEvent.expiresAt = new Date().toISOString();

      return { correct: true, updatedRoom: room };
    }

    return { correct: false, updatedRoom: null };
  }

  clearChaosEvent(room: Room): void {
    if (!room.chaosEvent) return;
    
    room.chaosHistory = room.chaosHistory || [];
    room.chaosHistory.push(room.chaosEvent);
    if (room.chaosHistory.length > 5) {
      room.chaosHistory.shift();
    }
    
    room.chaosEvent = undefined;
  }
}
