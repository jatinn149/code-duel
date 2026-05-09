import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { SocketEvents } from '@code-duel/shared';
import { useEffect, useRef } from 'react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken && !socketRef.current) {
      const socket = io(SOCKET_URL, {
        auth: {
          token: accessToken,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('Connected to socket');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      socket.on(SocketEvents.PING_SYNC, (data) => {
        socket.emit(SocketEvents.PONG_SYNC, {
          ...data,
          clientTime: new Date().toISOString(),
        });
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken]);

  return socketRef.current;
};
