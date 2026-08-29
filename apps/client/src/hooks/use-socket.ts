import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { SocketEvents } from '@code-duel/shared';
import { useEffect, useState } from 'react';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isLocal ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : window.location.origin;

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(socketInstance);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      if (!socketInstance) {
        socketInstance = io(SOCKET_URL, {
          auth: {
            token: accessToken,
          },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
          console.log('Connected to socket');
          if (socketInstance) {
            (socketInstance as any)._lastEmittedJoinRoomId = null;
          }
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
        });

        socketInstance.on(SocketEvents.PING_SYNC, (data) => {
          socketInstance?.emit(SocketEvents.PONG_SYNC, {
            ...data,
            clientTime: new Date().toISOString(),
          });
        });

        setSocket(socketInstance);
      } else {
        // Update the token on the existing instance to prevent stale tokens during reconnects
        (socketInstance.auth as Record<string, unknown>).token = accessToken;
      }
    } else if ((!isAuthenticated || !accessToken) && socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      setSocket(null);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (socketInstance && socket !== socketInstance) {
      setSocket(socketInstance);
    }
  }, [socket]);

  return socket;
};
