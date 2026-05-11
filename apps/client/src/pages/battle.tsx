import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { useRoomStore } from '@/store/room-store';
import { useCountdown } from '@/hooks/use-countdown';
import { useLatency } from '@/hooks/use-latency';
import { SocketEvents } from '@code-duel/shared';
import { MatchState } from '@code-duel/types';
import Editor from '@monaco-editor/react';
import {
  Users,
  Send,
  Play,
  CheckCircle2,
  Clock,
  Terminal,
  Loader2,
  AlertCircle,
  Wifi,
  Trophy,
  LogOut,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useRoomEvents } from '@/hooks/use-room-events';
import { useAuthStore } from '@/store/auth-store';
import { useTelemetry } from '@/hooks/use-telemetry';

export const BattlePage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, countdown, latency, error } = useRoomStore();
  const [code, setCode] = useState('def solution():\n    # Write your code here\n    pass');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  useLatency(socket);
  useCountdown(currentRoom?.countdownStartAt);
  useRoomEvents(socket, roomId);
  const { getKeystrokeCount } = useTelemetry(socket, roomId);

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

    if (!currentRoom || currentRoom.id !== roomId) {
      socket.emit(SocketEvents.JOIN_ROOM, { roomId });
    }
  }, [socket, roomId, currentRoom]);

  const isHost = useMemo(() => user?.id === currentRoom?.ownerId, [user, currentRoom]);
  const allReady = useMemo(() => {
    if (!currentRoom || currentRoom.players.length < 2) return false;
    return currentRoom.players.every((p) => p.isReady || p.isOwner);
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
    return [...currentRoom.players].sort((a, _b) => (a.isOwner ? -1 : 1));
  }, [currentRoom]);

  const handleRunCode = async () => {
    console.log('Running code...', code);
  };

  const handleSubmitCode = async () => {
    if (!socket) return;
    setIsSubmitting(true);
    socket.emit(SocketEvents.SUBMIT_CODE, {
      code,
      keystrokes: getKeystrokeCount(),
    });
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Error joining duel</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-slate-400 font-medium">Entering Arena...</span>
        </div>
      </div>
    );
  }

  const currentPlayer = currentRoom.players.find((p) => p.id === user?.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {cheatWarning && (
        <div className="bg-amber-500/90 text-slate-950 px-6 py-2 text-center text-sm font-bold flex items-center justify-center space-x-2 animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-4 h-4" />
          <span>{cheatWarning}</span>
        </div>
      )}
      {/* Duel Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shadow-sm relative z-10">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-slate-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-tight">
                {currentRoom.players.length}/{currentRoom.maxPlayers} Players
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Room Code:
              </span>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                {currentRoom.id.split('-')[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-500">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{Math.round(latency)}ms</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center space-x-3">
            <span
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors',
                currentRoom.state === MatchState.PLAYING
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
              )}
            >
              {currentRoom.state}
            </span>

            {countdown !== null && countdown > 0 && (
              <div className="flex items-center space-x-2 text-amber-500 animate-pulse">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold font-mono">{countdown}s</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunCode}
            disabled={isSubmitting || currentRoom.state !== MatchState.PLAYING}
            className="flex items-center space-x-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 text-sm font-bold rounded-lg transition-all border border-slate-700 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run</span>
          </button>
          <button
            onClick={handleSubmitCode}
            disabled={isSubmitting || currentRoom.state !== MatchState.PLAYING}
            className="flex items-center space-x-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Submit Solution</span>
          </button>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg transition-all border border-red-500/20 active:scale-95"
            title="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Problem & Players */}
        <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-900/40 backdrop-blur-xl">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Two Sum</h2>
            <div className="prose prose-invert prose-sm text-slate-400 leading-relaxed">
              <p>
                Given an array of integers{' '}
                <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400 font-mono">
                  nums
                </code>{' '}
                and an integer{' '}
                <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400 font-mono">
                  target
                </code>
                , return indices of the two numbers such that they add up to target.
              </p>
              <p className="mt-4 italic border-l-2 border-slate-700 pl-3">
                You may assume that each input would have exactly one solution, and you may not use
                the same element twice.
              </p>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  Competitors
                </h3>
              </div>
              <div className="space-y-3">
                {sortedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-all',
                      player.isOwner
                        ? 'bg-indigo-500/5 border-indigo-500/20'
                        : 'bg-slate-800/30 border-slate-800',
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div
                          className={cn(
                            'w-2.5 h-2.5 rounded-full border-2 border-slate-900',
                            player.connected ? 'bg-emerald-500' : 'bg-slate-600',
                          )}
                        />
                        {player.connected && (
                          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{player.username}</span>
                        <div className="flex items-center space-x-1">
                          <Trophy className="w-2.5 h-2.5 text-slate-500" />
                          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
                            {player.rating} MMR
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.isOwner && (
                        <div className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-black rounded border border-indigo-500/20 uppercase tracking-tighter">
                          HOST
                        </div>
                      )}
                      {player.isReady || player.isOwner ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Editor & Console */}
        <div className="flex-1 flex flex-col relative">
          {(currentRoom.state === MatchState.WAITING ||
            currentRoom.state === MatchState.COUNTDOWN) && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-12">
              <div className="p-4 bg-indigo-500/10 rounded-3xl mb-6">
                <Clock className="w-12 h-12 text-indigo-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {currentRoom.state === MatchState.COUNTDOWN ? 'Get Ready!' : 'Waiting for Host'}
              </h2>
              <p className="text-slate-400 max-w-md mb-8">
                {currentRoom.state === MatchState.COUNTDOWN
                  ? 'The duel is about to begin. Focus!'
                  : 'The battle will begin as soon as everyone is ready. Prepare your weapons.'}
              </p>

              <div className="flex flex-col items-center space-y-4">
                {isHost ? (
                  <button
                    onClick={handleStartDuel}
                    disabled={!allReady || currentRoom.state === MatchState.COUNTDOWN}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center space-x-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>{allReady ? 'Start Duel' : 'Waiting for Players...'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleReady}
                    disabled={currentRoom.state === MatchState.COUNTDOWN}
                    className={cn(
                      'px-8 py-3 font-bold rounded-xl transition-all active:scale-95 flex items-center space-x-2',
                      currentPlayer?.isReady
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
                    )}
                  >
                    {currentPlayer?.isReady ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    <span>{currentPlayer?.isReady ? 'Ready!' : 'Click to Ready'}</span>
                  </button>
                )}
                {!allReady && isHost && (
                  <p className="text-xs text-amber-500 font-medium">
                    All players must be ready to start
                  </p>
                )}
              </div>
            </div>
          )}

          {currentRoom.state === MatchState.RESULTS && (
            <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-12">
              <div className="p-4 bg-amber-500/10 rounded-3xl mb-6">
                <Trophy className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">
                Duel Finished
              </h2>
              <p className="text-slate-400 max-w-md mb-12">
                Great performance by both competitors. The results are in.
              </p>

              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          <div className="flex-1 bg-[#1e1e1e]">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20, bottom: 20 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                fontLigatures: true,
                readOnly: currentRoom.state !== MatchState.PLAYING,
              }}
            />
          </div>

          {/* Console / Results Area */}
          <div className="h-64 border-t border-slate-800 bg-slate-900/90 flex flex-col shadow-2xl relative z-10">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center">
                <Terminal className="w-4 h-4 text-indigo-500 mr-2" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Execution Console
                </span>
              </div>
            </div>
            <div className="flex-1 p-6 font-mono text-sm text-slate-400 overflow-y-auto scrollbar-hide">
              {isSubmitting || currentRoom.state === MatchState.JUDGING ? (
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-3 text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-bold tracking-tight">
                      Executing test cases in secure sandbox...
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 opacity-50 italic">
                  <span>{'>'} Ready for input.</span>
                  <span>{'>'} Click "Run" or "Submit" to begin evaluation.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
