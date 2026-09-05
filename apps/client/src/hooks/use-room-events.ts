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
      let formatted = error;
      if (error === 'ALREADY_IN_A_ROOM') {
        formatted = 'Previous session was active. We cleared it for you—please try again.';
      } else if (error === 'ROOM_NOT_FOUND') {
        formatted = 'Battle room not found or has expired. Please verify the code.';
      } else if (error === 'ROOM_FULL') {
        formatted = 'This battle room has reached maximum player capacity.';
      } else if (error === 'MATCH_ALREADY_IN_PROGRESS') {
        formatted = 'This duel is currently in progress and cannot be joined.';
      } else if (error === 'ROOM_NOT_JOINABLE') {
        formatted = 'This battle room is currently not available to join.';
      } else if (error === 'AUTHENTICATION_REQUIRED' || error === 'SESSION_EXPIRED') {
        formatted = 'Your session has expired. Please log in again.';
      } else if (error.includes('Rate limit')) {
        formatted = 'Action sent too quickly. Please wait a moment.';
      }

      const isTransient = 
        error.includes('anomaly') ||
        error.includes('already accepted') ||
        error.includes('already submitted') ||
        error.includes('still being judged') ||
        error.includes('rate limit') ||
        error.includes('Rate limit') ||
        error.includes('Invalid') ||
        error.includes('No need to resubmit') ||
        error.includes('rejected');

      if (error.includes('Room disbanded by admin')) {
        alert('Room disbanded by admin');
        setRoom(null);
        setMatchSummary(null);
        window.location.href = '/';
        return;
      }

      if (isTransient) {
        setTransientError(formatted);
      } else {
        setError(formatted);
      }
    };

    const handleRoomDisbanded = (data?: { message?: string }) => {
      const msg = data?.message || 'Room disbanded by admin';
      alert(msg);
      setRoom(null);
      setMatchSummary(null);
      window.location.href = '/';
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
    socket.on('room:disbanded' as any, handleRoomDisbanded);
    // Future judge result event
    socket.on('judge:progress', handleJudgeResult);

    return () => {
      socket.off(SocketEvents.ROOM_UPDATED, handleRoomUpdated);
      socket.off(SocketEvents.GAME_START, handleGameStart);
      socket.off(SocketEvents.START_COUNTDOWN, handleStartCountdown);
      socket.off(SocketEvents.GAME_END, handleGameEnd);
      socket.off(SocketEvents.ROOM_ERROR, handleRoomError);
      socket.off('room:disbanded' as any, handleRoomDisbanded);
      socket.off('judge:progress', handleJudgeResult);
    };
  }, [socket, roomId, setRoom, updateMatchState, setJudgeResult, setError, setTransientError, setMatchSummary]);
};
