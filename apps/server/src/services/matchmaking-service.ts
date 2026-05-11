import { QueueEntry, MatchmakingMatch, User } from '@code-duel/types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export class MatchmakingService {
  private queue: QueueEntry[] = [];
  private activeMatches: Map<string, MatchmakingMatch> = new Map();
  private userToMatch: Map<string, string> = new Map();

  joinQueue(user: User, socketId: string): QueueEntry {
    // Prevent duplicate queue entries
    this.leaveQueue(user.id);

    const entry: QueueEntry = {
      userId: user.id,
      socketId,
      rating: user.rating,
      joinedAt: new Date().toISOString(),
      searchRange: 100, // Initial range +- 100 MMR
    };

    this.queue.push(entry);
    logger.info({ userId: user.id, rating: user.rating }, 'User joined matchmaking queue');
    return entry;
  }

  leaveQueue(userId: string): void {
    this.queue = this.queue.filter((e) => e.userId !== userId);
  }

  getQueueStatus(userId: string): { position: number; total: number } | null {
    const index = this.queue.findIndex((e) => e.userId === userId);
    if (index === -1) return null;
    return { position: index + 1, total: this.queue.length };
  }

  /**
   * Main matchmaking loop logic
   * Should be called periodically
   */
  findMatches(): { players: { userId: string; socketId: string }[]; matchId: string }[] {
    const foundMatches: { players: { userId: string; socketId: string }[]; matchId: string }[] = [];
    const matchedUserIds = new Set<string>();

    // Sort queue by joinedAt to prioritize those waiting longest
    this.queue.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

    for (let i = 0; i < this.queue.length; i++) {
      const playerA = this.queue[i];
      if (matchedUserIds.has(playerA.userId)) continue;

      for (let j = i + 1; j < this.queue.length; j++) {
        const playerB = this.queue[j];
        if (matchedUserIds.has(playerB.userId)) continue;

        const ratingDiff = Math.abs(playerA.rating - playerB.rating);
        const maxRange = Math.max(playerA.searchRange, playerB.searchRange);

        if (ratingDiff <= maxRange) {
          // Match Found!
          const matchId = uuidv4();
          const match: MatchmakingMatch = {
            matchId,
            players: [
              { userId: playerA.userId, socketId: playerA.socketId, rating: playerA.rating },
              { userId: playerB.userId, socketId: playerB.socketId, rating: playerB.rating },
            ],
            expiresAt: new Date(Date.now() + 30000).toISOString(), // 30s to accept
            acceptedPlayers: [],
          };

          this.activeMatches.set(matchId, match);
          this.userToMatch.set(playerA.userId, matchId);
          this.userToMatch.set(playerB.userId, matchId);

          matchedUserIds.add(playerA.userId);
          matchedUserIds.add(playerB.userId);

          foundMatches.push({
            matchId,
            players: match.players.map((p) => ({ userId: p.userId, socketId: p.socketId })),
          });

          logger.info({ matchId, playerA: playerA.userId, playerB: playerB.userId }, 'Match found');
          break;
        }
      }
    }

    // Remove matched players from queue
    this.queue = this.queue.filter((e) => !matchedUserIds.has(e.userId));

    // Expand search range for remaining players
    this.queue.forEach((e) => {
      e.searchRange += 20; // Expand range by 20 MMR every interval
    });

    return foundMatches;
  }

  acceptMatch(userId: string, matchId: string): { ready: boolean; players: string[] } | null {
    const match = this.activeMatches.get(matchId);
    if (!match) return null;

    if (!match.acceptedPlayers.includes(userId)) {
      match.acceptedPlayers.push(userId);
    }

    const ready = match.acceptedPlayers.length === match.players.length;
    if (ready) {
      // Cleanup match tracking
      match.players.forEach((p) => this.userToMatch.delete(p.userId));
      this.activeMatches.delete(matchId);
    }

    return { ready, players: match.players.map((p) => p.userId) };
  }

  handleDisconnect(userId: string): void {
    this.leaveQueue(userId);
    const matchId = this.userToMatch.get(userId);
    if (matchId) {
      const match = this.activeMatches.get(matchId);
      if (match) {
        match.players.forEach((p) => this.userToMatch.delete(p.userId));
      }
      this.activeMatches.delete(matchId);
    }
  }

  cleanupStaleMatches(): void {
    const now = Date.now();
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (new Date(match.expiresAt).getTime() < now) {
        logger.info({ matchId }, 'Cleaning up expired match');
        match.players.forEach((p) => this.userToMatch.delete(p.userId));
        this.activeMatches.delete(matchId);
      }
    }
  }
}

export const matchmakingService = new MatchmakingService();
