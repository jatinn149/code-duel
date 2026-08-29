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

export const useSocial = () => {
  const socket = useSocket();
  const { 
    setFriends, 
    updateFriendStatus, 
    addNotification, 
    setNotifications,
    markNotificationRead,
    addActivity,
    setActivities
  } = useSocialStore();

  useEffect(() => {
    if (!socket) return;

    // Listen for initial data sync
    socket.on(SocketEvents.SOCIAL_INITIAL_SYNC, (data: { 
      friends: (Partial<User> & { status: PresenceStatus })[],
      notifications: Notification[],
      activities: ActivityEvent[]
    }) => {
      setFriends(data.friends);
      setNotifications(data.notifications);
      setActivities(data.activities);
    });

    // Listen for presence updates
    socket.on(SocketEvents.PRESENCE_UPDATE, (data: { userId: string; status: PresenceStatus }) => {
      updateFriendStatus(data.userId, data.status);
    });

    // Listen for notifications
    socket.on(SocketEvents.NOTIFICATION_RECEIVED, (notification: Notification) => {
      addNotification(notification);
    });

    // Listen for activity updates
    socket.on(SocketEvents.ACTIVITY_FEED_UPDATE, (event: ActivityEvent) => {
      addActivity(event);
    });

    return () => {
      socket.off(SocketEvents.SOCIAL_INITIAL_SYNC);
      socket.off(SocketEvents.PRESENCE_UPDATE);
      socket.off(SocketEvents.NOTIFICATION_RECEIVED);
      socket.off(SocketEvents.ACTIVITY_FEED_UPDATE);
    };
  }, [socket, setFriends, setNotifications, setActivities, updateFriendStatus, addNotification, addActivity]);

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
    socket?.emit(SocketEvents.NOTIFICATION_READ, { notificationId });
    markNotificationRead(notificationId);
  };

  return {
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    sendDuelInvite,
    respondToDuelInvite,
    markRead,
  };
};
