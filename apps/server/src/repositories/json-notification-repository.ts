import { Notification } from '@code-duel/types';
import { INotificationRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonNotificationRepository implements INotificationRepository {
  private collection = 'notifications';

  constructor(private storage: JsonStorageAdapter) {}

  async create(notification: Notification): Promise<Notification> {
    const notifications = await this.storage.read<Notification>(this.collection);
    notifications.push(notification);
    await this.storage.write(this.collection, notifications);
    return notification;
  }

  async getByUserId(userId: string): Promise<Notification[]> {
    const notifications = await this.storage.read<Notification>(this.collection);
    return notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markAsRead(id: string): Promise<void> {
    const notifications = await this.storage.read<Notification>(this.collection);
    const index = notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications[index].isRead = true;
      await this.storage.write(this.collection, notifications);
    }
  }

  async delete(id: string): Promise<void> {
    let notifications = await this.storage.read<Notification>(this.collection);
    notifications = notifications.filter((n) => n.id !== id);
    await this.storage.write(this.collection, notifications);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.storage.read<Notification>(this.collection);
    return notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }
}
