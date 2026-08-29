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
  setNotifications: (notifications) => set({ 
    notifications,
    unreadNotificationsCount: notifications.filter(n => !n.isRead).length
  }),
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications],
    unreadNotificationsCount: state.unreadNotificationsCount + 1
  })),
  markNotificationRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ),
    unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1)
  })),
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) => set((state) => ({
    activities: [activity, ...state.activities].slice(0, 50)
  })),
}));
