import { Notification } from '@code-duel/types';
import { INotificationRepository } from './interfaces';
import { JsonStorageAdapter } from '@/storage/json-adapter';

export class JsonNotificationRepository implements INotificationRepository {
  private collection = 'notifications';

  constructor(private storage: JsonStorageAdapter) {}

  async create(notification: Notification): Promise<Notification> {
    await this.storage.updateCollection<Notification>(this.collection, (notifications) => {
      const idx = notifications.findIndex((n) => n.id === notification.id);
      if (idx !== -1) {
        notifications[idx] = notification;
      } else {
        notifications.push(notification);
      }
    });
    return notification;
  }

  async getByUserId(userId: string): Promise<Notification[]> {
    const notifications = await this.storage.read<Notification>(this.collection);
    const seen = new Set<string>();
    const userNotifications: Notification[] = [];

    for (const n of notifications) {
      if (n.userId === userId && !seen.has(n.id)) {
        seen.add(n.id);
        userNotifications.push(n);
      }
    }

    return userNotifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async markAsRead(id: string): Promise<void> {
    await this.storage.updateCollection<Notification>(this.collection, (notifications) => {
      const item = notifications.find((n) => n.id === id);
      if (item) {
        item.isRead = true;
      }
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.storage.updateCollection<Notification>(this.collection, (notifications) => {
      for (const n of notifications) {
        if (n.userId === userId) {
          n.isRead = true;
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.storage.updateCollection<Notification>(this.collection, (notifications) => {
      const index = notifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        notifications.splice(index, 1);
      }
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.storage.read<Notification>(this.collection);
    return notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }
}
