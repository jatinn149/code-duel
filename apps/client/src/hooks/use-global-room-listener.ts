import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from './use-socket';
import { SocketEvents } from '@code-duel/shared';
import { Room } from '@code-duel/types';
import { useRoomStore } from '@/store/room-store';

export const useGlobalRoomListener = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { setRoom } = useRoomStore();

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (room: Room) => {
      setRoom(room);
      // If we are not on the battle page, redirect to it
      if (!location.pathname.startsWith('/battle')) {
        navigate(`/battle/${room.id}`);
      }
    };

    socket.on(SocketEvents.ROOM_UPDATED, handleRoomUpdated);

    return () => {
      socket.off(SocketEvents.ROOM_UPDATED, handleRoomUpdated);
    };
  }, [socket, navigate, location.pathname, setRoom]);
};
