import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { SocketEvents } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { MatchState, Room, MatchSummary } from '@code-duel/types';

export const useRoomEvents = (socket: Socket | null, roomId: string | undefined) => {
  const { setRoom, updateMatchState, setJudgeResult, setError, setTransientError, setMatchSummary } = useRoomStore();

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleRoomUpdated = (room: Room) => {
      setRoom(room);
    };

    const handleJudgeResult = (result: any) => {
      const { user } = useAuthStore.getState();
      if (user && result.userId === user.id) {
        setJudgeResult(result);
      }
    };

    const handleRoomError = (error: string) => {
      const isTransient = 
        error.includes('anomaly') ||
        error.includes('already accepted') ||
        error.includes('already submitted') ||
        error.includes('still being judged') ||
        error.includes('rate limit') ||
        error.includes('Invalid') ||
        error.includes('No need to resubmit') ||
        error.includes('rejected');

      if (isTransient) {
        setTransientError(error);
      } else {
        setError(error);
      }
    };

    const handleGameStart = () => updateMatchState(MatchState.PLAYING);
    const handleStartCountdown = () => updateMatchState(MatchState.COUNTDOWN);
    const handleGameEnd = (data: { winnerId: string; summary?: MatchSummary }) => {
      updateMatchState(MatchState.RESULTS);
      if (data.summary) {
        setMatchSummary(data.summary);
      }
    };

    socket.on(SocketEvents.ROOM_UPDATED, handleRoomUpdated);
    socket.on(SocketEvents.GAME_START, handleGameStart);
    socket.on(SocketEvents.START_COUNTDOWN, handleStartCountdown);
    socket.on(SocketEvents.GAME_END, handleGameEnd);
    socket.on(SocketEvents.ROOM_ERROR, handleRoomError);
    // Future judge result event
    socket.on('judge:progress', handleJudgeResult);

    return () => {
      socket.off(SocketEvents.ROOM_UPDATED, handleRoomUpdated);
      socket.off(SocketEvents.GAME_START, handleGameStart);
      socket.off(SocketEvents.START_COUNTDOWN, handleStartCountdown);
      socket.off(SocketEvents.GAME_END, handleGameEnd);
      socket.off(SocketEvents.ROOM_ERROR, handleRoomError);
      socket.off('judge:progress', handleJudgeResult);
    };
  }, [socket, roomId, setRoom, updateMatchState, setJudgeResult, setError, setTransientError, setMatchSummary]);
};
