import { 
  Notification, 
  NotificationType, 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData 
} from '@code-duel/types';
import { INotificationRepository } from '@/repositories/interfaces';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export class NotificationService {
  constructor(
    private notificationRepo: INotificationRepository,
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ) {}

  async notify(userId: string, type: NotificationType, title: string, message: string, data?: Record<string, unknown>) {
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await this.notificationRepo.create(notification);
      this.io.to(`user:${userId}`).emit('social:notification_received', saved);
      return saved;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send notification');
      throw error;
    }
  }

  async markAsRead(_userId: string, notificationId: string) {
    await this.notificationRepo.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string) {
    if (this.notificationRepo.markAllAsRead) {
      await this.notificationRepo.markAllAsRead(userId);
    } else {
      const notifs = await this.notificationRepo.getByUserId(userId);
      for (const n of notifs) {
        if (!n.isRead) {
          await this.notificationRepo.markAsRead(n.id);
        }
      }
    }
  }

  async getNotifications(userId: string) {
    return this.notificationRepo.getByUserId(userId);
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepo.getUnreadCount(userId);
  }
}
