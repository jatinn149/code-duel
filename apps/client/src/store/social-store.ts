import { create } from 'zustand';
import { 
  Notification, 
  PresenceStatus, 
  ActivityEvent,
  User
} from '@code-duel/types';

interface SocialState {
  friends: (Partial<User> & { status: PresenceStatus })[];
  notifications: Notification[];
  activities: ActivityEvent[];
  unreadNotificationsCount: number;
  
  setFriends: (friends: (Partial<User> & { status: PresenceStatus })[]) => void;
  updateFriendStatus: (userId: string, status: PresenceStatus) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  setActivities: (activities: ActivityEvent[]) => void;
  addActivity: (activity: ActivityEvent) => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  friends: [],
  notifications: [],
  activities: [],
  unreadNotificationsCount: 0,

  setFriends: (friends) => set({ friends }),
  updateFriendStatus: (userId, status) => 
    set((state) => ({
      friends: state.friends.map((f) => 
        f.id === userId ? { ...f, status } : f
      ),
    })),
  setNotifications: (notifications) => set(() => {
    // Deduplicate by ID
    const seen = new Set<string>();
    const uniqueNotifications: Notification[] = [];
    for (const n of notifications) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        uniqueNotifications.push(n);
      }
    }
    return { 
      notifications: uniqueNotifications,
      unreadNotificationsCount: uniqueNotifications.filter(n => !n.isRead).length
    };
  }),
  addNotification: (notification) => set((state) => {
    const existingIndex = state.notifications.findIndex((n) => n.id === notification.id);
    let updated: Notification[];
    if (existingIndex !== -1) {
      updated = [...state.notifications];
      updated[existingIndex] = notification;
    } else {
      updated = [notification, ...state.notifications];
    }
    return { 
      notifications: updated,
      unreadNotificationsCount: updated.filter((n) => !n.isRead).length
    };
  }),
  markNotificationRead: (notificationId) => set((state) => {
    const updated = state.notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    return {
      notifications: updated,
      unreadNotificationsCount: updated.filter(n => !n.isRead).length
    };
  }),
  markAllNotificationsRead: () => set((state) => {
    const updated = state.notifications.map(n => ({ ...n, isRead: true }));
    return {
      notifications: updated,
      unreadNotificationsCount: 0
    };
  }),
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 50)
  })),
}));
