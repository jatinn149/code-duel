import fs from 'fs/promises';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JsonStorageAdapter } from '../storage/json-adapter';
import { JsonUserRepository } from '../repositories/json-user-repository';
import { MultiRoundService } from '../services/multi-round-service';
import { MatchFlowEngine } from '../services/match-flow-engine';
import { AntiCheatService } from '../services/anti-cheat-service';
import { QuestionEngine } from '../services/question-engine';
import { QuickodeService } from '../services/quickode-service';
import { ChaosService } from '../services/chaos-service';
import { DistributedRoomManager } from '../socket/room-manager';
import { Room, GameMode, RoundType, ProblemType, MatchState, UserRole, PresenceStatus, Rank, Problem, ExecutionVerdict, Player, ExecutionState } from '@code-duel/types';

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'test-secret',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret',
    REDIS_URL: 'redis://127.0.0.1:6379',
  },
}));

describe('Multi-Round Tournament Flow & Anti-Cheat Validation', () => {
  const testDir = path.join(__dirname, 'test-data-multi-round');
  let adapter: JsonStorageAdapter;
  let userRepo: JsonUserRepository;
  let questionEngine: QuestionEngine;
  let multiRoundService: MultiRoundService;
  let quickodeService: QuickodeService;
  let chaosService: ChaosService;
  let matchFlowEngine: MatchFlowEngine;
  let antiCheatService: AntiCheatService;
  let roomManager: DistributedRoomManager;

  const mockProblem: Problem = {
    id: 'prob-1',
    title: 'Two Sum Target Pointers',
    description: 'Find indices of two numbers adding to target.',
    difficulty: 2,
    timeLimit: 2000,
    memoryLimit: 256,
    compatibleModes: [GameMode.MULTI_ROUND],
    compatibleRounds: [RoundType.SPEED],
    speedRating: 100,
    pressureRating: 100,
    estimatedSolveTimeSec: 120,
    tags: ['array', 'two-pointers'],
    questionType: ProblemType.CODE_COMPLETION,
    questionFamilyId: 'fam-1',
    initialCode: 'def solution(nums, target):\n    # Fill in solution\n    return []',
    testCases: [
      { id: 'v1', input: '[2,7,11,15], 9', expectedOutput: '[0,1]' }
    ]
  };

  const createTestPlayer = (id: string, username: string, isOwner: boolean = false, connected: boolean = true): Player => ({
    id,
    username,
    rating: 1000,
    isReady: true,
    isOwner,
    connected,
    lastSeen: new Date().toISOString(),
  });

  beforeEach(async () => {
    adapter = new JsonStorageAdapter(testDir);
    await adapter.initialize();

    userRepo = new JsonUserRepository(adapter);
    
    // Mock QuestionEngine
    questionEngine = new QuestionEngine(adapter as any);
    vi.spyOn(questionEngine, 'allocateForMode').mockResolvedValue(mockProblem);

    multiRoundService = new MultiRoundService(questionEngine);
    quickodeService = new QuickodeService(questionEngine);
    chaosService = new ChaosService(questionEngine);
    matchFlowEngine = new MatchFlowEngine(multiRoundService, quickodeService, chaosService);
    antiCheatService = new AntiCheatService();

    roomManager = new DistributedRoomManager();
    roomManager.setMatchFlowEngine(matchFlowEngine);

    // Seed test users
    await userRepo.create({
      id: 'p1',
      username: 'player1',
      email: 'p1@test.com',
      playerId: 'CD-P111-1111',
      passwordHash: 'hash',
      role: UserRole.USER,
      rating: 1000,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      xp: 0,
      level: 1,
      rank: Rank.UNRANKED,
      streak: 0,
      status: PresenceStatus.ONLINE,
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    await userRepo.create({
      id: 'p2',
      username: 'player2',
      email: 'p2@test.com',
      playerId: 'CD-P222-2222',
      passwordHash: 'hash',
      role: UserRole.USER,
      rating: 1000,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      xp: 0,
      level: 1,
      rank: Rank.UNRANKED,
      streak: 0,
      status: PresenceStatus.ONLINE,
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. Tournament Initialization & Round Progression', () => {
    it('should initialize tournament strictly at Round 1 and advance sequentially without skipping rounds', async () => {
      const room: Room = {
        id: 'room-tournament-1',
        ownerId: 'p1',
        gameMode: GameMode.MULTI_ROUND,
        state: MatchState.WAITING,
        players: [
          createTestPlayer('p1', 'player1', true),
          createTestPlayer('p2', 'player2', false)
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
      };

      // 1. Initialize match
      await matchFlowEngine.initializeMatch(room, GameMode.MULTI_ROUND);
      expect(room.currentRound).toBe(0);
      expect(room.totalRounds).toBe(3);
      expect(room.rounds).toHaveLength(0);

      // 2. Generate Round 1
      const round1 = await matchFlowEngine.transitionToNextRound(room, []);
      expect(round1).not.toBeNull();
      expect(round1?.roundIndex).toBe(1);
      expect(room.currentRound).toBe(1);
      expect(room.rounds).toHaveLength(1);
      expect(room.state).toBe(MatchState.PLAYING);

      // 3. Score Round 1 & transition to Round 2
      matchFlowEngine.scoreCurrentRound(room);
      const round2 = await matchFlowEngine.transitionToNextRound(room, []);
      expect(round2).not.toBeNull();
      expect(round2?.roundIndex).toBe(2);
      expect(room.currentRound).toBe(2);
      expect(room.rounds).toHaveLength(2);

      // 4. Score Round 2 & transition to Round 3
      matchFlowEngine.scoreCurrentRound(room);
      const round3 = await matchFlowEngine.transitionToNextRound(room, []);
      expect(round3).not.toBeNull();
      expect(round3?.roundIndex).toBe(3);
      expect(room.currentRound).toBe(3);
      expect(room.rounds).toHaveLength(3);

      // 5. Score Round 3 & attempt transition beyond total rounds -> RESULTS
      matchFlowEngine.scoreCurrentRound(room);
      const round4 = await matchFlowEngine.transitionToNextRound(room, []);
      expect(round4).toBeNull();
      expect(room.state).toBe(MatchState.RESULTS);
    });
  });

  describe('2. Anti-Cheat Anomaly Validation & Starter Code', () => {
    it('should ACCEPT unchanged initial starter code without triggering an anomaly rejection', () => {
      const starterCode = mockProblem.initialCode!;
      // Player submits unchanged starter code with 0 keystrokes
      const isValid = antiCheatService.validateSubmission('p1', starterCode, 0, starterCode);
      expect(isValid).toBe(true);
    });

    it('should validate code with whitespace trims matching initialCode as non-anomaly', () => {
      const starterCode = mockProblem.initialCode!;
      const codeWithTrailingNewlines = `${starterCode}\n\n`;
      const isValid = antiCheatService.validateSubmission('p1', codeWithTrailingNewlines, 0, starterCode);
      expect(isValid).toBe(true);
    });

    it('should flag genuine anomaly ONLY when long custom code (>200 chars) is submitted with 0 keystrokes and NO starter code', () => {
      const longCustomSolution = 'def solution():\n' + '    x = 1\n'.repeat(20); // > 200 chars
      const isValid = antiCheatService.validateSubmission('p1', longCustomSolution, 0, undefined);
      expect(isValid).toBe(false);
    });
  });

  describe('3. Wrong Answer, Compile Errors & Room State Preservation', () => {
    it('should handle FAILED / WRONG_ANSWER submissions without terminating tournament or state corruption', async () => {
      const room: Room = {
        id: 'room-tournament-2',
        ownerId: 'p1',
        gameMode: GameMode.MULTI_ROUND,
        state: MatchState.PLAYING,
        currentRound: 1,
        totalRounds: 3,
        players: [
          createTestPlayer('p1', 'player1', true),
          createTestPlayer('p2', 'player2', false)
        ],
        rounds: [
          {
            roundIndex: 1,
            roundType: RoundType.SPEED,
            problemId: 'prob-1',
            duration: 180,
            startedAt: new Date().toISOString(),
            submissions: {},
            problem: mockProblem,
          }
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
      };

      const mockIo = {
        sockets: {
          adapter: { rooms: new Map() },
          sockets: new Map(),
        },
        to: () => ({ emit: () => {} }),
      } as any;

      // Simulate player 1 submitting code that gets WRONG_ANSWER
      await matchFlowEngine.handleJudgeResult(
        room,
        {
          submissionId: 'sub-1',
          userId: 'p1',
          roomId: room.id,
          state: ExecutionState.FINISHED,
          verdict: ExecutionVerdict.WRONG_ANSWER,
          executionTimeMs: 120,
          results: [{ testCaseId: 'v1', status: 'failed', actualOutput: 'None', executionTimeMs: 10, memoryUsageMb: 12 }],
        },
        mockIo
      );

      // Verify room state remains PLAYING and submission is stored as FAILED
      expect(room.state).toBe(MatchState.PLAYING);
      const sub = room.rounds![0].submissions['p1'];
      expect(sub).toBeDefined();
      expect(sub.status).toBe('FAILED');

      // Player 2 solves it
      await matchFlowEngine.handleJudgeResult(
        room,
        {
          submissionId: 'sub-2',
          userId: 'p2',
          roomId: room.id,
          state: ExecutionState.FINISHED,
          verdict: ExecutionVerdict.ACCEPTED,
          executionTimeMs: 45,
          results: [{ testCaseId: 'v1', status: 'passed', actualOutput: '[0,1]', executionTimeMs: 5, memoryUsageMb: 10 }],
        },
        mockIo
      );

      // Verify p2 is ACCEPTED and room is still in PLAYING until all solve or time expires
      expect(room.rounds![0].submissions['p2'].status).toBe('ACCEPTED');
    });
  });

  describe('4. Reconnect & Round State Restoration', () => {
    it('should preserve exact round index and problem during player reconnect', async () => {
      const room: Room = {
        id: 'room-tournament-3',
        ownerId: 'p1',
        gameMode: GameMode.MULTI_ROUND,
        state: MatchState.PLAYING,
        currentRound: 2,
        totalRounds: 3,
        players: [
          createTestPlayer('p1', 'player1', true),
          createTestPlayer('p2', 'player2', false, false)
        ],
        rounds: [
          {
            roundIndex: 1,
            roundType: RoundType.SPEED,
            problemId: 'prob-1',
            duration: 180,
            startedAt: new Date().toISOString(),
            submissions: { p1: { userId: 'p1', code: '', language: 'python', status: 'ACCEPTED', submittedAt: new Date().toISOString() } },
          },
          {
            roundIndex: 2,
            roundType: RoundType.DEBUG,
            problemId: 'prob-2',
            duration: 240,
            startedAt: new Date().toISOString(),
            submissions: {},
            problem: mockProblem,
          }
        ],
        maxPlayers: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        epoch: 0,
      };

      // Restore room state for reconnecting player
      const restored = matchFlowEngine.restoreRoomStateForUser(room);
      expect(restored.currentRound).toBe(2);
      expect(restored.rounds).toHaveLength(2);
      expect(restored.rounds![1].problemId).toBe('prob-2');
    });
  });
});
