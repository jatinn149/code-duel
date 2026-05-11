import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { useRoomStore } from '@/store/room-store';
import { useCountdown } from '@/hooks/use-countdown';
import { useLatency } from '@/hooks/use-latency';
import { SocketEvents } from '@code-duel/shared';
import { MatchState } from '@code-duel/types';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CheckCircle2,
  Clock,
  Terminal,
  Loader2,
  AlertCircle,
  Wifi,
  Trophy,
  LogOut,
  Zap,
  Sword,
  Shield,
  Activity,
  ChevronRight,
  Code2,
  Target,
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
  const opponent = useMemo(() => {
    return currentRoom?.players.find((p) => p.id !== user?.id);
  }, [currentRoom, user]);

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
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 esports-card max-w-md w-full"
        >
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
            Deployment Failure
          </h2>
          <p className="text-slate-400 mb-8 font-medium">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full esports-button-primary py-4 uppercase tracking-[0.2em] text-xs"
          >
            Return to Command Center
          </button>
        </motion.div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <Sword className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-center">
            <span className="text-white font-black uppercase tracking-[0.3em] text-sm block">
              Initializing Arena
            </span>
            <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-1 block">
              Connecting to secure node...
            </span>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = currentRoom.players.find((p) => p.id === user?.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
      <AnimatePresence>
        {cheatWarning && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-rose-600 text-white px-8 py-3 rounded-xl shadow-2xl flex items-center space-x-4 border border-rose-400/50"
          >
            <AlertCircle className="w-5 h-5 animate-bounce" />
            <span className="font-black uppercase tracking-widest text-xs">{cheatWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD HEADER --- */}
      <div className="h-20 flex items-center justify-between px-8 bg-slate-900/50 border-b border-white/5 backdrop-blur-xl relative z-40">
        {/* Left HUD: Current Player */}
        <div className="flex items-center space-x-6 w-1/3">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center relative">
              <span className="text-lg font-black text-indigo-400">
                {user?.username.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-white uppercase tracking-tight leading-none">
                {user?.username}
              </span>
              <div className="flex items-center space-x-2 mt-1.5">
                <Shield className="w-3 h-3 text-indigo-500" />
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  {user?.rating} MMR
                </span>
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-white/5" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              Latency
            </span>
            <div className="flex items-center space-x-1.5">
              <Wifi
                className={cn('w-3 h-3', latency < 100 ? 'text-emerald-500' : 'text-amber-500')}
              />
              <span className="text-xs font-mono font-bold text-slate-300">
                {Math.round(latency)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Center HUD: Match State & VS */}
        <div className="flex flex-col items-center justify-center w-1/3">
          <div className="flex items-center space-x-8">
            <div
              className={cn(
                'flex flex-col items-end transition-opacity duration-300',
                currentRoom.state !== MatchState.PLAYING && 'opacity-0',
              )}
            >
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                Status
              </span>
              <span className="text-xs font-black text-emerald-500 uppercase italic">Active</span>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <div className="relative px-6 py-2 bg-slate-950 border border-indigo-500/30 rounded-lg flex items-center space-x-4">
                <Sword className="w-4 h-4 text-indigo-500 transform -rotate-12" />
                <span className="text-lg font-black text-white tracking-tighter uppercase italic italic">
                  VS
                </span>
                <Sword className="w-4 h-4 text-indigo-500 transform rotate-[168deg]" />
              </div>
            </div>

            <div
              className={cn(
                'flex flex-col items-start transition-opacity duration-300',
                currentRoom.state !== MatchState.PLAYING && 'opacity-0',
              )}
            >
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                Time
              </span>
              <div className="flex items-center space-x-1 text-indigo-400 font-mono text-xs font-bold">
                <Clock className="w-3 h-3" />
                <span>24:59</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right HUD: Opponent & Actions */}
        <div className="flex items-center justify-end space-x-6 w-1/3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1.5">
              Target Opponent
            </span>
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-white uppercase tracking-tight leading-none">
                  {opponent?.username || 'SEARCHING...'}
                </span>
                <span className="text-[9px] font-mono text-slate-500 font-bold mt-1">
                  {opponent?.rating || '????'} MMR
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center relative">
                <span className="text-md font-black text-rose-500">
                  {opponent?.username?.charAt(0).toUpperCase() || '?'}
                </span>
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900',
                    opponent?.connected ? 'bg-emerald-500' : 'bg-slate-700',
                  )}
                />
              </div>
            </div>
          </div>

          <div className="h-10 w-px bg-white/5" />

          <button
            onClick={handleLeaveRoom}
            className="p-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-xl transition-all border border-rose-500/20 active:scale-95"
            title="Abort Mission"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- MAIN ARENA --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Mission Details */}
        <div className="w-80 flex flex-col bg-slate-950 border-r border-white/5">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Target className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  Objective
                </span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">
                Two Sum
              </h2>
              <div className="prose prose-invert prose-sm text-slate-400 font-medium leading-relaxed">
                <p>
                  Indices extraction algorithm required. Input: array of integers{' '}
                  <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-400 font-mono">
                    nums
                  </code>{' '}
                  and target{' '}
                  <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-400 font-mono">
                    target
                  </code>
                  .
                </p>
                <p className="mt-4 border-l-2 border-indigo-500/30 pl-4 py-1 bg-indigo-500/5 italic rounded-r-lg text-xs">
                  Constraints: O(n) complexity preferred. Duplicate elements blocked.
                </p>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    Intelligence
                  </span>
                </div>
                <span className="text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded">
                  LIVE
                </span>
              </div>

              <div className="space-y-3">
                {sortedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={cn(
                      'p-4 rounded-xl border flex items-center justify-between transition-all group',
                      player.id === user?.id
                        ? 'bg-indigo-600/5 border-indigo-500/20'
                        : 'bg-white/[0.02] border-white/5',
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center font-black text-[10px] text-slate-400">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase tracking-tight">
                          {player.username}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                          {player.id === user?.id ? 'System User' : 'Opponent'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {player.isOwner && (
                        <div
                          className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.8)]"
                          title="Host Authority"
                        />
                      )}
                      {player.isReady || player.isOwner ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-800" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/30">
            <div className="bg-slate-950 border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">
                  Room Code
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400 tracking-tighter uppercase">
                  {currentRoom.id.split('-')[0]}
                </span>
              </div>
              <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* --- CODE TERMINAL --- */}
        <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
          {/* Editor Header */}
          <div className="h-12 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-indigo-500">
                <Code2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Solution.py
                </span>
              </div>
              <div className="h-4 w-px bg-white/5" />
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Python 3.11
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleRunCode}
                disabled={isSubmitting || currentRoom.state !== MatchState.PLAYING}
                className="flex items-center space-x-2 px-4 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all active:scale-95 disabled:opacity-30"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Execute</span>
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isSubmitting || currentRoom.state !== MatchState.PLAYING}
                className="flex items-center space-x-2 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-30"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 fill-current" />
                )}
                <span>Deploy Solution</span>
              </button>
            </div>
          </div>

          <div className="flex-1 relative group">
            {/* Subtle vignette on editor */}
            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]" />
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
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

          {/* Console Area */}
          <div className="h-48 bg-[#151515] border-t border-white/5 flex flex-col">
            <div className="h-10 px-6 border-b border-white/5 flex items-center">
              <Terminal className="w-3 h-3 text-slate-500 mr-3" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                System Output
              </span>
            </div>
            <div className="flex-1 p-6 font-mono text-xs text-slate-500 overflow-y-auto">
              {isSubmitting || currentRoom.state === MatchState.JUDGING ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-indigo-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-black uppercase tracking-widest text-[10px]">
                      Authenticating sub-routines & running test suite...
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-0.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="bg-indigo-500 h-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 opacity-40">
                  <p>{'>'} READY FOR INPUT_</p>
                  <p>{'>'} STANDBY FOR SUBMISSION SEQUENCE_</p>
                </div>
              )}
            </div>
          </div>

          {/* --- OVERLAYS --- */}

          {/* 1. WAITING / READY OVERLAY */}
          <AnimatePresence>
            {currentRoom.state === MatchState.WAITING && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-12"
              >
                <div className="flex flex-col items-center text-center max-w-lg">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mb-8 border border-indigo-500/20"
                  >
                    <Sword className="w-10 h-10 text-indigo-500" />
                  </motion.div>
                  <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                    Prepare for <br />
                    <span className="text-indigo-500">Battle Engagement</span>
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mb-12 tracking-tight">
                    Synchronize your environment. The duel sequence initiates when all combatants
                    confirm readiness.
                  </p>

                  <div className="flex flex-col items-center space-y-6 w-full">
                    {isHost ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStartDuel}
                        disabled={!allReady}
                        className="w-full max-w-sm py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white font-black uppercase tracking-[0.3em] text-xs rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all flex items-center justify-center space-x-3"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>{allReady ? 'Initialize Match' : 'Awaiting Readiness'}</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleToggleReady}
                        className={cn(
                          'w-full max-w-sm py-4 font-black uppercase tracking-[0.3em] text-xs rounded-2xl transition-all flex items-center justify-center space-x-3',
                          currentPlayer?.isReady
                            ? 'bg-emerald-600/10 border-2 border-emerald-500/50 text-emerald-500'
                            : 'bg-white/5 border-2 border-white/5 text-white hover:bg-white/10',
                        )}
                      >
                        {currentPlayer?.isReady ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>{currentPlayer?.isReady ? 'Confirmed' : 'Confirm Readiness'}</span>
                      </motion.button>
                    )}

                    {!allReady && isHost && (
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] animate-pulse">
                        Protocol: Multiple signals required for launch
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. CINEMATIC COUNTDOWN */}
          <AnimatePresence>
            {currentRoom.state === MatchState.COUNTDOWN && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[50] bg-indigo-600 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-3xl" />
                <motion.div
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'circOut' }}
                  className="relative z-10 flex flex-col items-center"
                >
                  <span className="text-[200px] font-black text-white italic tracking-tighter leading-none">
                    {countdown || 0}
                  </span>
                  <span className="text-2xl font-black text-white/50 uppercase tracking-[0.5em] mt-[-20px]">
                    Get Ready
                  </span>
                </motion.div>

                {/* Visual accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/20 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. RESULTS REVEAL */}
          <AnimatePresence>
            {currentRoom.state === MatchState.RESULTS && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-12 overflow-hidden"
              >
                {/* Background Rays */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 via-transparent to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[160px]" />

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full"
                >
                  <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-8 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                    <Trophy className="w-10 h-10 text-amber-500" />
                  </div>

                  <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                    Duel <span className="text-indigo-500 text-7xl block mt-2">Concluded</span>
                  </h2>

                  <p className="text-slate-500 text-lg font-medium mb-12">
                    Competitive evaluation complete. Rating adjustment pending.
                  </p>

                  <div className="grid grid-cols-2 gap-6 w-full mb-12">
                    <div className="esports-card p-6 border-l-4 border-l-emerald-500 text-left">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Performance
                      </span>
                      <p className="text-2xl font-black text-white uppercase mt-1">Excellent</p>
                      <p className="text-xs font-bold text-emerald-500 mt-2">+24 MMR ACCRUED</p>
                    </div>
                    <div className="esports-card p-6 border-l-4 border-l-indigo-500 text-left">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Accuracy
                      </span>
                      <p className="text-2xl font-black text-white uppercase mt-1">100%</p>
                      <p className="text-xs font-bold text-slate-500 mt-2">ALL TEST CASES PASSED</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/')}
                    className="px-12 py-5 bg-white text-slate-950 font-black uppercase tracking-[0.4em] text-xs rounded-2xl shadow-2xl hover:bg-indigo-500 hover:text-white transition-all"
                  >
                    Return to Terminal
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
