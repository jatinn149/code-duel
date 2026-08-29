import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { useRoomStore } from '@/store/room-store';
import { useRoomEvents } from '@/hooks/use-room-events';
import { SocketEvents, normalizeRoomCode } from '@code-duel/shared';
import { MatchState } from '@code-duel/types';
import { WaitingResults } from '@/components/battle/waiting-results';
import { FinalResults } from '@/components/battle/final-results';

export const ResultsPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const socket = useSocket();
  const navigate = useNavigate();
  const { currentRoom, error } = useRoomStore();

  // Keep room state updated via web sockets
  useRoomEvents(socket, roomId);

  useEffect(() => {
    if (!socket || !roomId) return;

    const normCurrentRoomId = currentRoom ? normalizeRoomCode(currentRoom.id) : '';
    const normRoomId = normalizeRoomCode(roomId);

    // If not in the correct room, emit join event to fetch initial room state
    if (!currentRoom || normCurrentRoomId !== normRoomId) {
      if ((socket as any)._lastEmittedJoinRoomId !== normRoomId) {
        (socket as any)._lastEmittedJoinRoomId = normRoomId;
        socket.emit(SocketEvents.JOIN_ROOM, { roomId: normRoomId });
      }
    }
  }, [socket, roomId, currentRoom]);

  // Handle redirecting out of results back to lobby if room resets to waiting/countdown
  useEffect(() => {
    if (currentRoom) {
      if (currentRoom.state === MatchState.WAITING || currentRoom.state === MatchState.COUNTDOWN) {
        navigate(`/lobby/${normalizeRoomCode(roomId || '')}`, { replace: true });
      }
    }
  }, [currentRoom, roomId, navigate]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a] text-white">
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full">
          <h2 className="text-xl font-bold text-red-500 uppercase tracking-tight mb-2">
            Failed to load results
          </h2>
          <p className="text-zinc-400 mb-8 font-medium text-xs">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white hover:bg-neutral-100 text-black font-bold uppercase tracking-wider text-xs rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-white min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs block">
            Accessing duel results...
          </span>
        </div>
      </div>
    );
  }

  // Render Waiting Screen if match is still running but current user has finished coding
  if (currentRoom.state === MatchState.PLAYING) {
    return <WaitingResults />;
  }

  // Render Final Results Screen once match transitions to RESULTS
  return <FinalResults />;
};
