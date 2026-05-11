import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { SocketEvents } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';
import { MatchState, Room, JudgeResult } from '@code-duel/types';

export const useRoomEvents = (socket: Socket | null, roomId: string | undefined) => {
  const { setRoom, updateMatchState, setJudgeResult, setError } = useRoomStore();

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleRoomUpdated = (room: Room) => {
      setRoom(room);
    };

    const handleJudgeResult = (result: JudgeResult) => {
      setJudgeResult(result);
    };

    const handleRoomError = (error: string) => {
      setError(error);
    };

    const handleGameStart = () => updateMatchState(MatchState.PLAYING);
    const handleStartCountdown = () => updateMatchState(MatchState.COUNTDOWN);
    const handleGameEnd = (_data: { winnerId: string }) => {
      updateMatchState(MatchState.RESULTS);
    };

    socket.on(SocketEvents.ROOM_UPDATED, handleRoomUpdated);
    socket.on(SocketEvents.GAME_START, handleGameStart);
    socket.on(SocketEvents.START_COUNTDOWN, handleStartCountdown);
    socket.on(SocketEvents.GAME_END, handleGameEnd);
    socket.on(SocketEvents.ROOM_ERROR, handleRoomError);
    // Future judge result event
    socket.on('judge:result', handleJudgeResult);

    return () => {
      socket.off(SocketEvents.ROOM_UPDATED, handleRoomUpdated);
      socket.off(SocketEvents.GAME_START, handleGameStart);
      socket.off(SocketEvents.START_COUNTDOWN, handleStartCountdown);
      socket.off(SocketEvents.GAME_END, handleGameEnd);
      socket.off(SocketEvents.ROOM_ERROR, handleRoomError);
      socket.off('judge:result', handleJudgeResult);
    };
  }, [socket, roomId, setRoom, updateMatchState, setJudgeResult, setError]);
};
