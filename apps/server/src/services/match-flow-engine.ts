import { Room, GameMode, MatchState, Round, ExecutionVerdict, ExecutionEventPayload } from '@code-duel/types';
import { MultiRoundService } from './multi-round-service';
import { QuickodeService } from './quickode-service';
import { ChaosService } from './chaos-service';
import { EventEmitter } from 'events';
import { SocketEvents } from '@code-duel/shared';
import { Server } from 'socket.io';
import { sanitizeRoomForUser } from '../socket/room-manager';

export class MatchFlowEngine extends EventEmitter {
  constructor(
    private multiRoundService: MultiRoundService,
    private quickodeService: QuickodeService,
    private chaosService: ChaosService
  ) {
    super();
  }

  async initializeMatch(room: Room, mode: GameMode, options?: Record<string, unknown>): Promise<void> {
    switch (mode) {
      case GameMode.MULTI_ROUND:
        await this.multiRoundService.initializeRoom(room);
        break;
      case GameMode.QUICKODE:
        await this.quickodeService.initializeRoom(room, { duration: (options?.duration as number) || 120 });
        break;
      case GameMode.CHAOS_ARENA:
        await this.chaosService.initializeRoom(room);
        break;
      default:
        room.gameMode = GameMode.MULTI_ROUND;
        await this.multiRoundService.initializeRoom(room);
    }
    
    room.state = MatchState.WAITING;
    room.updatedAt = new Date().toISOString();
  }

  async transitionToNextRound(room: Room, playerHistories: import('@code-duel/types').ProblemHistoryEntry[][] = []): Promise<Round | null> {
    let newRound: Round | null = null;
    
    if (room.gameMode === GameMode.MULTI_ROUND) {
      newRound = await this.multiRoundService.generateNextRound(room, playerHistories);
    } else if (room.gameMode === GameMode.QUICKODE) {
      newRound = await this.quickodeService.generateNextRound(room, playerHistories);
    } else if (room.gameMode === GameMode.CHAOS_ARENA) {
      newRound = await this.chaosService.generateNextRound(room, playerHistories);
    } else {
      newRound = await this.multiRoundService.generateNextRound(room, playerHistories);
    }

    if (newRound) {
      room.state = MatchState.PLAYING;
      newRound.startedAt = new Date().toISOString();
      newRound.roundStartedAt = newRound.startedAt;
      newRound.roundEndsAt = new Date(new Date(newRound.startedAt).getTime() + newRound.duration * 1000).toISOString();
      if (!room.matchStartAt) {
         room.matchStartAt = newRound.startedAt;
      }
    } else {
      room.state = MatchState.RESULTS;
    }

    room.updatedAt = new Date().toISOString();
    return newRound;
  }

  scoreCurrentRound(room: Room): void {
    const currentRoundIndex = room.currentRound;
    if (!currentRoundIndex) return;

    if (room.gameMode === GameMode.MULTI_ROUND) {
      this.multiRoundService.scoreRound(room, currentRoundIndex);
    } else if (room.gameMode === GameMode.QUICKODE) {
      this.quickodeService.scoreRound(room, currentRoundIndex);
    } else if (room.gameMode === GameMode.CHAOS_ARENA) {
      this.chaosService.scoreRound(room, currentRoundIndex);
    } else {
      this.multiRoundService.scoreRound(room, currentRoundIndex);
    }

    const currentRound = room.rounds?.find(r => r.roundIndex === currentRoundIndex);
    if (currentRound && !currentRound.endedAt) {
      currentRound.endedAt = new Date().toISOString();
    }
    
    room.updatedAt = new Date().toISOString();
  }

  determineOverallWinner(room: Room): string | undefined {
    if (room.gameMode === GameMode.MULTI_ROUND) {
      return this.multiRoundService.determineOverallWinner(room);
    } else if (room.gameMode === GameMode.QUICKODE) {
      return this.quickodeService.determineOverallWinner(room);
    } else if (room.gameMode === GameMode.CHAOS_ARENA) {
      return this.chaosService.determineOverallWinner(room);
    }
    return this.multiRoundService.determineOverallWinner(room);
  }

