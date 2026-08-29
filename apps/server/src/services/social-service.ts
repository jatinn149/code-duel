import { 
  FriendRequest, 
  Friendship, 
  FriendRequestStatus, 
  DuelInvite, 
  ActivityEvent,
  PresenceStatus,
  NotificationType
} from '@code-duel/types';
import { 
  IFriendRepository, 
  IUserRepository, 
  IDuelInviteRepository, 
  IActivityRepository 
} from '@/repositories/interfaces';
import { NotificationService } from './notification-service';
import { PresenceService } from './presence-service';
import { v4 as uuidv4 } from 'uuid';

export class SocialService {
  constructor(
    private userRepo: IUserRepository,
    private friendRepo: IFriendRepository,
    private inviteRepo: IDuelInviteRepository,
    private activityRepo: IActivityRepository,
    private notificationService: NotificationService,
    private presenceService: PresenceService
  ) {}

  async sendFriendRequest(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) throw new Error('Cannot add yourself');
    
    const isFriend = await this.friendRepo.isFriend(fromUserId, toUserId);
    if (isFriend) throw new Error('Already friends');

    // UX & Concurrency: Check if there is already a pending request from the other side.
    // If yes, automatically accept it!
    const hasReversePending = await this.friendRepo.hasPendingRequest(toUserId, fromUserId);
    if (hasReversePending) {
      const pendingRequests = await this.friendRepo.getPendingRequests(fromUserId);
      const reverseReq = pendingRequests.find((r) => r.fromUserId === toUserId);
      if (reverseReq) {
        await this.respondToFriendRequest(fromUserId, reverseReq.id, 'ACCEPT');
        return {
          id: reverseReq.id,
          fromUserId: toUserId,
          toUserId: fromUserId,
          status: FriendRequestStatus.ACCEPTED,
          createdAt: reverseReq.createdAt,
        };
      }
    }

    const hasPending = await this.friendRepo.hasPendingRequest(fromUserId, toUserId);
    if (hasPending) throw new Error('Request already pending');

    const fromUser = await this.userRepo.findById(fromUserId);
    if (!fromUser) throw new Error('User not found');

    const request: FriendRequest = {
      id: uuidv4(),
      fromUserId,
      toUserId,
      status: FriendRequestStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.friendRepo.sendRequest(request);
    
    await this.notificationService.notify(
      toUserId,
      NotificationType.FRIEND_REQUEST,
      'New Friend Request',
      `${fromUser.username} sent you a friend request.`,
      { requestId: saved.id }
    );

    return saved;
  }

  async respondToFriendRequest(userId: string, requestId: string, action: 'ACCEPT' | 'REJECT') {
    const request = await this.friendRepo.getRequestById(requestId);
    if (!request || request.toUserId !== userId || request.status !== FriendRequestStatus.PENDING) {
      throw new Error('Invalid request');
    }

    if (action === 'REJECT') {
      await this.friendRepo.deleteRequest(requestId);
      return request;
    }

    // ACCEPT
    // Check if already friends first (to make it idempotent and race-condition proof)
    const isFriend = await this.friendRepo.isFriend(request.fromUserId, request.toUserId);
    if (!isFriend) {
      const friendship: Friendship = {
        id: uuidv4(),
        userIds: [request.fromUserId, request.toUserId],
        createdAt: new Date().toISOString(),
      };
      await this.friendRepo.createFriendship(friendship);

      const user = await this.userRepo.findById(userId);
      if (user) {
        await this.notificationService.notify(
          request.fromUserId,
          NotificationType.FRIEND_ACCEPTED,
          'Friend Request Accepted',
          `${user.username} accepted your friend request.`,
          { friendshipId: friendship.id }
        );
      }
    }

    // Delete the resolved request
    await this.friendRepo.deleteRequest(requestId);
    
    // Also clean up any reverse request B -> A
    const reverseRequests = await this.friendRepo.getPendingRequests(request.fromUserId);
    const reverse = reverseRequests.find((r) => r.fromUserId === request.toUserId);
    if (reverse) {
      await this.friendRepo.deleteRequest(reverse.id);
    }

    return request;
  }

  async removeFriend(userId: string, friendId: string) {
    await this.friendRepo.removeFriendship(userId, friendId);
  }

  async getFriends(userId: string) {
    const friendIds = await this.friendRepo.getFriends(userId);
    const friends = await Promise.all(
      friendIds.map(async (id) => {
        const user = await this.userRepo.findById(id);
        if (!user) return null;
        return {
          id: user.id,
          username: user.username,
          rating: user.rating,
          rank: user.rank,
          status: await this.presenceService.getStatus(id),
        };
      })
    );
    return friends.filter((f) => f !== null);
  }

  async sendDuelInvite(fromUserId: string, toUserId: string) {
    const fromUser = await this.userRepo.findById(fromUserId);
    if (!fromUser) throw new Error('User not found');

    const toUserStatus = await this.presenceService.getStatus(toUserId);
    if (toUserStatus === PresenceStatus.OFFLINE) throw new Error('User is offline');
    if (toUserStatus === PresenceStatus.IN_GAME) throw new Error('User is already in a game');

    const invite: DuelInvite = {
      id: uuidv4(),
      fromUserId,
      toUserId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minute expiry
      createdAt: new Date().toISOString(),
    };

    const saved = await this.inviteRepo.create(invite);

    await this.notificationService.notify(
      toUserId,
      NotificationType.DUEL_INVITE,
      'Duel Invitation',
      `${fromUser.username} invited you to a duel!`,
      { inviteId: saved.id }
    );

    return saved;
  }

  async respondToDuelInvite(userId: string, inviteId: string, action: 'ACCEPT' | 'REJECT') {
    const invite = await this.inviteRepo.getById(inviteId);
    if (!invite || invite.toUserId !== userId || invite.status !== 'PENDING') {
      throw new Error('Invalid invite');
    }

    if (new Date(invite.expiresAt) < new Date()) {
      await this.inviteRepo.updateStatus(inviteId, 'EXPIRED');
      throw new Error('Invite expired');
    }

    if (action === 'REJECT') {
      await this.inviteRepo.updateStatus(inviteId, 'REJECTED');
      return;
    }

    // ACCEPT
    await this.inviteRepo.updateStatus(inviteId, 'ACCEPTED');
    
    const fromUser = await this.userRepo.findById(invite.fromUserId);
    if (fromUser) {
      await this.notificationService.notify(
        invite.fromUserId,
        NotificationType.INVITE_ACCEPTED,
        'Duel Accepted',
        `${fromUser.username} accepted your duel invitation!`,
        { inviteId: invite.id }
      );
    }
    
    return invite;
  }

  async logActivity(userId: string, username: string, type: ActivityEvent['type'], message: string) {
    const event: ActivityEvent = {
      id: uuidv4(),
      userId,
      username,
      type,
      message,
      createdAt: new Date().toISOString(),
    };
    await this.activityRepo.create(event);
    // Broadcast activity to everyone? Or just friends? 
    // Requirement says "lightweight community interaction", let's broadcast to all.
    // io.emit('social:activity_update', event);
  }

  async getGlobalActivities(limit = 20) {
    return this.activityRepo.getGlobalFeed(limit);
  }

  async getInitialData(userId: string) {
    const friends = await this.getFriends(userId);
    const notifications = await this.notificationService.getNotifications(userId);
    const activities = await this.getGlobalActivities();

    return {
      friends,
      notifications,
      activities,
    };
  }
}
