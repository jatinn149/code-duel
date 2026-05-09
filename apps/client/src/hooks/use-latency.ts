import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SocketEvents } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';

export const useLatency = (socket: Socket | null) => {
  const { setLatency } = useRoomStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const performPing = () => {
      socket.emit(SocketEvents.PING_SYNC, { clientTime: new Date().toISOString() });
    };

    const handlePong = (data: { clientTime: string; serverTime: string }) => {
      const now = new Date().getTime();
      const clientTime = new Date(data.clientTime).getTime();
      const latency = (now - clientTime) / 2;
      setLatency(latency);
    };

    socket.on(SocketEvents.PONG_SYNC, handlePong);
    intervalRef.current = setInterval(performPing, 10000); // Sync every 10s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket.off(SocketEvents.PONG_SYNC, handlePong);
    };
  }, [socket, setLatency]);
};
