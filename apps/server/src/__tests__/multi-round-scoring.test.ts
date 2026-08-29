import { describe, it, expect, beforeEach } from 'vitest';
import { MultiRoundService } from '../services/multi-round-service';
import { QuestionEngine } from '../services/question-engine';
import { Room, MatchState, Player } from '@code-duel/types';

describe('Multi-Round Tournament Scoring Policy & Tiebreaker Rules', () => {
  let multiRoundService: MultiRoundService;
  let mockQuestionEngine: QuestionEngine;

  const createTestPlayer = (id: string, username: string): Player => ({
    id,
    username,
    rating: 1000,
    isReady: true,
    isOwner: false,
    connected: true,
    lastSeen: new Date().toISOString(),
  });

  beforeEach(() => {
    mockQuestionEngine = {} as any;
    multiRoundService = new MultiRoundService(mockQuestionEngine);
  });

  describe('Round Scoring Rules', () => {
    it('should calculate 0% correctness score when player passes zero test cases', () => {
      const room: Room = {
        id: 'room-1',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [createTestPlayer('p1', 'Player 1')],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            startedAt: new Date().toISOString(),
            submissions: {
              p1: {
                userId: 'p1',
                code: 'def solution(): pass',
                language: 'python',
                status: 'FAILED',
                executionTimeMs: 100,
                submittedAt: new Date().toISOString(),
                testResults: [
                  { testCaseId: 'tc-1', status: 'failed', executionTimeMs: 20, memoryUsageMb: 5 },
                  { testCaseId: 'tc-2', status: 'failed', executionTimeMs: 20, memoryUsageMb: 5 },
                ],
              },
            },
            metadata: {
              testCaseWeights: { 'tc-1': 10, 'tc-2': 10 },
            },
          },
        ],
      };

      multiRoundService.scoreRound(room, 1);
      const sub = room.rounds![0].submissions.p1;
      expect(sub.correctnessScore).toBe(0);
      expect(sub.efficiencyScore).toBe(0);
      expect(sub.speedScore).toBe(0);
      expect(sub.score).toBe(0);
    });

    it('should calculate partial weighted correctness correctly with unequal test weights', () => {
      const room: Room = {
        id: 'room-1',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [createTestPlayer('p1', 'Player 1')],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            startedAt: new Date().toISOString(),
            submissions: {
              p1: {
                userId: 'p1',
                code: 'def solution(): pass',
                language: 'python',
                status: 'FAILED',
                executionTimeMs: 100,
                submittedAt: new Date().toISOString(),
                testResults: [
                  { testCaseId: 'tc-1', status: 'passed', executionTimeMs: 20, memoryUsageMb: 5 },
                  { testCaseId: 'tc-2', status: 'failed', executionTimeMs: 20, memoryUsageMb: 5 },
                ],
              },
            },
            metadata: {
              testCaseWeights: { 'tc-1': 30, 'tc-2': 70 },
            },
          },
        ],
      };

      // Passed weight = 30 out of 100. Correctness score = 800 * 30/100 = 240
      multiRoundService.scoreRound(room, 1);
      const sub = room.rounds![0].submissions.p1;
      expect(sub.correctnessScore).toBe(240);
      expect(sub.efficiencyScore).toBe(0); // Locked since correctness < 100%
      expect(sub.speedScore).toBe(0);      // Locked since correctness < 100%
      expect(sub.score).toBe(240);
    });

    it('should fallback to equal default weights for legacy tests without explicit weights metadata', () => {
      const room: Room = {
        id: 'room-1',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [createTestPlayer('p1', 'Player 1')],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            startedAt: new Date().toISOString(),
            submissions: {
              p1: {
                userId: 'p1',
                code: 'def solution(): pass',
                language: 'python',
                status: 'FAILED',
                executionTimeMs: 100,
                submittedAt: new Date().toISOString(),
                testResults: [
                  { testCaseId: 'tc-1', status: 'passed', executionTimeMs: 20, memoryUsageMb: 5 },
                  { testCaseId: 'tc-2', status: 'passed', executionTimeMs: 20, memoryUsageMb: 5 },
                  { testCaseId: 'tc-3', status: 'failed', executionTimeMs: 20, memoryUsageMb: 5 },
                  { testCaseId: 'tc-4', status: 'failed', executionTimeMs: 20, memoryUsageMb: 5 },
                ],
              },
            },
            // metadata lacks testCaseWeights
          },
        ],
      };

      // 4 tests, 2 passed. With equal defaults (10 each), ratio is 0.5. Score = 400
      multiRoundService.scoreRound(room, 1);
      const sub = room.rounds![0].submissions.p1;
      expect(sub.correctnessScore).toBe(400);
      expect(sub.score).toBe(400);
    });

    it('should award 100% correctness and performance bands for fully solved problems', () => {
      const createScoringScenario = (executionTimeMs: number): number => {
        const room: Room = {
          id: 'room-1',
          ownerId: 'p1',
          state: MatchState.PLAYING,
          players: [createTestPlayer('p1', 'Player 1')],
          maxPlayers: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          epoch: 0,
          rounds: [
            {
              roundIndex: 1,
              roundType: 'SPEED' as any,
              problemId: 'prob-1',
              duration: 180,
              startedAt: new Date().toISOString(),
              submissions: {
                p1: {
                  userId: 'p1',
                  code: 'def solution(): pass',
                  language: 'python',
                  status: 'ACCEPTED',
                  executionTimeMs,
                  submittedAt: new Date().toISOString(),
                  testResults: [
                    { testCaseId: 'tc-1', status: 'passed', executionTimeMs: 10, memoryUsageMb: 5 },
                  ],
                },
              },
              metadata: {
                testCaseWeights: { 'tc-1': 10 },
                timeLimit: 2000,
                efficiencyThresholds: {
                  excellent: 200,
                  good: 500,
                  acceptable: 1000,
                  nearLimit: 1600,
                },
              },
            },
          ],
        };
        multiRoundService.scoreRound(room, 1);
        return room.rounds![0].submissions.p1.efficiencyScore || 0;
      };

      expect(createScoringScenario(150)).toBe(120); // Excellent
      expect(createScoringScenario(400)).toBe(90);  // Good
      expect(createScoringScenario(800)).toBe(60);  // Acceptable
      expect(createScoringScenario(1200)).toBe(30); // Near Limit
      expect(createScoringScenario(1700)).toBe(0);  // TLE/Over limit
    });

    it('should lock solve speed score to 0 when correctness is under 100%', () => {
      const room: Room = {
        id: 'room-1',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [createTestPlayer('p1', 'Player 1')],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            startedAt: new Date().toISOString(),
            submissions: {
              p1: {
                userId: 'p1',
                code: 'def solution(): pass',
                language: 'python',
                status: 'FAILED',
                executionTimeMs: 100,
                submittedAt: new Date().toISOString(), // solve time ~0
                testResults: [
                  { testCaseId: 'tc-1', status: 'passed', executionTimeMs: 20, memoryUsageMb: 5 },
                  { testCaseId: 'tc-2', status: 'failed', executionTimeMs: 20, memoryUsageMb: 5 },
                ],
              },
            },
            metadata: {
              testCaseWeights: { 'tc-1': 10, 'tc-2': 10 },
            },
          },
        ],
      };

      multiRoundService.scoreRound(room, 1);
      const sub = room.rounds![0].submissions.p1;
      expect(sub.speedScore).toBe(0);
      expect(sub.score).toBe(400); // Only correctness score
    });

    it('should calculate speed score dynamically relative to round start and submission server timestamp', () => {
      const startedAt = new Date('2026-07-27T12:00:00.000Z');
      const duration = 180; // seconds

      const getSpeedScore = (secondsElapsed: number): number => {
        const submittedAt = new Date(startedAt.getTime() + secondsElapsed * 1000);
        const room: Room = {
          id: 'room-1',
          ownerId: 'p1',
          state: MatchState.PLAYING,
          players: [createTestPlayer('p1', 'Player 1')],
          maxPlayers: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          epoch: 0,
          rounds: [
            {
              roundIndex: 1,
              roundType: 'SPEED' as any,
              problemId: 'prob-1',
              duration,
              startedAt: startedAt.toISOString(),
              submissions: {
                p1: {
                  userId: 'p1',
                  code: 'def solution(): pass',
                  language: 'python',
                  status: 'ACCEPTED',
                  executionTimeMs: 50,
                  submittedAt: submittedAt.toISOString(),
                  testResults: [
                    { testCaseId: 'tc-1', status: 'passed', executionTimeMs: 10, memoryUsageMb: 5 },
                  ],
                },
              },
              metadata: {
                testCaseWeights: { 'tc-1': 10 },
                efficiencyThresholds: { excellent: 200, good: 500, acceptable: 1000, nearLimit: 1600 },
              },
            },
          ],
        };
        multiRoundService.scoreRound(room, 1);
        return room.rounds![0].submissions.p1.speedScore || 0;
      };

      expect(getSpeedScore(0)).toBe(80);   // Immediately: 80 * (1 - 0) = 80
      expect(getSpeedScore(90)).toBe(40);  // Halfway: 80 * (1 - 90/180) = 40
      expect(getSpeedScore(180)).toBe(0);  // Deadline: 80 * (1 - 1) = 0
      expect(getSpeedScore(200)).toBe(0);  // Overtime clamp: 0
    });
  });

  describe('Tournament Match Tiebreakers', () => {
    it('should determine the winner based on total cumulative score across all rounds', () => {
      const room: Room = {
        id: 'room-tournament',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [
          createTestPlayer('p1', 'Player 1'),
          createTestPlayer('p2', 'Player 2'),
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 980 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 900 },
            },
          },
          {
            roundIndex: 2,
            roundType: 'SPEED' as any,
            problemId: 'prob-2',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 400 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 800 },
            },
          },
        ],
      };

      // Player 1 cumulative score = 980 + 400 = 1380
      // Player 2 cumulative score = 900 + 800 = 1700 -> Player 2 wins
      const winner = multiRoundService.determineOverallWinner(room);
      expect(winner).toBe('p2');
    });

    it('should apply tiebreaker 1: More fully solved problems', () => {
      const room: Room = {
        id: 'room-tournament',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [
          createTestPlayer('p1', 'Player 1'),
          createTestPlayer('p2', 'Player 2'),
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 1000, correctnessScore: 800 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 500, correctnessScore: 500 },
            },
          },
          {
            roundIndex: 2,
            roundType: 'SPEED' as any,
            problemId: 'prob-2',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 0, correctnessScore: 0 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 500, correctnessScore: 500 },
            },
          },
        ],
      };

      // p1 score = 1000 + 0 = 1000. Fully solved = 1 (R1).
      // p2 score = 500 + 500 = 1000. Fully solved = 0.
      // Equal score (1000), but p1 has more fully solved problems -> p1 wins
      const winner = multiRoundService.determineOverallWinner(room);
      expect(winner).toBe('p1');
    });

    it('should apply tiebreaker 2: Higher cumulative weighted correctness score', () => {
      const room: Room = {
        id: 'room-tournament',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [
          createTestPlayer('p1', 'Player 1'),
          createTestPlayer('p2', 'Player 2'),
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 500, correctnessScore: 500 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 500, correctnessScore: 400 },
            },
          },
          {
            roundIndex: 2,
            roundType: 'SPEED' as any,
            problemId: 'prob-2',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 500, correctnessScore: 300 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 500, correctnessScore: 500 },
            },
          },
        ],
      };

      // Both players: total score = 1000. Fully solved = 0.
      // p1 cumulative correctness = 500 + 300 = 800.
      // p2 cumulative correctness = 400 + 500 = 900 -> p2 wins
      const winner = multiRoundService.determineOverallWinner(room);
      expect(winner).toBe('p2');
    });

    it('should apply tiebreaker 3: Better aggregate efficiency across fully solved problems', () => {
      const room: Room = {
        id: 'room-tournament',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [
          createTestPlayer('p1', 'Player 1'),
          createTestPlayer('p2', 'Player 2'),
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 1000, correctnessScore: 800, efficiencyScore: 120 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 1000, correctnessScore: 800, efficiencyScore: 90 },
            },
          },
        ],
      };

      // Equal score (1000), fully solved (1), correctness (800).
      // p1 fully solved efficiency = 120.
      // p2 fully solved efficiency = 90 -> p1 wins
      const winner = multiRoundService.determineOverallWinner(room);
      expect(winner).toBe('p1');
    });

    it('should apply tiebreaker 4: Lower cumulative solve time across fully solved problems', () => {
      const start = new Date('2026-07-27T12:00:00.000Z');
      const room: Room = {
        id: 'room-tournament',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [
          createTestPlayer('p1', 'Player 1'),
          createTestPlayer('p2', 'Player 2'),
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            startedAt: start.toISOString(),
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: new Date(start.getTime() + 60000).toISOString(), score: 1000, correctnessScore: 800, efficiencyScore: 120 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: new Date(start.getTime() + 30000).toISOString(), score: 1000, correctnessScore: 800, efficiencyScore: 120 },
            },
          },
        ],
      };

      // Equal score, fully solved, correctness, efficiency.
      // p1 solve time = 60s.
      // p2 solve time = 30s -> p2 wins
      const winner = multiRoundService.determineOverallWinner(room);
      expect(winner).toBe('p2');
    });

    it('should result in undefined (draw) if all tiebreakers are identical', () => {
      const room: Room = {
        id: 'room-tournament',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [
          createTestPlayer('p1', 'Player 1'),
          createTestPlayer('p2', 'Player 2'),
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        rounds: [
          {
            roundIndex: 1,
            roundType: 'SPEED' as any,
            problemId: 'prob-1',
            duration: 180,
            submissions: {
              p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 1000, correctnessScore: 800, efficiencyScore: 120 },
              p2: { userId: 'p2', code: '', language: 'python', status: 'ACCEPTED', submittedAt: '', score: 1000, correctnessScore: 800, efficiencyScore: 120 },
            },
          },
        ],
      };

      const winner = multiRoundService.determineOverallWinner(room);
      expect(winner).toBeUndefined(); // Draw
    });
  });

  describe('Category Selection & Normalization Rules', () => {
    it('should select categories from pool without repetition in cycle', async () => {
      const room: Room = {
        id: 'room-1',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [createTestPlayer('p1', 'Player 1')],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        totalRounds: 4,
      };

      await multiRoundService.initializeRoom(room);
      expect(room.selectedCategories).toHaveLength(4);
      
      const unique = new Set(room.selectedCategories);
      expect(unique.size).toBe(4);
    });

    it('should automatically start a new shuffled cycle and avoid consecutive category boundaries if rounds exceed pool size', async () => {
      const room: Room = {
        id: 'room-1',
        ownerId: 'p1',
        state: MatchState.PLAYING,
        players: [createTestPlayer('p1', 'Player 1')],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
        totalRounds: 8,
      };

      await multiRoundService.initializeRoom(room);
      expect(room.selectedCategories).toHaveLength(8);

      for (let i = 0; i < room.selectedCategories!.length - 1; i++) {
        expect(room.selectedCategories![i]).not.toBe(room.selectedCategories![i + 1]);
      }
    });

    it('should normalize Predict Output answers correctly ignores trailing lines/spaces but not internal spaces', () => {
      const normalize = (str: string) => {
        return str
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map(line => line.trimEnd())
          .join('\n')
          .replace(/\n$/, '');
      };

      const expected = '[6, 6, 4, 4, 9]\n{6: 1, 4: 3}\n6';
      expect(normalize('[6, 6, 4, 4, 9]\r\n{6: 1, 4: 3}\r\n6')).toBe(expected);
      expect(normalize('[6, 6, 4, 4, 9] \n{6: 1, 4: 3}   \n6\n')).toBe(expected);
      expect(normalize('[6,  6, 4, 4, 9]\n{6: 1, 4: 3}\n6')).not.toBe(expected);
    });
  });
});
