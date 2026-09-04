import { useEffect } from 'react';
import { useSocket } from './use-socket';
import { useSocialStore } from '../store/social-store';
import { SocketEvents } from '@code-duel/shared';
import { 
  Notification, 
  PresenceStatus, 
  ActivityEvent,
  User
} from '@code-duel/types';

export const useSocialSubscription = () => {
  const socket = useSocket();
  const { 
    setFriends, 
    updateFriendStatus, 
    addNotification, 
    setNotifications,
    addActivity,
    setActivities
  } = useSocialStore();

  useEffect(() => {
    if (!socket) return;

    const onInitialSync = (data: { 
      friends: (Partial<User> & { status: PresenceStatus })[];
      notifications: Notification[];
      activities: ActivityEvent[];
    }) => {
      if (data.friends) setFriends(data.friends);
      if (data.notifications) setNotifications(data.notifications);
      if (data.activities) setActivities(data.activities);
    };

    const onPresenceUpdate = (data: { userId: string; status: PresenceStatus }) => {
      updateFriendStatus(data.userId, data.status);
    };

    const onNotificationReceived = (notification: Notification) => {
      addNotification(notification);
    };

    const onActivityFeedUpdate = (event: ActivityEvent) => {
      addActivity(event);
    };

    socket.on(SocketEvents.SOCIAL_INITIAL_SYNC, onInitialSync);
    socket.on(SocketEvents.PRESENCE_UPDATE, onPresenceUpdate);
    socket.on(SocketEvents.NOTIFICATION_RECEIVED, onNotificationReceived);
    socket.on(SocketEvents.ACTIVITY_FEED_UPDATE, onActivityFeedUpdate);

    return () => {
      socket.off(SocketEvents.SOCIAL_INITIAL_SYNC, onInitialSync);
      socket.off(SocketEvents.PRESENCE_UPDATE, onPresenceUpdate);
      socket.off(SocketEvents.NOTIFICATION_RECEIVED, onNotificationReceived);
      socket.off(SocketEvents.ACTIVITY_FEED_UPDATE, onActivityFeedUpdate);
    };
  }, [socket, setFriends, setNotifications, setActivities, updateFriendStatus, addNotification, addActivity]);
};

export const useSocial = () => {
  const socket = useSocket();
  const { 
    markNotificationRead,
    markAllNotificationsRead,
  } = useSocialStore();

  const sendFriendRequest = (toUserId: string) => {
    socket?.emit(SocketEvents.FRIEND_REQUEST_SEND, { toUserId });
  };

  const respondToFriendRequest = (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    socket?.emit(SocketEvents.FRIEND_REQUEST_RESPONSE, { requestId, action });
  };

  const removeFriend = (friendId: string) => {
    socket?.emit(SocketEvents.FRIEND_REMOVED, { friendId });
  };

  const sendDuelInvite = (toUserId: string) => {
    socket?.emit(SocketEvents.DUEL_INVITE_SEND, { toUserId });
  };

  const respondToDuelInvite = (inviteId: string, action: 'ACCEPT' | 'REJECT') => {
    socket?.emit(SocketEvents.DUEL_INVITE_RESPONSE, { inviteId, action });
  };

  const markRead = (notificationId: string) => {
    markNotificationRead(notificationId);
    socket?.emit(SocketEvents.NOTIFICATION_READ, { notificationId });
  };

  const markAllRead = () => {
    markAllNotificationsRead();
    socket?.emit('social:notification_mark_all_read' as any);
  };

  return {
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    sendDuelInvite,
    respondToDuelInvite,
    markRead,
    markAllRead,
  };
};
