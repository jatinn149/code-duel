import { create } from 'zustand';
import { 
  Notification, 
  PresenceStatus, 
  ActivityEvent,
  User
} from '@code-duel/types';

export interface DirectMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  text: string;
  timestamp: string;
}

interface SocialState {
  friends: (Partial<User> & { status: PresenceStatus })[];
  notifications: Notification[];
  activities: ActivityEvent[];
  unreadNotificationsCount: number;
  unreadMessageFriendIds: string[];
  chatMessages: Record<string, DirectMessage[]>;
  activeChatFriendId: string | null;
  
  setFriends: (friends: (Partial<User> & { status: PresenceStatus })[]) => void;
  updateFriendStatus: (userId: string, status: PresenceStatus) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  setActivities: (activities: ActivityEvent[]) => void;
  addActivity: (activity: ActivityEvent) => void;

  addDirectMessage: (msg: DirectMessage, currentUserId: string) => void;
  setActiveChatFriendId: (friendId: string | null) => void;
  markChatRead: (friendId: string) => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  friends: [],
  notifications: [],
  activities: [],
  unreadNotificationsCount: 0,
  unreadMessageFriendIds: [],
  chatMessages: {},
  activeChatFriendId: null,

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

  addDirectMessage: (msg, currentUserId) => set((state) => {
    const partnerId = msg.fromUserId === currentUserId ? msg.toUserId : msg.fromUserId;
    const currentList = state.chatMessages[partnerId] || [];
    const messageExists = currentList.some((m) => m.id === msg.id);
    const updatedMessages = {
      ...state.chatMessages,
      [partnerId]: messageExists ? currentList : [...currentList, msg],
    };

    let updatedUnread = state.unreadMessageFriendIds;
    // If incoming message is from a friend (not sent by myself)
    // and we are NOT currently chatting with this friend:
    if (msg.fromUserId !== currentUserId && state.activeChatFriendId !== msg.fromUserId) {
      if (!updatedUnread.includes(msg.fromUserId)) {
        updatedUnread = [...updatedUnread, msg.fromUserId];
      }
    }

    return {
      chatMessages: updatedMessages,
      unreadMessageFriendIds: updatedUnread,
    };
  }),

  setActiveChatFriendId: (friendId) => set((state) => ({
    activeChatFriendId: friendId,
    unreadMessageFriendIds: friendId
      ? state.unreadMessageFriendIds.filter((id) => id !== friendId)
      : state.unreadMessageFriendIds,
  })),

  markChatRead: (friendId) => set((state) => ({
    unreadMessageFriendIds: state.unreadMessageFriendIds.filter((id) => id !== friendId),
  })),
}));
