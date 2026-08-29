import { FriendRequest, Friendship, FriendRequestStatus } from '@code-duel/types';
import { IFriendRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonFriendRepository implements IFriendRepository {
  private requestsCollection = 'friend-requests';
  private friendshipsCollection = 'friendships';

  constructor(private storage: JsonStorageAdapter) {}

  async sendRequest(request: FriendRequest): Promise<FriendRequest> {
    const requests = await this.storage.read<FriendRequest>(this.requestsCollection);
    requests.push(request);
    await this.storage.write(this.requestsCollection, requests);
    return request;
  }

  async getRequestById(id: string): Promise<FriendRequest | null> {
    const requests = await this.storage.read<FriendRequest>(this.requestsCollection);
    return requests.find((r) => r.id === id) || null;
  }

  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await this.storage.read<FriendRequest>(this.requestsCollection);
    return requests.filter((r) => r.toUserId === userId && r.status === FriendRequestStatus.PENDING);
  }

  async updateRequestStatus(id: string, status: FriendRequestStatus): Promise<void> {
    const requests = await this.storage.read<FriendRequest>(this.requestsCollection);
    const index = requests.findIndex((r) => r.id === id);
    if (index !== -1) {
      requests[index].status = status;
      await this.storage.write(this.requestsCollection, requests);
    }
  }

  async deleteRequest(id: string): Promise<void> {
    const requests = await this.storage.read<FriendRequest>(this.requestsCollection);
    const filtered = requests.filter((r) => r.id !== id);
    await this.storage.write(this.requestsCollection, filtered);
  }

  async createFriendship(friendship: Friendship): Promise<Friendship> {
    const friendships = await this.storage.read<Friendship>(this.friendshipsCollection);
    friendships.push(friendship);
    await this.storage.write(this.friendshipsCollection, friendships);
    return friendship;
  }

  async getFriends(userId: string): Promise<string[]> {
    const friendships = await this.storage.read<Friendship>(this.friendshipsCollection);
    const friendIds = new Set<string>();
    friendships.forEach((f) => {
      if (f.userIds.includes(userId)) {
        const friendId = f.userIds.find((id) => id !== userId);
        if (friendId) friendIds.add(friendId);
      }
    });
    return Array.from(friendIds);
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    let friendships = await this.storage.read<Friendship>(this.friendshipsCollection);
    friendships = friendships.filter(
      (f) => !(f.userIds.includes(userId1) && f.userIds.includes(userId2)),
    );
    await this.storage.write(this.friendshipsCollection, friendships);
  }

  async isFriend(userId1: string, userId2: string): Promise<boolean> {
    const friendships = await this.storage.read<Friendship>(this.friendshipsCollection);
    return friendships.some((f) => f.userIds.includes(userId1) && f.userIds.includes(userId2));
  }

  async hasPendingRequest(fromUserId: string, toUserId: string): Promise<boolean> {
    const requests = await this.storage.read<FriendRequest>(this.requestsCollection);
    return requests.some(
      (r) =>
        r.fromUserId === fromUserId &&
        r.toUserId === toUserId &&
        r.status === FriendRequestStatus.PENDING,
    );
  }
}