  restoreRoomStateForUser(room: Room): Room {
    if (room.gameMode === GameMode.CHAOS_ARENA) {
      this.chaosService.cleanExpiredPowerups(room);
    }
    return room;
  }

  async handleJudgeResult(room: Room, event: ExecutionEventPayload, io: Server): Promise<void> {
    const currentRoundIndex = room.currentRound || 1;
    const currentRound = room.rounds?.find(r => r.roundIndex === currentRoundIndex);
    if (!currentRound) return;

    const isMultiRound = room.gameMode === GameMode.MULTI_ROUND;

    let scoreBonus = 0;
    if (room.chaosEvent && room.chaosEvent.type === 'BONUS_ACCEPTED' && event.verdict === ExecutionVerdict.ACCEPTED) {
      scoreBonus = 300;
      room.chaosEvent.data = {
        ...room.chaosEvent.data,
        claimedBy: event.userId,
      };
      room.chaosEvent.expiresAt = new Date().toISOString();
    }

    const existingSubmission = currentRound.submissions[event.userId];
    if (existingSubmission && (existingSubmission.status === 'ACCEPTED' || existingSubmission.status === 'FAILED')) {
      return;
    }
    const attempts = existingSubmission?.attempts || 1;
    const submittedCode = existingSubmission?.code || '';

    currentRound.submissions[event.userId] = {
      userId: event.userId,
      code: submittedCode, 
      language: 'python',
      status: event.verdict === ExecutionVerdict.ACCEPTED ? 'ACCEPTED' : 'FAILED',
      executionTimeMs: event.executionTimeMs || 0,
      submittedAt: existingSubmission?.submittedAt || new Date().toISOString(),
      testResults: event.results,
      attempts,
      bonus: scoreBonus,
    } as any;

    const hasPending = Object.values(currentRound.submissions).some(s => s.status === 'PENDING');
    let shouldEndRound = false;

    if (isMultiRound) {
      // Score the round for current submissions so we can display progress
      this.scoreCurrentRound(room);
      
      const allSubmitted = room.players.every(p => {
        const sub = currentRound.submissions[p.id];
        return sub && sub.submittedAt;
      });

      if (allSubmitted && !hasPending) {
        shouldEndRound = true;
      } else {
        const elapsedMs = Date.now() - new Date(currentRound.startedAt || 0).getTime();
        const isTimeExpired = elapsedMs >= (currentRound.duration - 2) * 1000;
        if (isTimeExpired && !hasPending) {
          shouldEndRound = true;
        }
      }
    } else {
      // QuickCode / Chaos Arena
      this.scoreCurrentRound(room);
      
      const allSubmitted = room.players.every(p => {
        const sub = currentRound.submissions[p.id];
        return sub && sub.submittedAt;
      });
      if (allSubmitted && !hasPending) {
        shouldEndRound = true;
      } else {
        const elapsedMs = Date.now() - new Date(currentRound.startedAt || 0).getTime();
        const isTimeExpired = elapsedMs >= (currentRound.duration - 2) * 1000;
        if (isTimeExpired && !hasPending) {
          shouldEndRound = true;
        }
      }
    }

    if (shouldEndRound) {
      this.scoreCurrentRound(room);
      this.emit('roundEnded', { room, roundIndex: currentRoundIndex });
    } else {
      const clients = io.sockets.adapter.rooms.get(room.id);
      if (!clients) {
        io.to(room.id).emit(SocketEvents.ROOM_UPDATED, room);
      } else {
        for (const socketId of clients) {
          const socketObj = io.sockets.sockets.get(socketId);
          if (socketObj) {
            const userId = (socketObj as any).data?.user?.id;
            const sanitized = sanitizeRoomForUser(room, userId);
            socketObj.emit(SocketEvents.ROOM_UPDATED, sanitized);
          }
        }
      }
    }
  }
}
