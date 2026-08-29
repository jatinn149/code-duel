import { FriendRequest, Friendship, FriendRequestStatus } from '@code-duel/types';
import { IFriendRepository } from './interfaces';
import { prisma } from '../db';

export class PgFriendRepository implements IFriendRepository {
  async sendRequest(request: FriendRequest): Promise<FriendRequest> {
    const created = await prisma.friendRequest.create({
      data: {
        id: request.id,
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        status: request.status,
      },
    });

    return {
      id: created.id,
      fromUserId: created.fromUserId,
      toUserId: created.toUserId,
      status: created.status as FriendRequestStatus,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getRequestById(id: string): Promise<FriendRequest | null> {
    const req = await prisma.friendRequest.findUnique({
      where: { id },
    });
    if (!req) return null;

    return {
      id: req.id,
      fromUserId: req.fromUserId,
      toUserId: req.toUserId,
      status: req.status as FriendRequestStatus,
      createdAt: req.createdAt.toISOString(),
    };
  }

  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const reqs = await prisma.friendRequest.findMany({
      where: {
        toUserId: userId,
        status: 'PENDING',
      },
    });

    return reqs.map((req) => ({
      id: req.id,
      fromUserId: req.fromUserId,
      toUserId: req.toUserId,
      status: req.status as FriendRequestStatus,
      createdAt: req.createdAt.toISOString(),
    }));
  }

  async updateRequestStatus(id: string, status: FriendRequestStatus): Promise<void> {
    await prisma.friendRequest.update({
      where: { id },
      data: { status },
    });
  }

  async deleteRequest(id: string): Promise<void> {
    await prisma.friendRequest.deleteMany({
      where: { id },
    });
  }

  async createFriendship(friendship: Friendship): Promise<Friendship> {
    const [u1, u2] = friendship.userIds[0] < friendship.userIds[1] 
      ? [friendship.userIds[0], friendship.userIds[1]] 
      : [friendship.userIds[1], friendship.userIds[0]];

    const created = await prisma.friendship.create({
      data: {
        id: friendship.id,
        userId1: u1,
        userId2: u2,
      },
    });

    return {
      id: created.id,
      userIds: [created.userId1, created.userId2],
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getFriends(userId: string): Promise<string[]> {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: userId },
          { userId2: userId },
        ],
      },
    });

    const friendIds = new Set<string>();
    friendships.forEach((f) => {
      if (f.userId1 === userId) {
        friendIds.add(f.userId2);
      } else {
        friendIds.add(f.userId1);
      }
    });

    return Array.from(friendIds);
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    await prisma.friendship.deleteMany({
      where: {
        userId1: u1,
        userId2: u2,
      },
    });
  }

  async isFriend(userId1: string, userId2: string): Promise<boolean> {
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const friendship = await prisma.friendship.findFirst({
      where: {
        userId1: u1,
        userId2: u2,
      },
    });
    return !!friendship;
  }

  async hasPendingRequest(fromUserId: string, toUserId: string): Promise<boolean> {
    const req = await prisma.friendRequest.findFirst({
      where: {
        fromUserId,
        toUserId,
        status: 'PENDING',
      },
    });
    return !!req;
  }
}
