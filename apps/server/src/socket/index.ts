import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { IUserRepository } from '@/repositories/interfaces';
import { JWTPayload } from '@/middleware/auth-middleware';
import { SocketEvents } from '@code-duel/shared';
import {
  MatchState,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  TelemetryEvent,
  PasteTelemetry,
  Room,
  Verdict,
  PlayerResult,
  ExecutionEventPayload,
  ExecutionState,
  GameMode,
  SubmissionPayload,
  User,
  MatchRuleSet,
  RoundType,
  ExecutionVerdict,
  MissionType,
} from '@code-duel/types';
import { roomManager, sanitizeRoomForUser } from './room-manager';
import {
  createRoomSchema,
  joinRoomSchema,
  pingSyncSchema,
  telemetrySyncSchema,
  chatMessageSchema,
  codeSyncSchema,
  submitCodeSchema,
  runCodeSchema,
  submitMathAnswerSchema,
} from '@code-duel/validation';
import { antiCheatService } from '@/services/anti-cheat-service';
import { matchmakingService } from '@/services/matchmaking-service';
import { JudgeService, MatchFinalizer } from '@/services/judge-pipeline';
import { QuestionEngine } from '@/services/question-engine';
import { MultiRoundService } from '@/services/multi-round-service';
import { QuickodeService } from '@/services/quickode-service';
import { ChaosService } from '@/services/chaos-service';
import { MatchFlowEngine } from '@/services/match-flow-engine';
import { JudgeClient } from '@/services/judge-client';
import { playerContainerManager } from '@/services/player-container-manager';
import { RatingService } from '@/services/rating-service';
import { SocialService } from '@/services/social-service';
import { NotificationService } from '@/services/notification-service';
import { PresenceService } from '@/services/presence-service';
import { calculateDailyStreak } from '@/services/progression-service';

export interface RateLimiterStore {
  isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean>;
  clearUser(userId: string): Promise<void> | void;
}

export class InMemoryRateLimiterStore implements RateLimiterStore {
  private trackers = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of Array.from(this.trackers.entries())) {
        const active = timestamps.filter((t) => now - t < 60000); // 1 minute cleanup threshold
        if (active.length === 0) {
          this.trackers.delete(key);
        } else {
          this.trackers.set(key, active);
        }
      }
    }, 60000);
    this.cleanupInterval.unref();
  }

  async isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    let timestamps = this.trackers.get(key) || [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      if (timestamps.length === 0) {
        this.trackers.delete(key);
      } else {
        this.trackers.set(key, timestamps);
      }
      return true;
    }

    timestamps.push(now);
    this.trackers.set(key, timestamps);
    return false;
  }

  clearUser(userId: string) {
    for (const key of Array.from(this.trackers.keys())) {
      if (key.startsWith(`${userId}:`)) {
        this.trackers.delete(key);
      }
    }
  }
}

import { redisCache } from '@/utils/redis-cache';

export class RedisRateLimiterStore implements RateLimiterStore {
  async isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const clearBefore = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    try {
      const pipeline = redisCache.multi();
      pipeline.zremrangebyscore(redisKey, 0, clearBefore);
      pipeline.zcard(redisKey);
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      pipeline.pexpire(redisKey, windowMs); // TTL in ms

      const results = await pipeline.exec();
      if (!results) {
        return false;
      }

      const cardResult = results[1];
      const count = Array.isArray(cardResult) ? (cardResult[1] as number) : (cardResult as number);

      return count >= limit;
    } catch (err) {
      logger.error({ err, key }, 'Redis rate limiter error, falling back to false');
      return false;
    }
  }

  async clearUser(userId: string) {
    try {
      const keys = await redisCache.keys(`ratelimit:${userId}:*`);
      if (keys.length > 0) {
        await redisCache.del(...keys);
      }
    } catch (err) {
      logger.error({ err, userId }, 'Redis rate limiter clearUser error');
    }
  }
}

class SocketRateLimiter {
  private inMemoryStore = new InMemoryRateLimiterStore();
  private redisStore = new RedisRateLimiterStore();

  async isRateLimited(userId: string, event: string, windowMs: number, maxRequests: number): Promise<boolean> {
    const key = `${userId}:${event}`;
    const useRedis = process.env.NODE_ENV !== 'test' && redisCache.status === 'ready';

    if (useRedis) {
      return this.redisStore.isRateLimited(key, maxRequests, windowMs);
    } else {
      return this.inMemoryStore.isRateLimited(key, maxRequests, windowMs);
    }
  }

  clearUser(userId: string) {
    this.inMemoryStore.clearUser(userId);
    this.redisStore.clearUser(userId).catch(() => {});
  }
}

export const socketRateLimiter = new SocketRateLimiter();

const userActiveSockets = new Map<string, Set<string>>();

