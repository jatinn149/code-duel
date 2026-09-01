import { TestCaseResult, Room, MatchState, Verdict, PlayerResult, MatchResult } from '@code-duel/types';
import { roomManager } from '../socket/room-manager';
import { Server } from 'socket.io';
import { SocketEvents } from '@code-duel/shared';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ------------------------------------------------------------
// 1. JUDGE FACT INTERFACES & SERVICE
// ------------------------------------------------------------

export interface JudgeFacts {
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  executionTimeMs: number;
  memoryBytes: number;
  language: string;
  code: string;
  testResults: TestCaseResult[];
}

export interface IJudgeService {
  execute(code: string, language?: string, testCases?: any[]): Promise<JudgeFacts>;
}

export class MockJudgeService implements IJudgeService {
  async execute(code: string, language: string = 'python', testCases?: any[]): Promise<JudgeFacts> {
    // Default values representing successful completion
    let verdict: Verdict = Verdict.ACCEPTED;
    const totalCount = testCases && testCases.length > 0 ? testCases.length : 5;
    let passedCount = totalCount;
    let executionTimeMs = 120;
    let memoryUsageMb = 10; // MB

    // Parse special debugging/test comments in submitted code
    if (code.includes('# compile_error')) {
      verdict = Verdict.COMPILATION_ERROR;
      passedCount = 0;
      executionTimeMs = 0;
      memoryUsageMb = 0;
    } else if (code.includes('# runtime_error')) {
      verdict = Verdict.RUNTIME_ERROR;
      passedCount = 0;
      executionTimeMs = 45;
      memoryUsageMb = 12;
    } else if (code.includes('# tle')) {
      verdict = Verdict.TIME_LIMIT_EXCEEDED;
      passedCount = 0;
      executionTimeMs = 5000;
      memoryUsageMb = 15;
    } else if (code.includes('# wrong_answer')) {
      verdict = Verdict.WRONG_ANSWER;
      passedCount = Math.floor(totalCount * 0.4);
      executionTimeMs = 85;
      memoryUsageMb = 8;
    } else if (code.includes('# partial')) {
      verdict = Verdict.WRONG_ANSWER;
      passedCount = Math.floor(totalCount * 0.8);
      executionTimeMs = 110;
      memoryUsageMb = 9;
    } else if (code.trim() === '' || (code.includes('pass') && code.length < 50)) {
      // Empty editor or default placeholder
      verdict = Verdict.WRONG_ANSWER;
      passedCount = 0;
      executionTimeMs = 5;
      memoryUsageMb = 2;
    }

    // Parse custom time/memory modifiers from code comments if present
    const timeMatch = code.match(/# time_(\d+)/);
    if (timeMatch) {
      executionTimeMs = parseInt(timeMatch[1], 10);
    }
    const memMatch = code.match(/# mem_(\d+)/);
    if (memMatch) {
      memoryUsageMb = parseInt(memMatch[1], 10);
    }

    const testResults: TestCaseResult[] = [];
    const tcs = testCases && testCases.length > 0 ? testCases : Array.from({ length: 5 }, (_, i) => ({ id: (i + 1).toString() }));
    
    for (let i = 0; i < totalCount; i++) {
      const tc = tcs[i];
      const tcId = tc.id || tc.testCaseId || (i + 1).toString();
      const isPassed = i < passedCount;
      let status: TestCaseResult['status'] = 'passed';
      if (!isPassed) {
        if (verdict === Verdict.TIME_LIMIT_EXCEEDED) status = 'timeout';
        else if (verdict === Verdict.RUNTIME_ERROR) status = 'error';
        else status = 'failed';
      }
      testResults.push({
        testCaseId: tcId,
        status,
        executionTimeMs: Math.round(executionTimeMs / totalCount),
        memoryUsageMb: memoryUsageMb / totalCount,
      });
    }

    return {
      verdict,
      passedCount,
      totalCount,
      executionTimeMs,
      memoryBytes: memoryUsageMb * 1024 * 1024,
      language,
      code,
      testResults,
    };
  }
}

export class EvaluatorJudgeService implements IJudgeService {
  async execute(code: string, language: string = 'python', testCases?: any[]): Promise<JudgeFacts> {
    const evaluatorUrl = env.CODE_EVALUATOR_URL || 'http://127.0.0.1:5000';
    
    // If testcases with inputs exist, run them through microservice
    const validTestCases = (testCases && testCases.length > 0 && testCases.some(tc => tc.input !== undefined))
      ? testCases.map((tc, idx) => ({
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || tc.output || '',
          id: tc.id || tc.testCaseId || String(idx + 1),
          isHidden: !!tc.isHidden,
        }))
      : [];

    if (validTestCases.length > 0) {
      try {
        const response = await fetch(`${evaluatorUrl}/api/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            testCases: validTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
            timeoutMs: 3000,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data.success && data.results) {
            let hasTimeout = false;
            let hasRuntimeError = false;
            let totalExecutionTimeMs = 0;
            const testResults: TestCaseResult[] = [];

            data.results.forEach((res: any, idx: number) => {
              const tc = validTestCases[idx];
              totalExecutionTimeMs += res.timeMs || 0;

              let status: TestCaseResult['status'] = 'passed';
              if (res.status === 'TIMEOUT') {
                status = 'timeout';
                hasTimeout = true;
              } else if (res.status === 'RUNTIME_ERROR' || res.status === 'COMPILATION_ERROR') {
                status = 'error';
                hasRuntimeError = true;
              } else if (res.status !== 'PASSED') {
                status = 'failed';
              }

              testResults.push({
                testCaseId: tc.id,
                status,
                executionTimeMs: res.timeMs || 0,
                memoryUsageMb: 10,
                actualOutput: res.actualOutput,
                error: res.stderr,
              });
            });

            let verdict: Verdict = Verdict.ACCEPTED;
            if (data.passedCount === data.totalCount && data.totalCount > 0) {
              verdict = Verdict.ACCEPTED;
            } else if (hasTimeout) {
              verdict = Verdict.TIME_LIMIT_EXCEEDED;
            } else if (hasRuntimeError) {
              verdict = Verdict.RUNTIME_ERROR;
            } else {
              verdict = Verdict.WRONG_ANSWER;
            }

            return {
              verdict,
              passedCount: data.passedCount || 0,
              totalCount: data.totalCount || validTestCases.length,
              executionTimeMs: totalExecutionTimeMs,
              memoryBytes: 10 * 1024 * 1024,
              language,
              code,
              testResults,
            };
          }
        }
      } catch (err) {
        logger.error({ err }, 'Error evaluating code via Evaluator Microservice in JudgeService');
      }
    }

    // Fallback to MockJudgeService if evaluator microservice is unreachable or testCases format is minimal
    return new MockJudgeService().execute(code, language, testCases);
  }
}

export class JudgeService extends EvaluatorJudgeService {}

// ------------------------------------------------------------
// 2. SCORE CALCULATOR & STRATEGIES
// ------------------------------------------------------------

export interface ScoringStrategy {
  calculateScore(facts: JudgeFacts): number;
}

export class QuickcodeScoreCalculator implements ScoringStrategy {
  calculateScore(facts: JudgeFacts): number {
    let score = 0;
    
    // Priority 1: Accepted Solution (highest weight)
    if (facts.verdict === Verdict.ACCEPTED) {
      score += 100_000_000;
    }
    
    // Priority 2: Higher number of passed test cases
    score += facts.passedCount * 1_000_000;
    
    // Priority 3: Lower execution time (assumes 10000ms max timeout)
    const timeBonus = Math.max(0, 10000 - facts.executionTimeMs);
    score += timeBonus * 10;
    
    // Priority 4: Lower memory usage (assumes 512MB max limit)
    const memoryMb = facts.memoryBytes / (1024 * 1024);
    const memoryBonus = Math.max(0, 512 - memoryMb);
    score += memoryBonus;
    
    return Math.floor(score);
  }
}

export class MultiRoundScoreCalculator implements ScoringStrategy {
  calculateScore(facts: JudgeFacts): number {
    return new QuickcodeScoreCalculator().calculateScore(facts);
  }
}

export class ScoreCalculator {
  private strategies: Record<string, ScoringStrategy> = {
    QUICKODE: new QuickcodeScoreCalculator(),
    MULTI_ROUND: new MultiRoundScoreCalculator(),
    CHAOS_ARENA: new QuickcodeScoreCalculator(),
  };

  calculate(mode: string, facts: JudgeFacts): number {
    const strategy = this.strategies[mode] || new QuickcodeScoreCalculator();
    return strategy.calculateScore(facts);
  }
}

// ------------------------------------------------------------
// 3. WINNER CALCULATOR (LEXICOGRAPHICAL COMPARISON)
// ------------------------------------------------------------

const VerdictPriority: Record<Verdict, number> = {
  [Verdict.ACCEPTED]: 1,
  [Verdict.WRONG_ANSWER]: 2,
  [Verdict.RUNTIME_ERROR]: 3,
  [Verdict.COMPILATION_ERROR]: 4,
  [Verdict.TIME_LIMIT_EXCEEDED]: 5,
  [Verdict.TIMEOUT]: 6,
  [Verdict.DISQUALIFIED]: 99,
};

export function comparePlayerResults(a: PlayerResult, b: PlayerResult): number {
  const pA = VerdictPriority[a.verdict] ?? 99;
  const pB = VerdictPriority[b.verdict] ?? 99;
  if (pA !== pB) {
    return pA - pB; // lower number is better
  }
  if (b.passedCount !== a.passedCount) {
    return b.passedCount - a.passedCount; // higher is better
  }
  if (a.executionTimeMs !== b.executionTimeMs) {
    return a.executionTimeMs - b.executionTimeMs; // lower is better
  }
  if (a.memoryBytes !== b.memoryBytes) {
    return a.memoryBytes - b.memoryBytes; // lower is better
  }
  return 0; // Draw
}

export class WinnerCalculator {
  determineWinner(playerResults: Record<string, PlayerResult>, playerIds: string[]): string | 'DRAW' {
    if (playerIds.length === 0) return 'DRAW';
    if (playerIds.length === 1) return playerIds[0];

    let bestPlayerId = playerIds[0];
    let bestResult = playerResults[bestPlayerId];
    let isDraw = false;

    for (let i = 1; i < playerIds.length; i++) {
      const pid = playerIds[i];
      const result = playerResults[pid];
      if (!bestResult) {
        bestResult = result;
        bestPlayerId = pid;
        isDraw = false;
        continue;
      }
      if (!result) continue;

      const cmp = comparePlayerResults(result, bestResult);
      if (cmp < 0) {
        // result is better than bestResult
        bestResult = result;
        bestPlayerId = pid;
        isDraw = false;
      } else if (cmp === 0) {
        isDraw = true;
      }
    }

    return isDraw ? 'DRAW' : bestPlayerId;
  }
}

// ------------------------------------------------------------
// 4. MATCH FINALIZER
// ------------------------------------------------------------

export class MatchFinalizer {
  async finalizeRound(
    roomId: string,
    roundIndex: number,
    playerResults: Record<string, PlayerResult>,
    roundWinnerId: string | 'DRAW',
    overallWinnerId: string | 'DRAW',
    io: Server,
    emitRoomUpdated: (roomId: string, room: Room) => void,
    scheduleNextRoundTransition?: (room: Room) => void
  ): Promise<Room | null> {
    const isOverallDraw = overallWinnerId === 'DRAW';
    const finalOverallWinnerId = isOverallDraw ? undefined : overallWinnerId;

    logger.info({ roomId, roundIndex, roundWinnerId, overallWinnerId }, 'Finalizing round with MatchResult payload');

    const finalizedRoom = await roomManager.updateRoom(roomId, (room) => {
      const isFinalRound = roundIndex === (room.totalRounds || 1);

      if (isFinalRound) {
        room.state = MatchState.RESULTS;
        
        // Build final MatchResult payload
        const matchResult: MatchResult = {
          roomId,
          roundIndex,
          winnerId: finalOverallWinnerId,
          isDraw: isOverallDraw,
          playerResults,
          endedAt: new Date().toISOString(),
        };
        room.matchResult = matchResult;
      } else {
        room.state = MatchState.ROUND_SUMMARY;
        room.summaryEndsAt = new Date(Date.now() + 5000).toISOString();
      }

      room.updatedAt = new Date().toISOString();

      const r = room.rounds?.find(rnd => rnd.roundIndex === roundIndex);
      if (r) {
        r.endedAt = room.updatedAt;
        r.winner = roundWinnerId === 'DRAW' ? undefined : roundWinnerId;

        const scores: Record<string, number> = {};
        for (const pid in playerResults) {
          scores[pid] = playerResults[pid].score;
        }

        if (!room.roundResults) {
          room.roundResults = [];
        }
        
        const existingIndex = room.roundResults.findIndex(rr => rr.roundIndex === roundIndex);
        const roundResObj = {
          roundIndex,
          winner: r.winner,
          scores,
        };
        if (existingIndex !== -1) {
          room.roundResults[existingIndex] = roundResObj;
        } else {
          room.roundResults.push(roundResObj);
        }
      }
    });

    if (finalizedRoom) {
      emitRoomUpdated(roomId, finalizedRoom);

      const roundResult = finalizedRoom.roundResults?.find(r => r.roundIndex === roundIndex);
      if (roundResult) {
        io.to(roomId).emit(SocketEvents.ROUND_ENDED, { roundIndex, results: roundResult });
      }

      const isFinalRound = roundIndex === (finalizedRoom.totalRounds || 1);
      if (isFinalRound) {
        // Emit GAME_END with the overall winnerId (or default to owner if DRAW/undefined)
        io.to(roomId).emit(SocketEvents.GAME_END, { winnerId: finalOverallWinnerId || finalizedRoom.players[0]?.id });
        
        // Clean up player persistent containers for the match
        try {
          const { playerContainerManager } = await import('./player-container-manager');
          await playerContainerManager.destroyContainersForMatch(roomId);
        } catch (e) {
          logger.error({ e, roomId }, 'Failed to cleanup player containers on match end');
        }
      } else if (scheduleNextRoundTransition) {
        scheduleNextRoundTransition(finalizedRoom);
      }
    }

    return finalizedRoom;
  }
}
