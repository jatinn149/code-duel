import { 
  User, 
  Session, 
  DailyChallenge, 
  DailyMission, 
  DailyLeaderboardEntry,
  FriendRequest,
  Friendship,
  FriendRequestStatus,
  Notification,
  ActivityEvent,
  DuelInvite,
  Problem
} from '@code-duel/types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByPlayerId(playerId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: User): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<User[]>;
}

// ... existing interfaces ...

export interface IFriendRepository {
  sendRequest(request: FriendRequest): Promise<FriendRequest>;
  getRequestById(id: string): Promise<FriendRequest | null>;
  getPendingRequests(userId: string): Promise<FriendRequest[]>;
  updateRequestStatus(id: string, status: FriendRequestStatus): Promise<void>;
  deleteRequest(id: string): Promise<void>;
  createFriendship(friendship: Friendship): Promise<Friendship>;
  getFriends(userId: string): Promise<string[]>; // Returns userIds
  removeFriendship(userId1: string, userId2: string): Promise<void>;
  isFriend(userId1: string, userId2: string): Promise<boolean>;
  hasPendingRequest(fromUserId: string, toUserId: string): Promise<boolean>;
}

export interface INotificationRepository {
  create(notification: Notification): Promise<Notification>;
  getByUserId(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead?(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

export interface IActivityRepository {
  create(event: ActivityEvent): Promise<ActivityEvent>;
  getGlobalFeed(limit: number): Promise<ActivityEvent[]>;
  getUserFeed(userId: string, limit: number): Promise<ActivityEvent[]>;
}

export interface IDuelInviteRepository {
  create(invite: DuelInvite): Promise<DuelInvite>;
  getById(id: string): Promise<DuelInvite | null>;
  updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED' | 'EXPIRED'): Promise<void>;
  getPendingForUser(userId: string): Promise<DuelInvite[]>;
}


export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  create(session: Session): Promise<Session>;
  update(id: string, session: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface IRoomRepository {
  findById(id: string): Promise<Record<string, unknown> | null>;
  findAll(): Promise<Record<string, unknown>[]>;
  create(room: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: string, room: Partial<Record<string, unknown>>): Promise<Record<string, unknown>>;
  delete(id: string): Promise<void>;
}

export interface IProblemRepository {
  findById(id: string): Promise<Problem | null>;
  findAll(): Promise<Problem[]>;
  create(problem: Problem): Promise<Problem>;
  findByDifficulty(difficulty: number): Promise<Problem[]>;
}

export interface IDailyChallengeRepository {
  getCurrent(tierGroup: string, date: string): Promise<DailyChallenge | null>;
  create(challenge: DailyChallenge): Promise<DailyChallenge>;
  getHistory(tierGroup: string, limit: number): Promise<DailyChallenge[]>;
}

export interface IDailyMissionRepository {
  findByUserId(userId: string, date: string): Promise<DailyMission[]>;
  updateProgress(missionId: string, progress: number): Promise<DailyMission>;
  markClaimed(missionId: string): Promise<DailyMission>;
  createMany(missions: DailyMission[]): Promise<DailyMission[]>;
}

export interface IDailyLeaderboardRepository {
  getLeaderboard(tierGroup: string, date: string): Promise<DailyLeaderboardEntry[]>;
  submit(entry: DailyLeaderboardEntry): Promise<void>;
  getEntry(userId: string, date: string): Promise<DailyLeaderboardEntry | null>;
}

export interface IProblemHistoryRepository {
  create(entry: import('@code-duel/types').ProblemHistoryEntry & { userId: string }): Promise<void>;
  findByUserId(userId: string): Promise<(import('@code-duel/types').ProblemHistoryEntry & { userId: string })[]>;
}

export interface IMatchResultRepository {
  create(result: import('@code-duel/types').MatchSummary): Promise<void>;
  findByUserId(userId: string): Promise<import('@code-duel/types').MatchSummary[]>;
  findById(matchId: string): Promise<import('@code-duel/types').MatchSummary | null>;
  saveMatchWithLock(summary: import('@code-duel/types').MatchSummary, applyMMR: boolean): Promise<boolean>;
}