export const initSocket = (
  server: HttpServer,
  userRepository: IUserRepository,
  _progressionService?: any,
  _retentionService?: any,
  _repositories?: {
    friendRepository?: any;
    notificationRepository?: any;
    activityRepository?: any;
    duelInviteRepository?: any;
    problemRepository?: any;
    matchResultRepository?: any;
  }
) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    server,
    {
      cors: {
        origin: (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          if (
            origin.endsWith('.trycloudflare.com') ||
            origin.endsWith('.trycloudflared.com') ||
            origin.endsWith('.netlify.app') ||
            origin.endsWith('.vercel.app')
          ) {
            callback(null, true);
            return;
          }
          const frontendUrl = process.env.FRONTEND_URL;
          if (frontendUrl && (origin === frontendUrl || origin === frontendUrl.replace(/\/$/, ''))) {
            callback(null, true);
            return;
          }
          if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
            return;
          }
          if (env.NODE_ENV === 'development') {
            callback(null, true);
            return;
          }
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
      },
      pingTimeout: 10000,
      pingInterval: 5000,
      maxHttpBufferSize: 1e6, // Reject large payload buffers at HTTP protocol level (Issue 2)
    },
  );

  const judgeService = new JudgeService();
  const matchFinalizer = new MatchFinalizer();

  const questionEngine = new QuestionEngine(_repositories?.problemRepository);
  const multiRoundService = new MultiRoundService(questionEngine);
  const quickodeService = new QuickodeService(questionEngine);
  const chaosService = new ChaosService(questionEngine);
  const matchFlowEngine = new MatchFlowEngine(multiRoundService, quickodeService, chaosService);

  roomManager.setMatchFlowEngine(matchFlowEngine);

  const safeFriendRepo = {
    sendRequest: _repositories?.friendRepository?.sendRequest?.bind(_repositories.friendRepository) || (async (r: any) => r),
    getRequestById: _repositories?.friendRepository?.getRequestById?.bind(_repositories.friendRepository) || (async () => null),
    getPendingRequests: _repositories?.friendRepository?.getPendingRequests?.bind(_repositories.friendRepository) || (async () => []),
    updateRequestStatus: _repositories?.friendRepository?.updateRequestStatus?.bind(_repositories.friendRepository) || (async () => {}),
    deleteRequest: _repositories?.friendRepository?.deleteRequest?.bind(_repositories.friendRepository) || (async () => {}),
    createFriendship: _repositories?.friendRepository?.createFriendship?.bind(_repositories.friendRepository) || (async (f: any) => f),
    getFriends: _repositories?.friendRepository?.getFriends?.bind(_repositories.friendRepository) || (async () => []),
    removeFriendship: _repositories?.friendRepository?.removeFriendship?.bind(_repositories.friendRepository) || (async () => {}),
    isFriend: _repositories?.friendRepository?.isFriend?.bind(_repositories.friendRepository) || (async () => false),
    hasPendingRequest: _repositories?.friendRepository?.hasPendingRequest?.bind(_repositories.friendRepository) || (async () => false),
  };

  const safeNotificationRepo = {
    create: _repositories?.notificationRepository?.create?.bind(_repositories.notificationRepository) || (async (n: any) => n),
    getByUserId: _repositories?.notificationRepository?.getByUserId?.bind(_repositories.notificationRepository) || (async () => []),
    markAsRead: _repositories?.notificationRepository?.markAsRead?.bind(_repositories.notificationRepository) || (async () => {}),
    delete: _repositories?.notificationRepository?.delete?.bind(_repositories.notificationRepository) || (async () => {}),
    getUnreadCount: _repositories?.notificationRepository?.getUnreadCount?.bind(_repositories.notificationRepository) || (async () => 0),
  };

  const safeActivityRepo = {
    create: _repositories?.activityRepository?.create?.bind(_repositories.activityRepository) || (async (a: any) => a),
    getGlobalFeed: _repositories?.activityRepository?.getGlobalFeed?.bind(_repositories.activityRepository) || (async () => []),
    getUserFeed: _repositories?.activityRepository?.getUserFeed?.bind(_repositories.activityRepository) || (async () => []),
  };

  const safeDuelInviteRepo = {
    create: _repositories?.duelInviteRepository?.create?.bind(_repositories.duelInviteRepository) || (async (d: any) => d),
    getById: _repositories?.duelInviteRepository?.getById?.bind(_repositories.duelInviteRepository) || (async () => null),
    updateStatus: _repositories?.duelInviteRepository?.updateStatus?.bind(_repositories.duelInviteRepository) || (async () => {}),
    getPendingForUser: _repositories?.duelInviteRepository?.getPendingForUser?.bind(_repositories.duelInviteRepository) || (async () => []),
  };

  const presenceService = new PresenceService(io);
  const notificationService = new NotificationService(safeNotificationRepo, io);
  const socialService = new SocialService(
    userRepository,
    safeFriendRepo,
    safeDuelInviteRepo,
    safeActivityRepo,
    notificationService,
    presenceService
  );

  const judgeClient = new JudgeClient(io, matchFlowEngine);

  matchFlowEngine.on('roundEnded', async ({ room, roundIndex }: { room: Room; roundIndex: number }) => {
    logger.info({ roomId: room.id, roundIndex }, 'MatchFlowEngine emitted roundEnded. Finalizing round.');

    const playerIds = room.players.map((p) => p.id);
    const playerResults: Record<string, PlayerResult> = {};
    const round = room.rounds?.find(r => r.roundIndex === roundIndex);
    
    // Find the winner of this round
    const roundResult = room.roundResults?.find(r => r.roundIndex === roundIndex);
    const roundWinnerId = roundResult?.winner || 'DRAW';

    // Determine overall winner
    const overallWinnerId = matchFlowEngine.determineOverallWinner(room) || 'DRAW';

    const isFinalRound = roundIndex === (room.totalRounds || 1);

    playerIds.forEach((pid) => {
      const s = round?.submissions?.[pid];
      const playerObj = room.players.find(x => x.id === pid);
      
      const finalScore = room.gameMode === GameMode.MULTI_ROUND
        ? (room.rounds?.reduce((sum, r) => sum + (r.submissions?.[pid]?.score || 0), 0) || 0)
        : (roundResult?.scores[pid] || 0);

      const isDisqualified = s?.status === 'DISQUALIFIED' || (s as any)?.disqualificationReason !== undefined;

      const finalOutcome = isDisqualified
        ? 'DISQUALIFIED'
        : isFinalRound
        ? (overallWinnerId === 'DRAW' ? 'DRAW' : (overallWinnerId === pid ? 'WINNER' : 'LOSER'))
        : (roundWinnerId === 'DRAW' ? 'DRAW' : (roundWinnerId === pid ? 'WINNER' : 'LOSER'));

      playerResults[pid] = {
        userId: pid,
        username: playerObj?.username || '',
        outcome: finalOutcome as any,
        verdict: isDisqualified ? Verdict.DISQUALIFIED : ((s?.status as Verdict) || Verdict.TIMEOUT),
        passedCount: isDisqualified ? 0 : (s?.testResults?.filter(t => t.status === 'passed').length ?? (s?.status === 'ACCEPTED' ? 1 : 0)),
        totalCount: s?.testResults?.length || ((round?.problem as any)?.testCases?.length || 1),
        executionTimeMs: s?.executionTimeMs || 0,
        memoryBytes: s?.memoryBytes || 0,
        language: s?.language || 'python',
        score: isDisqualified ? 0 : finalScore,
        correctnessScore: isDisqualified ? 0 : (s?.correctnessScore ?? (s?.status === 'ACCEPTED' ? 800 : 0)),
        efficiencyScore: isDisqualified ? 0 : (s?.efficiencyScore ?? 0),
        speedScore: isDisqualified ? 0 : (s?.speedScore ?? 0),
        disqualificationReason: (s as any)?.disqualificationReason,
      };
    });

    if (isFinalRound) {
      try {
        const dbUsers = await Promise.all(
          room.players.map(p => userRepository.findById(p.id))
        );
        const validUsers = dbUsers.filter((u): u is User => !!u);

        if (validUsers.length >= 2) {
          const playerRatingInputs = room.players.map(p => {
            const u = dbUsers.find(user => user?.id === p.id);
            const status = p.connected ? 'completed' : 'disconnected';
            const score = playerResults[p.id]?.score || 0;
            return {
              id: p.id,
              rating: u?.rating ?? 0,
              status,
              placementMatchesPlayed: u?.placementMatchesPlayed ?? 0,
              score
            };
          });

          const isRanked = room.ruleSet === MatchRuleSet.RANKED;
          const cpResults = await RatingService.calculateMultiplayerRatings(
            playerRatingInputs,
            room.gameMode ?? 'MULTI_ROUND',
            isRanked
          );

          const resultsPayload = await Promise.all(validUsers.map(async (u) => {
            const ratingInput = playerRatingInputs.find(x => x.id === u.id);
            const status = ratingInput?.status || 'completed';
            const cpRes = cpResults.find(x => x.id === u.id);
            const ratingChange = cpRes?.ratingChange ?? 0;
            const newRating = cpRes?.newRating ?? u.rating;

            const isWin = overallWinnerId === u.id;
            const isDraw = overallWinnerId === 'DRAW';
            const xpGain = isWin ? 100 : (isDraw ? 50 : 30);

            const { level: newLevel, xp: newXp } = _progressionService.calculateLevelProgress(u.level, u.xp, xpGain);
            const newMatchesPlayed = u.matchesPlayed + 1;
            const newRank = _progressionService.calculateRank(newRating, newMatchesPlayed);
            const currentStreak = Math.max(0, u.streak || 0);
            const lastActive = u.lastDailyWinAt || u.lastDailyResetAt;
            const newStreak = calculateDailyStreak(currentStreak, lastActive);

            let newPlacementMatches = u.placementMatchesPlayed ?? 0;
            if (isRanked && ratingChange !== 0) {
              newPlacementMatches = Math.min(10, newPlacementMatches + 1);
            }

            return {
              userId: u.id,
              username: u.username,
              score: playerResults[u.id]?.score || 0,
              ratingChange,
              newRating,
              status: status as 'completed' | 'disconnected' | 'disqualified',
              xpGain,
              newLevel,
              newXp,
              newRank,
              newStreak,
              placementMatchesPlayed: newPlacementMatches,
              seasonalTier: u.seasonalTier ?? 'UNRANKED',
            };
          }));

          // Attach progression and rating changes to playerResults so the client can display animations
          resultsPayload.forEach((res) => {
            if (playerResults[res.userId]) {
              playerResults[res.userId].ratingChange = res.ratingChange;
              playerResults[res.userId].newRating = res.newRating;
              playerResults[res.userId].xpGain = res.xpGain;
              playerResults[res.userId].newLevel = res.newLevel;
              playerResults[res.userId].newXp = res.newXp;
            }
          });

          const durationMs = Date.now() - new Date(room.matchStartAt || room.createdAt || Date.now()).getTime();
          const summary = {
            roomId: room.id,
            winnerId: overallWinnerId === 'DRAW' ? undefined : overallWinnerId,
            durationMs,
            mode: room.gameMode,
            endedAt: new Date().toISOString(),
            results: resultsPayload,
          };

          const saved = await _repositories?.matchResultRepository?.saveMatchWithLock(summary, true);
          if (saved) {
            logger.info({ roomId: room.id }, 'Match results saved successfully inside transaction');
            room.players.forEach((player) => {
              const res = resultsPayload.find(r => r.userId === player.id);
              if (res) {
                player.rating = res.newRating;
              }
            });
          }

          // Track Daily Missions upon match conclusion
          if (_retentionService) {
            try {
              await Promise.all(
                validUsers.map(async (u) => {
                  // 1. Play Matches mission
                  await _retentionService.trackMissionProgress(u.id, MissionType.PLAY_MATCHES, 1);

                  // 2. Win Duels mission
                  if (overallWinnerId === u.id) {
                    await _retentionService.trackMissionProgress(u.id, MissionType.WIN_DUELS, 1);
                  }

                  // 3. Perfect Solve mission (passed testcases with no runtime/compilation error)
                  const pRes = playerResults[u.id];
                  if (pRes && pRes.passedCount > 0 && pRes.verdict !== Verdict.COMPILATION_ERROR && pRes.verdict !== Verdict.RUNTIME_ERROR) {
                    await _retentionService.trackMissionProgress(u.id, MissionType.PERFECT_SOLVE, 1);
                  }
                })
              );
            } catch (missionErr) {
              logger.error({ err: missionErr, roomId: room.id }, 'Failed to update daily mission progress');
            }
          }
        }
      } catch (err) {
        logger.error({ err, roomId: room.id }, 'Failed to save match results/ratings inside roundEnded socket event');
      }
    }

    await matchFinalizer.finalizeRound(
      room.id,
      roundIndex,
      playerResults,
      roundWinnerId,
      overallWinnerId,
      io,
      emitRoomUpdated,
      (updatedRoom) => {
        scheduleTransitionTimeout(updatedRoom.id, MatchState.ROUND_INITIALIZING, new Date(updatedRoom.summaryEndsAt || Date.now()));
      }
    );
  });

  const roundTimeouts = new Map<string, NodeJS.Timeout>();
  const activeTransitions = new Map<string, NodeJS.Timeout>();

  const scheduleTransitionTimeout = (roomId: string, targetState: MatchState, executeAt: Date) => {
    const existing = activeTransitions.get(roomId);
    if (existing) {
      clearTimeout(existing);
    }

    const delay = Math.max(0, executeAt.getTime() - Date.now());
    const timeout = setTimeout(async () => {
      activeTransitions.delete(roomId);
      try {
        await executeTransition(roomId, targetState);
      } catch (err) {
        logger.error({ err, roomId, targetState }, 'Error executing state transition');
      }
    }, delay);

    activeTransitions.set(roomId, timeout);
  };

  const executeTransition = async (roomId: string, targetState: MatchState) => {
    const room = await roomManager.getRoom(roomId);
    if (!room) return;

    if (targetState === MatchState.ROUND_INITIALIZING) {
      const initializationDurationMs = 3000;
      const initializationEndsAt = new Date(Date.now() + initializationDurationMs).toISOString();

      const updated = await roomManager.updateRoom(roomId, async (r) => {
        r.state = MatchState.ROUND_INITIALIZING;
        r.initializationEndsAt = initializationEndsAt;
        r.updatedAt = new Date().toISOString();

        if (!r.rounds) {
          r.rounds = [];
        }

        // Generate next round using MatchFlowEngine dynamically
        const newRound = await matchFlowEngine.transitionToNextRound(r, []);

        // Override state and timer back to ROUND_INITIALIZING for Summary screen
        r.state = MatchState.ROUND_INITIALIZING;
        r.initializationEndsAt = initializationEndsAt;
        if (newRound) {
          newRound.startedAt = initializationEndsAt;
          newRound.roundStartedAt = initializationEndsAt;
          newRound.roundEndsAt = new Date(new Date(initializationEndsAt).getTime() + newRound.duration * 1000).toISOString();
          newRound.submissions = {};
        }
      });

      if (updated) {
        antiCheatService.resetMatch(updated.players.map((p) => p.id));
        emitRoomUpdated(roomId, updated);
        scheduleTransitionTimeout(roomId, MatchState.PLAYING, new Date(initializationEndsAt));
      }
    } else if (targetState === MatchState.PLAYING) {
      const updated = await roomManager.updateRoom(roomId, (r) => {
        r.state = MatchState.PLAYING;
        r.updatedAt = new Date().toISOString();
        const curRoundIndex = r.currentRound ?? 0;
        const curRound = r.rounds?.find(rnd => rnd.roundIndex === curRoundIndex);
        if (curRound) {
          curRound.startedAt = r.updatedAt;
          curRound.roundStartedAt = r.updatedAt;
          curRound.roundEndsAt = new Date(new Date(r.updatedAt).getTime() + curRound.duration * 1000).toISOString();
        }
      });

      if (updated) {
        emitRoomUpdated(roomId, updated);
        const curRoundIndex = updated.currentRound ?? 0;
        const curRound = updated.rounds?.find(rnd => rnd.roundIndex === curRoundIndex);
        const duration = curRound?.duration || 180;
        scheduleRoundTimeout(roomId, curRoundIndex, duration);

        if (updated.gameMode === GameMode.CHAOS_ARENA) {
          startChaosEventsLoop(roomId, curRoundIndex);
        }
      }
    }
  };

  const checkAndRunPendingTransitions = async (roomId: string) => {
    const room = await roomManager.getRoom(roomId);
    if (!room) return;

    const now = Date.now();

    if (room.state === MatchState.ROUND_SUMMARY && room.summaryEndsAt) {
      const summaryEndsTime = new Date(room.summaryEndsAt).getTime();
      if (now >= summaryEndsTime) {
        await executeTransition(roomId, MatchState.ROUND_INITIALIZING);
      } else {
        scheduleTransitionTimeout(roomId, MatchState.ROUND_INITIALIZING, new Date(room.summaryEndsAt));
      }
    } else if (room.state === MatchState.ROUND_INITIALIZING && room.initializationEndsAt) {
      const initEndsTime = new Date(room.initializationEndsAt).getTime();
      if (now >= initEndsTime) {
        await executeTransition(roomId, MatchState.PLAYING);
      } else {
        scheduleTransitionTimeout(roomId, MatchState.PLAYING, new Date(room.initializationEndsAt));
      }
    }
  };

  const scheduleRoundTimeout = (roomId: string, roundIndex: number, durationSeconds: number) => {
    const existing = roundTimeouts.get(roomId);
    if (existing) {
      clearTimeout(existing);
    }

    const timeout = setTimeout(async () => {
      try {
        const room = await roomManager.getRoom(roomId);
        if (room && room.currentRound === roundIndex && room.state === MatchState.PLAYING) {
          logger.info({ roomId, roundIndex }, 'Server authoritative round timer expired. Auto-submitting.');
          await autoSubmitRemainingPlayers(roomId, roundIndex);
        }
      } catch (err) {
        logger.error({ err, roomId, roundIndex }, 'Error in server round timeout');
      }
    }, durationSeconds * 1000);

    roundTimeouts.set(roomId, timeout);
  };

  const activeChaosTimers = new Map<string, NodeJS.Timeout[]>();

  const startChaosEventsLoop = (roomId: string, roundIndex: number) => {
    clearChaosTimers(roomId);

    const timers: NodeJS.Timeout[] = [];
    activeChaosTimers.set(roomId, timers);

    // Schedule events at: 35s, 75s, 115s, 155s, 195s, 235s, 275s
    const triggerTimes = [35, 75, 115, 155, 195, 235, 275];
    triggerTimes.forEach((seconds) => {
      const timeout = setTimeout(async () => {
        try {
          const room = await roomManager.getRoom(roomId);
          if (room && room.currentRound === roundIndex && room.state === MatchState.PLAYING) {
            const fencingToken = await roomManager.acquireLock(roomId);
            if (!fencingToken) return;

            try {
              let activeEvent: any = null;
              const updated = await roomManager.updateRoom(roomId, (r) => {
                activeEvent = chaosService.triggerChaosEvent(r);
              }, fencingToken);

              if (updated && activeEvent) {
                emitRoomUpdated(roomId, updated);
                // Schedule expiration timer for this specific event
                const expirationMs = activeEvent.durationMs || 10000;
                const expTimeout = setTimeout(async () => {
                  try {
                    const lockToken = await roomManager.acquireLock(roomId);
                    if (!lockToken) return;
                    try {
                      const cleared = await roomManager.updateRoom(roomId, (r) => {
                        chaosService.clearChaosEvent(r);
                      }, lockToken);
                      if (cleared) {
                        emitRoomUpdated(roomId, cleared);
                      }
                    } finally {
                      await roomManager.releaseLock(roomId);
                    }
                  } catch (e) {
                    logger.error({ error: e, roomId }, 'Error clearing chaos event');
                  }
                }, expirationMs);
                timers.push(expTimeout);
              }
            } finally {
              await roomManager.releaseLock(roomId);
            }
          }
        } catch (err) {
          logger.error({ err, roomId, roundIndex }, 'Error triggering chaos event');
        }
      }, seconds * 1000);
      timers.push(timeout);
    });
  };

  const clearChaosTimers = (roomId: string) => {
    const timers = activeChaosTimers.get(roomId);
    if (timers) {
      timers.forEach((t) => clearTimeout(t));
      activeChaosTimers.delete(roomId);
    }
  };

  const clearRoundTimeout = (roomId: string) => {
    const existing = roundTimeouts.get(roomId);
    if (existing) {
      clearTimeout(existing);
      roundTimeouts.delete(roomId);
    }
    clearChaosTimers(roomId);
  };

  const autoSubmitRemainingPlayers = async (roomId: string, roundIndex: number) => {
    try {
      const room = await roomManager.getRoom(roomId);
      if (!room) return;

      const round = room.rounds?.find(r => r.roundIndex === roundIndex);
      if (!round) return;

      // Find all players who have NOT submitted yet
      const remainingPlayers = room.players.filter((p) => {
        const sub = round.submissions?.[p.id];
        return !sub || !sub.submittedAt;
      });

      if (remainingPlayers.length === 0) return;

      // Update room state in Redis to mark these players as PENDING with their latest draft code (or empty)
      const updatedRoom = await roomManager.updateRoom(roomId, (r) => {
        const rnd = r.rounds?.find(rnd => rnd.roundIndex === roundIndex);
        if (rnd) {
          if (!rnd.submissions) {
            rnd.submissions = {};
          }
          remainingPlayers.forEach((p) => {
            const existingSub = rnd.submissions[p.id];
            rnd.submissions[p.id] = {
              userId: p.id,
              code: existingSub?.code || '',
              language: 'python',
              status: 'PENDING',
              submittedAt: new Date().toISOString(),
              attempts: (existingSub?.attempts || 0) + 1,
            };
          });
        }
      });

      if (!updatedRoom) return;

      // Broadcast room update so they are redirected to Waiting Results
      emitRoomUpdated(roomId, updatedRoom);

      // Trigger progressive judging for each of the auto-submitted players
      remainingPlayers.forEach((p) => {
        setTimeout(async () => {
          const clientSockets = await io.in(roomId).fetchSockets();
          const playerSocket = clientSockets.find((s) => (s as any).data?.user?.id === p.id);
          
          if (playerSocket) {
            playerSocket.emit('judge:progress', {
              submissionId: `sub-${p.id}-${Date.now()}`,
              roomId,
              userId: p.id,
              state: 'COMPILING',
            } as any);
          }

          setTimeout(async () => {
            if (playerSocket) {
              playerSocket.emit('judge:progress', {
                submissionId: `sub-${p.id}-${Date.now()}`,
                roomId,
                userId: p.id,
                state: 'RUNNING_PRETESTS',
              } as any);
            }

            setTimeout(async () => {
              await finalizePlayerSubmission(roomId, p.id);
            }, 500);
          }, 500);
        }, 500);
      });
    } catch (e) {
      logger.error({ error: e, roomId }, 'Error in autoSubmitRemainingPlayers');
    }
  };

  const emitRoomUpdated = (roomId: string, room: Room) => {
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (!clients) {
      io.to(roomId).emit(SocketEvents.ROOM_UPDATED, room);
      return;
    }

    for (const socketId of clients) {
      const socketObj = io.sockets.sockets.get(socketId);
      if (!socketObj) continue;

      const userId = (socketObj as any).data?.user?.id;
      const sanitizedRoom = sanitizeRoomForUser(room, userId);
      socketObj.emit(SocketEvents.ROOM_UPDATED, sanitizedRoom);
    }
  };

  const finalizePlayerSubmission = async (roomId: string, userId: string) => {
    try {
      const room = await roomManager.getRoom(roomId);
      if (!room) return;

      const roundIndex = room.currentRound ?? 1;
      const round = room.rounds?.find((r) => r.roundIndex === roundIndex);
      const sub = round?.submissions?.[userId];
      if (!sub) return;

      let testCases = round?.metadata?.testCaseWeights 
        ? Object.keys(round.metadata.testCaseWeights).map(id => ({ id }))
        : undefined;

      // Fetch real problem test cases from repository or problems.json
      if (round?.problemId) {
        if (_repositories?.problemRepository) {
          try {
            const problem = await _repositories.problemRepository.findById(round.problemId);
            if (problem && problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) {
              testCases = problem.testCases;
            }
          } catch (e) {
            logger.warn({ error: e, problemId: round.problemId }, 'Could not load problem test cases from repository');
          }
        }
        if (!testCases || testCases.length === 0 || !testCases.some((tc: any) => tc.input !== undefined)) {
          try {
            const fs = require('fs');
            const path = require('path');
            const problemsPath = path.resolve(__dirname, '../../data/problems.json');
            if (fs.existsSync(problemsPath)) {
              const raw = fs.readFileSync(problemsPath, 'utf8');
              const json = JSON.parse(raw);
              const p = json.find((x: any) => String(x.id) === String(round.problemId));
              if (p && Array.isArray(p.testCases) && p.testCases.length > 0) {
                testCases = p.testCases;
              }
            }
          } catch (e) {}
        }
      }

      // 1. Run the Judge Layer (extracts execution facts only)
      const facts = await judgeService.execute(sub.code, sub.language || 'python', testCases);

      // 2. Map facts to ExecutionEventPayload
      const event: ExecutionEventPayload = {
        submissionId: `sub-${userId}-${Date.now()}`,
        roomId,
        userId,
        state: ExecutionState.FINISHED,
        verdict: facts.verdict as any,
        results: facts.testResults,
        executionTimeMs: facts.executionTimeMs,
      };

      // 3. Delegate to matchFlowEngine.handleJudgeResult inside roomManager.updateRoom
      const fencingToken = await roomManager.acquireLock(roomId);
      if (!fencingToken) return;

      try {
        const updatedRoom = await roomManager.updateRoom(roomId, async (r) => {
          const restoredRoom = matchFlowEngine.restoreRoomStateForUser(r);
          
          // Keep user's code in memory so it's not discarded by handleJudgeResult
          const curRound = restoredRoom.rounds?.find(rnd => rnd.roundIndex === roundIndex);
          if (curRound && curRound.submissions?.[userId]) {
            curRound.submissions[userId].code = sub.code;
          }

          await matchFlowEngine.handleJudgeResult(restoredRoom, event, io);

          // Restore code so it persists in Redis database
          const finalRound = restoredRoom.rounds?.find(rnd => rnd.roundIndex === roundIndex);
          if (finalRound && finalRound.submissions?.[userId]) {
            finalRound.submissions[userId].code = sub.code;
          }
        }, fencingToken);

        if (updatedRoom) {
          if (updatedRoom.state !== MatchState.RESULTS && updatedRoom.state !== MatchState.ROUND_SUMMARY) {
            emitRoomUpdated(roomId, updatedRoom);
          }
        }
      } finally {
        await roomManager.releaseLock(roomId);
      }
    } catch (err) {
      logger.error({ err, roomId, userId }, 'Error in finalizePlayerSubmission');
    }
  };

  // Auth Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        (socket.handshake.headers.authorization?.split(' ')[1] as string | undefined);
      if (!token) {
        return next(new Error('AUTHENTICATION_REQUIRED'));
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      const user = await userRepository.findById(payload.sub);

      if (!user || user.tokenVersion !== payload.version) {
        return next(new Error('SESSION_EXPIRED'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      logger.error({ error }, 'Socket auth error');
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on(SocketEvents.CONNECTION, async (socket) => {
    const user = socket.data.user;
    if (!user) return;
    logger.info({ userId: user.id, socketId: socket.id }, 'User connected to socket');

    // Join user-specific notification room
    socket.join(`user:${user.id}`);

    // Sync initial social data
    socialService.getInitialData(user.id).then((initialData) => {
      socket.emit(SocketEvents.SOCIAL_INITIAL_SYNC, initialData);
    }).catch(err => {
      logger.error({ err, userId: user.id }, 'Failed to get initial social data');
    });

    // Socket.IO Rate Limiting / Abuse Protection (Issue 3.1 & User-Scoped Rate Limiting)
    const EVENT_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
      [SocketEvents.RUN_CODE as string]: { windowMs: 2000, maxRequests: 2 },
      [SocketEvents.SUBMIT_CODE as string]: { windowMs: 2000, maxRequests: 2 },
      [SocketEvents.CREATE_ROOM as string]: { windowMs: 5000, maxRequests: 2 },
      [SocketEvents.JOIN_ROOM as string]: { windowMs: 3000, maxRequests: 2 },
      [SocketEvents.LEAVE_ROOM as string]: { windowMs: 3000, maxRequests: 2 },
      [SocketEvents.TOGGLE_READY as string]: { windowMs: 1000, maxRequests: 2 },
      [SocketEvents.START_COUNTDOWN as string]: { windowMs: 5000, maxRequests: 2 },
      [SocketEvents.TELEMETRY_SYNC as string]: { windowMs: 5000, maxRequests: 3 },
      ['game:code_sync']: { windowMs: 1000, maxRequests: 10 },
      [SocketEvents.PING_SYNC as string]: { windowMs: 1000, maxRequests: 10 },
      [SocketEvents.ROOM_MESSAGE as string]: { windowMs: 2000, maxRequests: 5 }, // Enforce limit on chat messages
    };
    const DEFAULT_LIMIT = { windowMs: 1000, maxRequests: 5 };

    socket.use(([event, ..._args], next) => {
      const config = EVENT_LIMITS[event] || DEFAULT_LIMIT;
      socketRateLimiter.isRateLimited(user.id, event, config.windowMs, config.maxRequests)
        .then((isLimited) => {
          if (isLimited) {
            logger.warn({ userId: user.id, event, socketId: socket.id }, 'User rate limit exceeded');
            socket.emit(SocketEvents.ROOM_ERROR, `Rate limit exceeded for event "${event}". Please slow down.`);
            return;
          }
          next();
        })
        .catch((err) => next(err));
    });

    // Register active socket for the user (Issue 1)
    let socketSet = userActiveSockets.get(user.id);
    const isFirstSocket = !socketSet || socketSet.size === 0;
    if (!socketSet) {
      socketSet = new Set();
      userActiveSockets.set(user.id, socketSet);
    }
    socketSet.add(socket.id);

    if (isFirstSocket) {
      // Sync presence on first connection
      io.emit(SocketEvents.PRESENCE_UPDATED, { userId: user.id, status: 'ONLINE' });
    }

    // Handle Reconnect / Room sync
    const existingRoom = await roomManager.getRoomByPlayerId(user.id);
    if (existingRoom) {
      socket.join(existingRoom.id);
      
      if (isFirstSocket) {
        const updatedRoom = await roomManager.updatePlayerStatus(user.id, true);
        if (updatedRoom) {
          emitRoomUpdated(existingRoom.id, updatedRoom);
        }
      } else {
        // Send current room state directly to the new socket/tab
        socket.emit(SocketEvents.ROOM_UPDATED, existingRoom);
      }
    }

    // Ping/Pong Sync
    socket.on(SocketEvents.PING_SYNC, (data: { clientTime: string }) => {
      try {
        const parsed = pingSyncSchema.parse(data);
        socket.emit(SocketEvents.PONG_SYNC, {
          clientTime: parsed.clientTime,
          serverTime: new Date().toISOString(),
        });
      } catch {
        // Ignore validation errors for system events
      }
    });

    // Create Room
    socket.on(SocketEvents.CREATE_ROOM, async (data: { maxPlayers: number; gameMode?: any; options?: any }) => {
      try {
        const parsed = createRoomSchema.parse(data);
        const room = await roomManager.createRoom(user, parsed.maxPlayers, parsed.gameMode as any, parsed.options);
        socket.join(room.id);
        socket.emit(SocketEvents.ROOM_UPDATED, room);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create room';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Join Room
    socket.on(SocketEvents.JOIN_ROOM, async (data: { roomId: string }) => {
      const startTime = Date.now();
      try {
        const parsed = joinRoomSchema.parse(data);
        
        const existingRoom = await roomManager.getRoom(parsed.roomId);
        const playerInRoom = existingRoom?.players.find(p => p.id === user.id);
        const wasConnected = playerInRoom?.connected;

        let joinType: 'FIRST_JOIN' | 'REJOIN' | 'DUPLICATE' = 'FIRST_JOIN';
        if (playerInRoom) {
          joinType = wasConnected ? 'DUPLICATE' : 'REJOIN';
        }

        const room = await roomManager.joinRoom(parsed.roomId, user);
        socket.join(room.id);

        if (joinType === 'DUPLICATE') {
          // Idempotent join: just acknowledge the room update to the joining socket only, do NOT broadcast
          socket.emit(SocketEvents.ROOM_UPDATED, room);
        } else {
          // First join or reconnect rebind: broadcast room update to everyone
          emitRoomUpdated(room.id, room);
          await checkAndRunPendingTransitions(room.id);
        }

        logger.info({
          userId: user.id,
          socketId: socket.id,
          roomId: room.id,
          joinType,
          result: 'SUCCESS',
          roomPlayerCount: room.players.length,
          durationMs: Date.now() - startTime,
        }, 'Player joined room event processed');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to join room';
        socket.emit(SocketEvents.ROOM_ERROR, message);
        
        logger.error({
          userId: user.id,
          socketId: socket.id,
          roomId: data?.roomId,
          result: 'ERROR',
          errorMessage: message,
          durationMs: Date.now() - startTime,
        }, 'Player join room event failed');
      }
    });

    // Toggle Ready
    socket.on(SocketEvents.TOGGLE_READY, async () => {
      const room = await roomManager.toggleReady(user.id);
      if (room) {
        emitRoomUpdated(room.id, room);
      }
    });

    // Chat Message (Issue 2 Payload Validation)
    socket.on(SocketEvents.ROOM_MESSAGE, async (data: { message: string }) => {
      try {
        const parsed = chatMessageSchema.parse(data);
        const room = await roomManager.getRoomByPlayerId(user.id);
        if (room) {
          io.to(room.id).emit(SocketEvents.ROOM_MESSAGE, {
            userId: user.id,
            username: user.username,
            message: parsed.message,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid chat message';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Start Countdown
    socket.on(SocketEvents.START_COUNTDOWN, async () => {
      const room = await roomManager.startCountdown(user.id);
      if (!room) return;

      // Reset suspicion scores for all room players when a match begins
      antiCheatService.resetMatch(room.players.map((p) => p.id));

      emitRoomUpdated(room.id, room);
      io.to(room.id).emit(SocketEvents.START_COUNTDOWN);

      const countdownDuration = 5000; // 5 seconds
      setTimeout(async () => {
        try {
          const updatedRoom = await roomManager.startMatch(room.id);
          if (updatedRoom && updatedRoom.state === MatchState.PLAYING) {
            antiCheatService.resetMatch(updatedRoom.players.map((p) => p.id));
            emitRoomUpdated(room.id, updatedRoom);
            io.to(room.id).emit(SocketEvents.GAME_START);

            // Start server-authoritative round timer
            const firstRound = updatedRoom.rounds?.find(r => r.roundIndex === updatedRoom.currentRound);
            const duration = firstRound?.duration || 180;
            scheduleRoundTimeout(room.id, updatedRoom.currentRound ?? 1, duration);

            if (updatedRoom.gameMode === GameMode.CHAOS_ARENA) {
              startChaosEventsLoop(room.id, updatedRoom.currentRound ?? 1);
            }
          } else {
            // Match startup failed. Revert clients to waiting room and notify them of the error.
            if (updatedRoom) {
              emitRoomUpdated(room.id, updatedRoom);
            } else {
              // Ensure consistent WAITING state if startMatch returned null
              const fallbackRoom = await roomManager.updateRoom(room.id, (r) => {
                r.state = MatchState.WAITING;
                r.countdownStartAt = undefined;
              }).catch(() => null);
              if (fallbackRoom) {
                emitRoomUpdated(room.id, fallbackRoom);
              }
            }
            io.to(room.id).emit(SocketEvents.ROOM_ERROR, 'Failed to start match. Reverted to waiting room.');
          }
        } catch (err: any) {
          logger.error({ err, roomId: room.id }, 'Uncaught exception during match start sequence');
          io.to(room.id).emit(SocketEvents.ROOM_ERROR, 'An unexpected error occurred while starting the match.');
        }
      }, countdownDuration);
    });

    // Telemetry Sync
    socket.on(
      SocketEvents.TELEMETRY_SYNC,
      async (data: { roomId: string; events: TelemetryEvent[] }) => {
        try {
          const parsed = telemetrySyncSchema.parse(data);
          // Map to ensure we use the TelemetryEvent union properly
          const typedEvents: TelemetryEvent[] = parsed.events as TelemetryEvent[];

          const result = await antiCheatService.processTelemetry({
            roomId: parsed.roomId,
            userId: user.id,
            events: typedEvents,
            totalKeystrokes: typedEvents.filter((e: TelemetryEvent) => e.type === 'keystroke')
              .length,
            totalPastedChars: typedEvents.reduce((acc: number, e: TelemetryEvent) => {
              if (e.type === 'paste') {
                return acc + (e as PasteTelemetry).data.length;
              }
              return acc;
            }, 0),
            tabSwitches: typedEvents.filter((e: TelemetryEvent) => e.type === 'tab_switch').length,
          });

          if (result.isSuspicious) {
            socket.emit(
              SocketEvents.CHEAT_WARNING,
              'Suspicious behavior detected. Competitive integrity is monitored.',
            );
            logger.warn({ userId: user.id, score: result.score }, 'User triggered suspicion');
          }
        } catch {
          // Validation errors ignored for telemetry
        }
      },
    );

    // Submit Math Answer
    socket.on('game:submit_math_answer', async (data: { answer: number }) => {
      try {
        const parsed = submitMathAnswerSchema.parse(data);
        const room = await roomManager.getRoomByPlayerId(user.id);
        if (!room || room.state !== MatchState.PLAYING) return;

        const fencingToken = await roomManager.acquireLock(room.id);
        if (!fencingToken) return;

        try {
          let correct = false;
          const updated = await roomManager.updateRoom(room.id, (r) => {
            const res = chaosService.processMathAnswer(r, user.id, parsed.answer);
            correct = res.correct;
          }, fencingToken);

          if (updated) {
            emitRoomUpdated(room.id, updated);
            if (correct) {
              io.to(room.id).emit('game:math_solved' as any, {
                userId: user.id,
                username: user.username,
              });
            }
          }
        } finally {
          await roomManager.releaseLock(room.id);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid math answer';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Submit Code
    socket.on(SocketEvents.SUBMIT_CODE, async (data: { code: string; keystrokes?: number }) => {
      try {
        const parsed = submitCodeSchema.parse(data);
        const room = await roomManager.getRoomByPlayerId(user.id);
        if (!room || room.state !== MatchState.PLAYING) return;

        const roundIndex = room.currentRound ?? 1;
        const round = room.rounds?.find(r => r.roundIndex === roundIndex);
        if (!round) return;

        // Server authoritative deadline timing validation
        const startedTime = round.roundStartedAt || round.startedAt;
        if (startedTime) {
          const endsAt = round.roundEndsAt ? new Date(round.roundEndsAt).getTime() : new Date(startedTime).getTime() + (round.duration * 1000);
          if (Date.now() > endsAt) {
            return socket.emit(SocketEvents.ROOM_ERROR, 'Submission rejected: round time limit expired.');
          }
        }

        const existingSub = round.submissions?.[user.id];
        if (existingSub) {
          if (room.gameMode === GameMode.MULTI_ROUND) {
            if (existingSub.status === 'ACCEPTED') {
              return socket.emit(SocketEvents.ROOM_ERROR, 'Code already accepted. No need to resubmit.');
            }
            if (existingSub.status === 'PENDING') {
              return socket.emit(SocketEvents.ROOM_ERROR, 'Previous submission is still being judged.');
            }
          } else {
            if (existingSub.submittedAt) {
              return socket.emit(SocketEvents.ROOM_ERROR, 'Code already submitted.');
            }
          }
        }

        // Anti-cheat validation (exempt PREDICT_OUTPUT as users only type a short digit or word)
        const isPredictOutput = (round.roundType as any) === 'PREDICT_OUTPUT' || (round.roundType as any) === RoundType.PREDICT_OUTPUT;
        const isValid = isPredictOutput || antiCheatService.validateSubmission(
          user.id,
          parsed.code,
          parsed.keystrokes || 0,
          round.problem?.initialCode
        );
        if (!isValid) {
          logger.warn({ userId: user.id, roomId: room.id }, 'Player disqualified due to anomaly detection');

          const opponent = room.players.find(p => p.id !== user.id);
          const rIndex = room.currentRound ?? 1;

          const updatedRoom = await roomManager.updateRoom(room.id, (r) => {
            r.state = MatchState.RESULTS;
            const rnd = r.rounds?.find(roundItem => roundItem.roundIndex === rIndex);
            if (rnd) {
              rnd.submissions = rnd.submissions || {};
              rnd.submissions[user.id] = {
                userId: user.id,
                code: parsed.code,
                language: 'python',
                status: 'DISQUALIFIED' as any,
                submittedAt: new Date().toISOString(),
                attempts: (rnd.submissions[user.id]?.attempts || 0) + 1,
                score: 0,
                disqualificationReason: 'Anomaly Detection: Unnatural typing telemetry / external paste detected',
              } as any;
              rnd.winner = opponent?.id;
            }

            r.roundResults = r.roundResults || [];
            const scores: Record<string, number> = {
              [user.id]: 0,
            };
            if (opponent) {
              scores[opponent.id] = 1000;
            }
            const existingIndex = r.roundResults.findIndex(res => res.roundIndex === rIndex);
            if (existingIndex >= 0) {
              r.roundResults[existingIndex] = { roundIndex: rIndex, winner: opponent?.id, scores };
            } else {
              r.roundResults.push({ roundIndex: rIndex, winner: opponent?.id, scores });
            }
          });

          clearRoundTimeout(room.id);
          if (updatedRoom) {
            matchFlowEngine.emit('roundEnded', { room: updatedRoom, roundIndex: rIndex });
            emitRoomUpdated(room.id, updatedRoom);
          }
          return;
        }

        // Update room in Redis with player's submission marked as PENDING
        const updatedRoom = await roomManager.updateRoom(room.id, (r) => {
          const rIndex = r.currentRound ?? 1;
          const rnd = r.rounds?.find(rnd => rnd.roundIndex === rIndex);
          if (rnd) {
            if (!rnd.submissions) {
              rnd.submissions = {};
            }
            rnd.submissions[user.id] = {
              userId: user.id,
              code: parsed.code,
              language: 'python',
              status: 'PENDING',
              submittedAt: new Date().toISOString(),
              attempts: (rnd.submissions[user.id]?.attempts || 0) + 1,
            };
          }
        });

        if (!updatedRoom) return;

        // Check if all players have submitted
        const rIndex = updatedRoom.currentRound ?? 1;
        const rnd = updatedRoom.rounds?.find(rnd => rnd.roundIndex === rIndex);
        if (rnd) {
          const allSubmitted = updatedRoom.players.every((p) => {
            const sub = rnd.submissions?.[p.id];
            return sub && sub.submittedAt;
          });
          if (allSubmitted) {
            clearRoundTimeout(updatedRoom.id);
          }
        }

        // Immediately broadcast sanitized room update to redirect the player who submitted to waiting results
        emitRoomUpdated(updatedRoom.id, updatedRoom);

        // Server-side Predict Output local evaluation bypass
        const currentRound = updatedRoom.rounds?.find(r => r.roundIndex === rIndex);
        if (currentRound && ((currentRound.roundType as any) === 'PREDICT_OUTPUT' || (currentRound.roundType as any) === RoundType.PREDICT_OUTPUT)) {
          try {
            const problem = await _repositories?.problemRepository?.findById(currentRound.problemId);
            const expectedSolution = problem?.solutionCode || '';

            const extractPrediction = (raw: string) => {
              if (!raw) return '';
              const nonCommentLines = raw
                .split('\n')
                .map(line => line.replace(/#.*$/, '').trim())
                .filter(line => line.length > 0);

              const cleaned = nonCommentLines.join('\n').trim();
              if (!cleaned) return '';

              // Check if wrapped in print(...)
              const printMatch = cleaned.match(/print\s*\(\s*(['"]?)(.*?)\1\s*\)/s);
              if (printMatch) {
                return printMatch[2].trim().toLowerCase();
              }

              // Extract last non-empty line and strip quotes
              const lastLine = nonCommentLines[nonCommentLines.length - 1] || cleaned;
              return lastLine.replace(/^['"]|['"]$/g, '').trim().toLowerCase();
            };

            const userAns = extractPrediction(parsed.code);
            const expectedAns = extractPrediction(expectedSolution || problem?.testCases?.[0]?.expectedOutput || '');
            const isCorrect = userAns.length > 0 && userAns === expectedAns;

            const results = [
              {
                testCaseId: 'predict-output',
                status: isCorrect ? 'passed' as const : 'failed' as const,
                executionTimeMs: 0,
                memoryUsageMb: 0,
              }
            ];

            setTimeout(async () => {
              const fencingToken = await roomManager.acquireLock(room.id);
              if (fencingToken) {
                try {
                  await roomManager.updateRoom(room.id, async (r) => {
                    const restoredRoom = matchFlowEngine.restoreRoomStateForUser(r);
                    const curRound = restoredRoom.rounds?.find(rnd => rnd.roundIndex === rIndex);
                    if (curRound && curRound.submissions?.[user.id]) {
                      curRound.submissions[user.id].code = parsed.code;
                    }

                    await matchFlowEngine.handleJudgeResult(restoredRoom, {
                      submissionId: `sub-${user.id}-${Date.now()}`,
                      roomId: room.id,
                      userId: user.id,
                      state: ExecutionState.FINISHED,
                      verdict: isCorrect ? ExecutionVerdict.ACCEPTED : ExecutionVerdict.WRONG_ANSWER,
                      executionTimeMs: 0,
                      results,
                    }, io);

                    const finalRound = restoredRoom.rounds?.find(rnd => rnd.roundIndex === rIndex);
                    if (finalRound && finalRound.submissions?.[user.id]) {
                      finalRound.submissions[user.id].code = parsed.code;
                    }
                  }, fencingToken);
                } finally {
                  await roomManager.releaseLock(room.id);
                }
              }
            }, 500);
          } catch (err) {
            logger.error({ err, userId: user.id, roomId: room.id }, 'Error evaluating Predict Output locally');
            socket.emit(SocketEvents.ROOM_ERROR, 'Failed to process predict output.');
          }
          return;
        }

        const useRealJudge = process.env.USE_REAL_JUDGE === 'true';

        if (useRealJudge) {
          try {
            const problem = await _repositories?.problemRepository?.findById(round.problemId);
            const testCases = problem?.testCases || [];
            
            const payload: SubmissionPayload = {
              submissionId: `sub-${user.id}-${Date.now()}`,
              roomId: room.id,
              userId: user.id,
              code: parsed.code,
              language: 'python',
              mode: room.gameMode || GameMode.MULTI_ROUND,
              problemId: round.problemId,
              testCases: testCases.map((tc: any) => ({
                id: tc.id || tc.testCaseId || '',
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || tc.output || '',
                isHidden: !!tc.isHidden,
                weight: tc.weight || 10,
              })),
              timeLimitMs: problem?.timeLimit || 2000,
              memoryLimitMb: problem?.memoryLimit || 128,
            };

            await judgeClient.submitCode(payload);
          } catch (err) {
            logger.error({ err, userId: user.id, roomId: room.id }, 'Error submitting code to real judge');
            socket.emit(SocketEvents.ROOM_ERROR, 'Failed to submit code to real judge.');
          }
        } else {
          // Simulate progressive judge response
          setTimeout(async () => {
            socket.emit('judge:progress', {
              submissionId: `sub-${user.id}-${Date.now()}`,
              roomId: room.id,
              userId: user.id,
              state: 'COMPILING',
            } as any);
            
            setTimeout(async () => {
              socket.emit('judge:progress', {
                submissionId: `sub-${user.id}-${Date.now()}`,
                roomId: room.id,
                userId: user.id,
                state: 'RUNNING_PRETESTS',
              } as any);
              
              setTimeout(async () => {
                await finalizePlayerSubmission(room.id, user.id);
              }, 500);
            }, 500);
          }, 500);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid submit code payload';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Run Code
    socket.on(SocketEvents.RUN_CODE as any, async (data: { code: string }) => {
      try {
        const parsed = runCodeSchema.parse(data);
        const room = await roomManager.getRoomByPlayerId(user.id);
        if (!room || room.state !== MatchState.PLAYING) {
          return socket.emit(SocketEvents.ROOM_ERROR, 'Cannot run code. Match is not active.');
        }

        const roundIndex = room.currentRound ?? 1;
        const round = room.rounds?.find(r => r.roundIndex === roundIndex);
        if (!round) {
          return socket.emit(SocketEvents.ROOM_ERROR, 'Round not found.');
        }
        const isPredictOutput = (round.roundType as any) === 'PREDICT_OUTPUT' || (round.roundType as any) === RoundType.PREDICT_OUTPUT;
        if (isPredictOutput) {
          return socket.emit(SocketEvents.ROOM_ERROR, 'Dry-run execution is disabled for Predict / Trace Output rounds.');
        }

        const problem = await _repositories?.problemRepository?.findById(round.problemId);
        const publicTestCase = problem?.testCases?.find((tc: any) => !tc.isHidden);
        const sampleInput = publicTestCase?.input || '';

        const result = await playerContainerManager.runCodeForPlayer(user.id, parsed.code, sampleInput, true);
        socket.emit(SocketEvents.RUN_CODE_RESULT as any, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred while executing the code.';
        logger.error({ err, userId: user.id }, 'Error executing run_code');
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Code Sync
    socket.on('game:code_sync', async (data: { code: string }) => {
      try {
        const parsed = codeSyncSchema.parse(data);
        const room = await roomManager.getRoomByPlayerId(user.id);
        if (!room || room.state !== MatchState.PLAYING) return;

        const roundIndex = room.currentRound ?? 1;
        await roomManager.updateRoom(room.id, (r) => {
          const rnd = r.rounds?.find(rnd => rnd.roundIndex === roundIndex);
          if (rnd) {
            if (!rnd.submissions) {
              rnd.submissions = {};
            }
            if (!rnd.submissions[user.id]) {
              rnd.submissions[user.id] = {
                userId: user.id,
                code: parsed.code,
                language: 'python',
                status: 'DRAFT',
                submittedAt: '',
                attempts: 0,
              };
            } else if (!rnd.submissions[user.id].submittedAt) {
              rnd.submissions[user.id].code = parsed.code;
              rnd.submissions[user.id].status = 'DRAFT';
            }
          }
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid code sync payload';
        socket.emit(SocketEvents.ROOM_ERROR, message);
      }
    });

    // Leave Room
    socket.on(SocketEvents.LEAVE_ROOM, async () => {
      const room = await roomManager.getRoomByPlayerId(user.id);
      if (room && (room.state === MatchState.PLAYING || room.state === MatchState.SUBMITTED_WAITING || room.state === MatchState.ROUND_SUMMARY)) {
        // Player leaves active match -> forfeit the game for them!
        const winner = room.players.find((p) => p.id !== user.id);
        if (winner) {
          const finalizedRoom = await roomManager.updateRoom(room.id, (r) => {
            r.state = MatchState.RESULTS;
            r.updatedAt = new Date().toISOString();
          });
          if (finalizedRoom) {
            emitRoomUpdated(finalizedRoom.id, finalizedRoom);
            io.to(finalizedRoom.id).emit(SocketEvents.GAME_END, {
              winnerId: winner.id,
              forfeit: true,
              message: `${user.username} left the match and forfeited.`,
            });
            await playerContainerManager.destroyContainersForMatch(room.id).catch(() => {});
          }
        }
      }

      const result = await roomManager.leaveRoom(user.id);
      if (result) {
        socket.leave(result.roomId);
        if (result.room) {
          emitRoomUpdated(result.roomId, result.room);
        }
      }
    });

    // Return to Lobby
    socket.on(SocketEvents.RETURN_TO_LOBBY, async () => {
      const room = await roomManager.returnToLobby(user.id);
      if (room) {
        antiCheatService.resetMatch(room.players.map((p) => p.id));
        socket.emit(SocketEvents.ROOM_UPDATED, room);
      }
    });

    // Disconnect
    socket.on(SocketEvents.DISCONNECT, async (reason: string) => {
      logger.info({ userId: user.id, socketId: socket.id, reason }, 'User disconnected from socket');

      const socketSet = userActiveSockets.get(user.id);
      if (socketSet) {
        socketSet.delete(socket.id);
        if (socketSet.size > 0) {
          // User still has other active sockets (multi-tab / refreshed reconnects)
          return;
        }
        userActiveSockets.delete(user.id);
        // Do NOT clear rate limiters here to prevent multi-tab / reconnect bypasses (Issue 1)
      }

      await matchmakingService.handleDisconnect(user.id);

      const activeRoom = await roomManager.getRoomByPlayerId(user.id);
      if (activeRoom) {
        const isGameActive = activeRoom.state === MatchState.PLAYING || 
                             activeRoom.state === MatchState.SUBMITTED_WAITING || 
                             activeRoom.state === MatchState.ROUND_SUMMARY;

        if (isGameActive) {
          const updated = await roomManager.updatePlayerStatus(user.id, false);
          if (updated) {
            emitRoomUpdated(updated.id, updated);

            const disconnectedUserId = user.id;
            const graceTimerSec = 30; // 30 seconds window
            logger.info({ roomId: activeRoom.id, userId: disconnectedUserId }, 'Active match player disconnected. Starting 30s reconnect grace timer.');
            
            setTimeout(async () => {
              const currentRoom = await roomManager.getRoom(activeRoom.id);
              if (currentRoom && (currentRoom.state === MatchState.PLAYING || currentRoom.state === MatchState.SUBMITTED_WAITING || currentRoom.state === MatchState.ROUND_SUMMARY)) {
                const player = currentRoom.players.find((p) => p.id === disconnectedUserId);
                if (player && !player.connected) {
                  // Find the other player (winner)
                  const winner = currentRoom.players.find((p) => p.id !== disconnectedUserId);
                  if (winner) {
                    const finalizedRoom = await roomManager.updateRoom(activeRoom.id, (r) => {
                      r.state = MatchState.RESULTS;
                      r.updatedAt = new Date().toISOString();
                    });
                    if (finalizedRoom) {
                      emitRoomUpdated(finalizedRoom.id, finalizedRoom);
                      io.to(finalizedRoom.id).emit(SocketEvents.GAME_END, {
                        winnerId: winner.id,
                        forfeit: true,
                        message: `${player.username} disconnected for too long and forfeited.`,
                      });
                      // Clean up player containers on forfeit
                      await playerContainerManager.destroyContainersForMatch(activeRoom.id).catch(() => {});
                      
                      // Remove the forfeited player from the room
                      await roomManager.leaveRoom(disconnectedUserId).catch(() => {});
                    }
                    logger.info({ roomId: activeRoom.id, winnerId: winner.id }, 'Match forfeited due to player disconnect timeout');
                  }
                }
              }
            }, graceTimerSec * 1000);
          }
        } else {
          // Lobby, Results, or other non-active state -> remove player from the room immediately
          const leaveRes = await roomManager.leaveRoom(user.id);
          if (leaveRes && leaveRes.room) {
            emitRoomUpdated(leaveRes.roomId, leaveRes.room);
          } else if (leaveRes) {
            // Room became empty and was deleted
            io.to(leaveRes.roomId).emit(SocketEvents.ROOM_UPDATED as any, null as any);
          }
        }
      }

      // Sync presence
      io.emit(SocketEvents.PRESENCE_UPDATED, { userId: user.id, status: 'OFFLINE' });
    });

    socket.on(SocketEvents.FRIEND_REQUEST_SEND, async (data: { toUserId?: string; toPlayerId?: string }) => {
      try {
        let targetUserId = data.toUserId;
        if (data.toPlayerId) {
          const targetUser = await userRepository.findByPlayerId(data.toPlayerId);
          if (!targetUser) throw new Error('User not found by Player ID');
          targetUserId = targetUser.id;
        }
        if (!targetUserId) throw new Error('Target user is required');
        if (user.id === targetUserId) throw new Error('Cannot add yourself');

        const request = await socialService.sendFriendRequest(user.id, targetUserId);
        
        if (request.status === 'ACCEPTED') {
          // Mutual friending occurred! Sync friends list of both users
          const fromUserSockets = userActiveSockets.get(user.id);
          const toUserSockets = userActiveSockets.get(targetUserId);

          const [f1, f2, n1, n2] = await Promise.all([
            socialService.getFriends(user.id),
            socialService.getFriends(targetUserId),
            notificationService.getNotifications(user.id),
            notificationService.getNotifications(targetUserId),
          ]);

          if (fromUserSockets) {
            fromUserSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: f1, notifications: n1, activities: [] }));
          }
          if (toUserSockets) {
            toUserSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: f2, notifications: n2, activities: [] }));
          }
          socket.emit(SocketEvents.ROOM_ERROR, 'You are now friends!');
        } else {
          // Notify target user via live notification event if online
          const targetSockets = userActiveSockets.get(targetUserId);
          if (targetSockets) {
            const freshNotifications = await notificationService.getNotifications(targetUserId);
            targetSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: [], notifications: freshNotifications, activities: [] }));
          }
          socket.emit(SocketEvents.ROOM_ERROR, 'Friend request sent successfully!');
        }
      } catch (err: any) {
        socket.emit(SocketEvents.ROOM_ERROR, err.message || 'Failed to send friend request');
      }
    });

    socket.on(SocketEvents.FRIEND_REQUEST_RESPONSE, async (data: { requestId: string; action: 'ACCEPT' | 'REJECT' }) => {
      try {
        const req = await socialService.respondToFriendRequest(user.id, data.requestId, data.action);
        
        if (req && data.action === 'ACCEPT') {
          const fromUserSockets = userActiveSockets.get(req.fromUserId);
          const toUserSockets = userActiveSockets.get(req.toUserId);

          const [f1, f2, n1, n2] = await Promise.all([
            socialService.getFriends(req.fromUserId),
            socialService.getFriends(req.toUserId),
            notificationService.getNotifications(req.fromUserId),
            notificationService.getNotifications(req.toUserId),
          ]);

          if (fromUserSockets) {
            fromUserSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: f1, notifications: n1, activities: [] }));
          }
          if (toUserSockets) {
            toUserSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: f2, notifications: n2, activities: [] }));
          }
        }
      } catch (err: any) {
        socket.emit(SocketEvents.ROOM_ERROR, err.message || 'Failed to respond to friend request');
      }
    });

    socket.on(SocketEvents.FRIEND_REMOVED, async (data: { friendId: string }) => {
      try {
        await socialService.removeFriend(user.id, data.friendId);
        
        const fromUserSockets = userActiveSockets.get(user.id);
        const toUserSockets = userActiveSockets.get(data.friendId);

        const [f1, f2] = await Promise.all([
          socialService.getFriends(user.id),
          socialService.getFriends(data.friendId),
        ]);

        if (fromUserSockets) {
          fromUserSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: f1, notifications: [], activities: [] }));
        }
        if (toUserSockets) {
          toUserSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: f2, notifications: [], activities: [] }));
        }
      } catch (err: any) {
        socket.emit(SocketEvents.ROOM_ERROR, err.message || 'Failed to remove friend');
      }
    });

    socket.on('social:friend_request_cancel' as any, async (data: { toUserId: string }) => {
      try {
        const requests = await _repositories?.friendRepository?.getPendingRequests(data.toUserId);
        const outgoing = requests?.find((r: any) => r.fromUserId === user.id);
        if (outgoing) {
          await _repositories?.friendRepository?.deleteRequest(outgoing.id);
          
          // Sync notification state on target
          const targetSockets = userActiveSockets.get(data.toUserId);
          if (targetSockets) {
            const freshNotifications = await notificationService.getNotifications(data.toUserId);
            targetSockets.forEach(sid => io.to(sid).emit(SocketEvents.SOCIAL_INITIAL_SYNC, { friends: [], notifications: freshNotifications, activities: [] }));
          }
        }
      } catch (err: any) {
        socket.emit(SocketEvents.ROOM_ERROR, err.message || 'Failed to cancel friend request');
      }
    });

    socket.on(SocketEvents.NOTIFICATION_READ, async (data: { notificationId: string }) => {
      try {
        await notificationService.markAsRead(user.id, data.notificationId);
      } catch (err: any) {
        logger.error({ err }, 'Failed to mark notification as read');
      }
    });

    socket.on(SocketEvents.DUEL_INVITE_SEND, async (data: { toUserId: string }) => {
      try {
        await socialService.sendDuelInvite(user.id, data.toUserId);
      } catch (err: any) {
        socket.emit(SocketEvents.ROOM_ERROR, err.message || 'Failed to send duel invite');
      }
    });

    socket.on(SocketEvents.DUEL_INVITE_RESPONSE, async (data: { inviteId: string; action: 'ACCEPT' | 'REJECT' }) => {
      try {
        const invite = await socialService.respondToDuelInvite(user.id, data.inviteId, data.action);
        if (data.action === 'ACCEPT' && invite) {
          const u1 = await userRepository.findById(invite.fromUserId);
          const u2 = await userRepository.findById(invite.toUserId);
          if (u1 && u2) {
            const room = await roomManager.createRoom(u1, 2);
            await roomManager.joinRoom(room.id, u2);
            io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
          }
        }
      } catch (err: any) {
        socket.emit(SocketEvents.ROOM_ERROR, err.message || 'Failed to respond to duel invite');
      }
    });

    // --- Matchmaking Events (Disabled for Private-Room MVP) ---
    /*
    socket.on(SocketEvents.JOIN_QUEUE, async () => {
      await matchmakingService.joinQueue(user, socket.id);
      const status = await matchmakingService.getQueueStatus(user.id);
      socket.emit(SocketEvents.QUEUE_STATUS, status);
    });

    socket.on(SocketEvents.LEAVE_QUEUE, async () => {
      await matchmakingService.leaveQueue(user.id);
      socket.emit(SocketEvents.QUEUE_STATUS, null);
    });

    socket.on(SocketEvents.ACCEPT_MATCH, async (data: { matchId: string }) => {
      try {
        const result = await matchmakingService.acceptMatch(user.id, data.matchId);
        if (result?.ready) {
          const users = await Promise.all(
            result.players.map((p) => userRepository.findById(p.userId)),
          );
          const validUsers = users.filter((u: User | null): u is User => u !== null);

          if (validUsers.length === 2) {
            const room = await roomManager.createRoom(validUsers[0], 2);
            await roomManager.joinRoom(room.id, validUsers[1]);
            io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
          }
        }
      } catch (error) {
        logger.error({ error, userId: user.id }, 'Error accepting match');
        socket.emit(SocketEvents.ROOM_ERROR, 'An error occurred while starting the match');
      }
    });
    */
  });

  // Matchmaking Ticker (Disabled for Private-Room MVP)
  /*
  setInterval(async () => {
    await matchmakingService.cleanupStaleMatches();
    const foundMatches = await matchmakingService.findMatches();
    foundMatches.forEach((match) => {
      match.players.forEach((p) => {
        io.to(p.socketId).emit(SocketEvents.MATCH_FOUND, { matchId: match.matchId });
      });
    });
  }, 5000);
  */

  // Room Cleanup Interval
  setInterval(
    () => {
      roomManager.cleanupStaleRooms();
    },
    5 * 60 * 1000,
  );

  return io;
};
