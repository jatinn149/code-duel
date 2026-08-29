import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { useRoomStore } from '@/store/room-store';
import { useCountdown } from '@/hooks/use-countdown';
import { useLatency } from '@/hooks/use-latency';
import { SocketEvents, normalizeRoomCode } from '@code-duel/shared';
import { Player, MatchState, GameMode } from '@code-duel/types';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

import { useRoomEvents } from '@/hooks/use-room-events';
import { useAuthStore } from '@/store/auth-store';
import { useTelemetry } from '@/hooks/use-telemetry';

import { QuickodeBattle } from '@/components/battle/quickode-battle';
import { MultiRoundBattle } from '@/components/battle/multi-round-battle';
import { ChaosArenaBattle } from '@/components/battle/chaos-arena-battle';

export const BattlePage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentRoom, countdown, latency, error, isRunningCode, setDryRunResult, setIsRunningCode } = useRoomStore();
  const [code, setCode] = useState('def solution():\n    # Write your code here\n    pass');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const runCodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentRoundIndex = currentRoom?.currentRound ?? 1;

  useEffect(() => {
    setDryRunResult(null);
    setIsRunningCode(false);
    return () => {
      setDryRunResult(null);
      setIsRunningCode(false);
    };
  }, [currentRoundIndex, setDryRunResult, setIsRunningCode]);

  useEffect(() => {
    if (currentRoom && currentRoom.state === MatchState.PLAYING) {
      const path = location.pathname;
      const hasSpecificMode = path.includes('/multi-round/') || path.includes('/quickode/') || path.includes('/chaos-arena/');
      if (!hasSpecificMode) {
        const modePath = currentRoom.gameMode === GameMode.MULTI_ROUND
          ? 'multi-round'
          : currentRoom.gameMode === GameMode.CHAOS_ARENA
          ? 'chaos-arena'
          : 'quickode';
        navigate(`/battle/${modePath}/${normalizeRoomCode(roomId || '')}`, { replace: true });
      }
    }
  }, [currentRoom, location.pathname, roomId, navigate]);

  useEffect(() => {
    if (currentRoom && (currentRoom.state === MatchState.WAITING || currentRoom.state === MatchState.COUNTDOWN)) {
      navigate(`/lobby/${normalizeRoomCode(roomId || '')}`, { replace: true });
    }
  }, [currentRoom, roomId, navigate]);

  useEffect(() => {
    if (!currentRoom || !user) return;

    const roundIndex = currentRoom.currentRound ?? 1;
    const currentRound = currentRoom.rounds?.find((r) => r.roundIndex === roundIndex);
    const hasSubmitted = !!currentRound?.submissions?.[user.id]?.submittedAt;

    const isMultiRound = currentRoom.gameMode === GameMode.MULTI_ROUND;
    if ((!isMultiRound && hasSubmitted) || currentRoom.state === MatchState.RESULTS) {
      navigate(`/results/${normalizeRoomCode(roomId || '')}`, { replace: true });
    }
  }, [currentRoom, user, roomId, navigate]);

  useEffect(() => {
    if (!currentRoom) return;
    const roundIndex = currentRoom.currentRound ?? 1;
    const currentRound = currentRoom.rounds?.find((r) => r.roundIndex === roundIndex);
    const problem = currentRound?.problem;
    
    if (problem) {
      setCode(problem.initialCode || 'def solution():\n    # Write your code here\n    pass');
      useRoomStore.getState().setJudgeResult(null);
    }
  }, [currentRoom?.currentRound, currentRoom?.rounds?.find((r) => r.roundIndex === (currentRoom?.currentRound ?? 1))?.problemId]);

  useLatency(socket);
  useCountdown(currentRoom?.countdownStartAt);
  useRoomEvents(socket, roomId);
  const { getKeystrokeCount } = useTelemetry(socket, roomId);

  useEffect(() => {
    if (!currentRoom || !user) return;
    const roundIndex = currentRoom.currentRound ?? 1;
    const currentRound = currentRoom.rounds?.find((r) => r.roundIndex === roundIndex);
    const sub = currentRound?.submissions?.[user.id];
    
    if (sub && sub.status !== 'PENDING') {
      setIsSubmitting(false);
    }
  }, [currentRoom, user]);

  useEffect(() => {
    if (!socket) return;
    const handleResetStates = () => {
      setIsSubmitting(false);
      setIsRunningCode(false);
      if (runCodeTimeoutRef.current) {
        clearTimeout(runCodeTimeoutRef.current);
        runCodeTimeoutRef.current = null;
      }
    };
    socket.on(SocketEvents.ROOM_ERROR, handleResetStates);
    socket.on('disconnect', handleResetStates);
    return () => {
      socket.off(SocketEvents.ROOM_ERROR, handleResetStates);
      socket.off('disconnect', handleResetStates);
    };
  }, [socket, setIsRunningCode]);

  useEffect(() => {
    if (!socket) return;

    socket.on(SocketEvents.CHEAT_WARNING, (message: string) => {
      setCheatWarning(message);
      setTimeout(() => setCheatWarning(null), 10000);
    });

    return () => {
      socket.off(SocketEvents.CHEAT_WARNING);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const normCurrentRoomId = currentRoom ? normalizeRoomCode(currentRoom.id) : '';
    const normRoomId = normalizeRoomCode(roomId);

    if (!currentRoom || normCurrentRoomId !== normRoomId) {
      if ((socket as any)._lastEmittedJoinRoomId !== normRoomId) {
        (socket as any)._lastEmittedJoinRoomId = normRoomId;
        socket.emit(SocketEvents.JOIN_ROOM, { roomId: normRoomId });
      }
    }
  }, [socket, roomId, currentRoom]);

  const isHost = useMemo(() => user?.id === currentRoom?.ownerId, [user, currentRoom]);
  const opponent = useMemo(() => {
    return currentRoom?.players.find((p: Player) => p.id !== user?.id);
  }, [currentRoom, user]);

  const opponents = useMemo(() => {
    if (!currentRoom || !user) return [];
    return currentRoom.players.filter((p: Player) => p.id !== user.id);
  }, [currentRoom, user]);

  const allReady = useMemo(() => {
    if (!currentRoom || currentRoom.players.length < 2) return false;
    return currentRoom.players.every((p: Player) => p.isReady || p.isOwner);
  }, [currentRoom]);

  const handleToggleReady = () => {
    if (!socket) return;
    socket.emit(SocketEvents.TOGGLE_READY);
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit(SocketEvents.LEAVE_ROOM);
    useRoomStore.getState().setRoom(null);
    navigate('/');
  };

  const handleStartDuel = () => {
    if (!socket || !isHost || !allReady) return;
    socket.emit(SocketEvents.START_COUNTDOWN);
  };

  const sortedPlayers = useMemo(() => {
    if (!currentRoom) return [];
    return [...currentRoom.players].sort((a: Player, _b: Player) => (a.isOwner ? -1 : 1));
  }, [currentRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleRunCodeResult = (result: any) => {
      if (runCodeTimeoutRef.current) {
        clearTimeout(runCodeTimeoutRef.current);
        runCodeTimeoutRef.current = null;
      }
      setIsRunningCode(false);
      setDryRunResult(result);
    };

    socket.on(SocketEvents.RUN_CODE_RESULT as any, handleRunCodeResult);

    return () => {
      socket.off(SocketEvents.RUN_CODE_RESULT as any, handleRunCodeResult);
      if (runCodeTimeoutRef.current) {
        clearTimeout(runCodeTimeoutRef.current);
      }
    };
  }, [socket, setDryRunResult, setIsRunningCode]);

  // Navigation Guard / Back Button / Refresh / Close Tab Guard
  useEffect(() => {
    if (!currentRoom || currentRoom.state === MatchState.RESULTS) return;

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
      const confirmLeave = window.confirm(
        "Are you sure you want to leave the match? This will forfeit the game."
      );
      if (confirmLeave) {
        if (socket) {
          socket.emit(SocketEvents.LEAVE_ROOM);
        }
        useRoomStore.getState().setRoom(null);
        navigate('/');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? This will forfeit the match.';
      return e.returnValue;
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentRoom, socket, navigate]);

  const handleRunCode = async () => {
    if (!socket || isRunningCode) return;
    setIsRunningCode(true);
    setDryRunResult(null);

    if (runCodeTimeoutRef.current) {
      clearTimeout(runCodeTimeoutRef.current);
    }
    runCodeTimeoutRef.current = setTimeout(() => {
      if (useRoomStore.getState().isRunningCode) {
        setIsRunningCode(false);
        setDryRunResult({
          success: false,
          error: 'Sandbox execution timed out on the client. Please try again.',
        });
      }
    }, 10000); // 10 seconds safety timeout

    socket.emit(SocketEvents.RUN_CODE, { code });
  };

  const handleSubmitCode = async () => {
    if (!socket) return;
    setIsSubmitting(true);
    socket.emit(SocketEvents.SUBMIT_CODE, {
      code,
      keystrokes: getKeystrokeCount(),
    });
  };

  const BattleComponent = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/multi-round/')) {
      return MultiRoundBattle;
    }
    if (path.includes('/chaos-arena/')) {
      return ChaosArenaBattle;
    }
    if (path.includes('/quickode/')) {
      return QuickodeBattle;
    }
    
    // Fallback if accessed via direct room ID
    if (currentRoom) {
      if (currentRoom.gameMode === GameMode.MULTI_ROUND) return MultiRoundBattle;
      if (currentRoom.gameMode === GameMode.CHAOS_ARENA) return ChaosArenaBattle;
      return QuickodeBattle;
    }
    return QuickodeBattle;
  }, [location.pathname, currentRoom]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a]">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full"
        >
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">
            Deployment Failure / Match Error
          </h2>
          <p className="text-neutral-400 mb-8 font-medium text-xs">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white hover:bg-neutral-100 text-black font-bold uppercase tracking-wider text-xs rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentRound = currentRoom?.rounds?.find(r => r.roundIndex === currentRoundIndex);
  
  const isMatchMode = currentRoom?.gameMode === GameMode.MULTI_ROUND || 
                      currentRoom?.gameMode === GameMode.CHAOS_ARENA || 
                      currentRoom?.gameMode === GameMode.QUICKODE;
  
  const isRoundDataReady = !isMatchMode || 
                           currentRoom.state === MatchState.WAITING || 
                           currentRoom.state === MatchState.COUNTDOWN || 
                           (currentRound && currentRound.problem && user);

  if (!currentRoom || !isRoundDataReady) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
          <div className="text-center">
            <span className="text-white font-semibold uppercase tracking-wider text-xs block">
              Initializing Arena...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = currentRoom.players.find((p: Player) => p.id === user?.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] relative">
      <BattleComponent
        currentRoom={currentRoom}
        currentPlayer={currentPlayer}
        opponent={opponent}
        opponents={opponents}
        user={user}
        code={code}
        setCode={setCode}
        isSubmitting={isSubmitting}
        latency={latency}
        countdown={countdown}
        sortedPlayers={sortedPlayers}
        allReady={allReady}
        isHost={isHost}
        cheatWarning={cheatWarning}
        handleRunCode={handleRunCode}
        handleSubmitCode={handleSubmitCode}
        handleLeaveRoom={handleLeaveRoom}
        handleToggleReady={handleToggleReady}
        handleStartDuel={handleStartDuel}
      />
    </div>
  );
};
