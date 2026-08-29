import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { SocketEvents } from '@code-duel/shared';
import { MatchState, GameMode } from '@code-duel/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  LogOut,
  Zap,
  Sword,
  Crown,
  Users,
  MessageSquare,
  Settings,
  Send,
  Copy,
  Check,
  Clock,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { PlayerHoverCard } from './player-hover-card';

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export const GeneralLobby = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, countdown } = useRoomStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on(SocketEvents.ROOM_MESSAGE, handleMessage);

    return () => {
      socket.off(SocketEvents.ROOM_MESSAGE, handleMessage);
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isHost = useMemo(() => user?.id === currentRoom?.ownerId, [user, currentRoom]);

  const allConnected = useMemo(() => {
    if (!currentRoom) return false;
    const nonOwners = currentRoom.players.filter((p) => p.id !== currentRoom.ownerId);
    return nonOwners.every((p) => p.connected);
  }, [currentRoom]);

  const allReady = useMemo(() => {
    if (!currentRoom || currentRoom.players.length < 2) return false;
    const nonOwners = currentRoom.players.filter((p) => p.id !== currentRoom.ownerId);
    return nonOwners.every((p) => p.isReady);
  }, [currentRoom]);

  const currentPlayer = useMemo(() => {
    return currentRoom?.players.find((p) => p.id === user?.id);
  }, [currentRoom, user]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !chatInput.trim()) return;
    socket.emit(SocketEvents.ROOM_MESSAGE, { message: chatInput.trim() });
    setChatInput('');
  };

  const handleToggleReady = () => {
    if (!socket) return;
    socket.emit(SocketEvents.TOGGLE_READY);
  };

  const handleStartDuel = () => {
    if (!socket || !isHost || !allReady || !allConnected) return;
    socket.emit(SocketEvents.START_COUNTDOWN);
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit(SocketEvents.LEAVE_ROOM);
    useRoomStore.getState().setRoom(null);
    useRoomStore.getState().setMatchSummary(null);
    navigate('/');
  };

  const handleCopyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!currentRoom) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-950 p-6 md:p-10 justify-center items-center relative select-none">
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none z-0 mix-blend-overlay" />
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-[1300px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1 min-h-0 relative z-10">
        
        {/* LEFT COLUMN: LOBBY INFO & PLAYERS (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6 min-h-0">
          
          {/* Header Panel */}
          <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-8 relative overflow-hidden shadow-elevation-2 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-2xs font-mono font-bold tracking-[0.2em] text-brand-400 uppercase">
                  Lobby Terminal
                </span>
                <h1 className="text-3xl font-black text-white tracking-tight mt-1">
                  READY ROOM
                </h1>
              </div>

              <div className="flex items-center space-x-2.5 bg-white/[0.02] px-4 py-2 rounded-xl border border-white/[0.06] shadow-inner-light">
                <Users className="w-4 h-4 text-surface-400" />
                <span className="text-surface-200 font-mono font-bold text-xs tracking-wider">
                  {currentRoom.players.length} / {currentRoom.maxPlayers} players
                </span>
              </div>
            </div>

            <div className={cn(
              "grid gap-6 mt-8 pt-6 border-t border-white/[0.04]",
              currentRoom.roundTimer?.duration ? "grid-cols-3" : "grid-cols-2"
            )}>
              <div>
                <span className="text-2xs font-bold text-surface-500 block uppercase tracking-widest mb-1.5">
                  Engagement Mode
                </span>
                <span className="text-white font-bold text-sm flex items-center space-x-2 tracking-wide">
                  {currentRoom.gameMode === GameMode.MULTI_ROUND ? (
                    <>
                      <Flame className="w-4.5 h-4.5 text-accent-amber animate-pulse" />
                      <span>Multi Round Battle</span>
                    </>
                  ) : currentRoom.gameMode === GameMode.CHAOS_ARENA ? (
                    <>
                      <Zap className="w-4.5 h-4.5 text-accent-rose animate-pulse" />
                      <span>Chaos Arena Battle</span>
                    </>
                  ) : (
                    <>
                      <Sword className="w-4.5 h-4.5 text-accent-cyan animate-pulse" />
                      <span>QuickCode Battle</span>
                    </>
                  )}
                </span>
              </div>

              {currentRoom.roundTimer?.duration && (
                <div>
                  <span className="text-2xs font-bold text-surface-500 block uppercase tracking-widest mb-1.5">
                    Match Time Limit
                  </span>
                  <span className="text-white font-bold text-sm flex items-center space-x-2 tracking-wide font-mono">
                    <Clock className="w-4.5 h-4.5 text-brand-400" />
                    <span>{Math.round(currentRoom.roundTimer.duration / 60)} mins</span>
                  </span>
                </div>
              )}

              <div>
                <span className="text-2xs font-bold text-surface-500 block uppercase tracking-widest mb-1.5">
                  Deployment ID
                </span>
                <button
                  onClick={handleCopyRoomCode}
                  className="group flex items-center space-x-2.5 text-surface-300 hover:text-white font-mono text-sm transition-colors"
                >
                  <span className="bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.06] group-hover:border-brand-500/50 transition-colors shadow-inner font-semibold">{currentRoom.id}</span>
                  {isCopied ? (
                    <Check className="w-4 h-4 text-accent-emerald" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-surface-500 group-hover:text-brand-400 transition-colors" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Connected Players list */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-hide">
            <span className="text-2xs font-bold text-surface-500 block mb-1 uppercase tracking-widest pl-1">
              Combatants Checked In
            </span>
            <AnimatePresence initial={false}>
              {currentRoom.players.map((player) => (
                <PlayerHoverCard key={player.id} userId={player.id} username={player.username}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "p-4.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border shadow-elevation-1",
                      player.connected
                        ? player.isReady
                          ? "bg-accent-emerald/[0.02] border-accent-emerald/20 hover:border-accent-emerald/30 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.05)]"
                          : "bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08]"
                        : "bg-surface-950 border-white/[0.02] opacity-40 grayscale"
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm border shadow-sm transition-colors",
                          player.connected
                            ? player.isReady
                              ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald"
                              : "bg-white/[0.02] border-white/[0.08] text-surface-200"
                            : "bg-white/[0.01] border-white/[0.02] text-surface-500"
                        )}>
                          {player.username.substring(0, 2).toUpperCase()}
                        </div>
                        
                        {/* Connection status indicator */}
                        <span className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-surface-950",
                          player.connected ? "bg-accent-emerald animate-glow-pulse" : "bg-accent-rose"
                        )} />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span className="text-sm font-bold text-white leading-none">{player.username}</span>
                          {player.isOwner && (
                            <Crown className="w-3.5 h-3.5 text-accent-amber" />
                          )}
                        </div>
                        <span className="text-surface-500 font-mono text-2xs font-bold block">
                          {player.rating} CP
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {player.connected ? (
                        player.isReady ? (
                          <div className="flex items-center space-x-1.5 bg-accent-emerald/10 border border-accent-emerald/20 px-3 py-1.5 rounded-lg text-accent-emerald text-2xs font-black uppercase tracking-widest shadow-inner">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>READY</span>
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] border border-white/[0.06] px-3 py-1.5 rounded-lg text-surface-400 text-2xs font-bold uppercase tracking-widest shadow-sm">
                            PREPARING
                          </div>
                        )
                      ) : (
                        <div className="flex items-center space-x-1.5 bg-white/[0.01] border border-white/[0.02] px-3 py-1.5 rounded-lg text-surface-500 text-2xs font-bold uppercase tracking-widest">
                          OFFLINE
                        </div>
                      )}
                    </div>
                  </motion.div>
                </PlayerHoverCard>
              ))}
            </AnimatePresence>
          </div>

          {/* Action Footer */}
          <div className="flex items-center space-x-4 pt-6 border-t border-white/[0.04] shrink-0">
            <button
              onClick={handleLeaveRoom}
              className="btn-secondary px-6 py-4 text-2xs font-bold tracking-widest flex items-center space-x-2 shrink-0 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5 text-accent-rose" />
              <span>LEAVE ROOM</span>
            </button>

            {isHost ? (
              <button
                onClick={handleStartDuel}
                disabled={!allReady || !allConnected}
                className={cn(
                  "flex-1 py-4 font-bold tracking-widest text-2xs rounded-xl transition-all duration-300 flex items-center justify-center space-x-2.5 uppercase shadow-elevation-1",
                  allReady && allConnected
                    ? "btn-primary shadow-glow-sm"
                    : "bg-white/[0.02] border border-white/[0.06] text-surface-500 cursor-not-allowed"
                )}
              >
                <Zap className={cn("w-4 h-4", allReady && allConnected ? "animate-pulse" : "")} />
                <span>
                  {allReady && allConnected
                    ? 'INITIATE COMBAT SEQUENCE'
                    : !allConnected
                    ? 'AWAITING CONNECTIONS'
                    : 'AWAITING READINESS'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleToggleReady}
                className={cn(
                  "flex-1 py-4 font-bold tracking-widest text-2xs rounded-xl transition-all flex items-center justify-center space-x-2.5 uppercase border",
                  currentPlayer?.isReady
                    ? "bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald hover:bg-accent-emerald/20"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.08] hover:border-white/[0.15]"
                )}
              >
                {currentPlayer?.isReady ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>READINESS CONFIRMED</span>
                  </>
                ) : (
                  <>
                    <Sword className="w-4 h-4" />
                    <span>CONFIRM READINESS</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT & MATCH SETTINGS (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6 min-h-0">
          
          {/* Match Settings Panel */}
          <div className="card p-6 border-surface-700/50 glow-sm shrink-0">
            <span className="text-caption font-bold text-surface-400 block flex items-center mb-5 tracking-widest uppercase">
              <Settings className="w-4 h-4 mr-2 text-surface-500" /> SYSTEM PARAMETERS
            </span>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-surface-950/80 p-4 rounded-xl border border-surface-800 shadow-inner">
                <span className="text-caption font-bold text-surface-400 tracking-widest uppercase">Time Limit</span>
                <span className="text-white font-mono text-body font-bold flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-accent-cyan" />
                  {currentRoom.roundTimer?.duration ? `${currentRoom.roundTimer.duration / 60} MIN` : '5 MIN'}
                </span>
              </div>

              {currentRoom.gameMode === GameMode.MULTI_ROUND && (
                <div className="flex justify-between items-center bg-surface-950/80 p-4 rounded-xl border border-surface-800 shadow-inner">
                  <span className="text-caption font-bold text-surface-400 tracking-widest uppercase">Format</span>
                  <span className="text-brand-400 text-body font-black uppercase tracking-widest">3 ROUNDS</span>
                </div>
              )}

              {currentRoom.selectedCategories && currentRoom.selectedCategories.length > 0 && (
                <div className="flex flex-col bg-surface-950/80 p-4 rounded-xl border border-surface-800 shadow-inner">
                  <span className="text-caption font-bold text-surface-400 tracking-widest uppercase mb-3">Categories</span>
                  <div className="flex flex-wrap gap-2">
                    {currentRoom.selectedCategories.map((c, i) => (
                      <span key={i} className="text-[10px] bg-surface-900 border border-surface-700 text-surface-300 px-3 py-1.5 rounded-md font-bold uppercase tracking-widest shadow-sm">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="flex-1 flex flex-col card p-0 border-surface-700/50 overflow-hidden h-full inner-light">
            {/* Chat Header */}
            <div className="h-14 border-b border-surface-800/80 px-6 flex items-center justify-between bg-surface-900/50 shrink-0 glass">
              <span className="text-caption font-bold text-white flex items-center tracking-widest uppercase">
                <MessageSquare className="w-4 h-4 mr-2 text-accent-cyan" /> COMMS CHANNEL
              </span>
              <span className="text-[9px] font-black bg-brand-500/20 border border-brand-500/30 text-brand-300 px-3 py-1 rounded tracking-widest uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" />
                ENCRYPTED
              </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 bg-surface-950/40 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-4 animate-fade-in">
                  <MessageSquare className="w-10 h-10 text-surface-600 mb-3 stroke-[1.5]" />
                  <span className="text-caption font-bold text-surface-400 tracking-widest uppercase block mb-1">
                    No signals received
                  </span>
                  <span className="text-[10px] text-surface-600 font-mono block">
                    Broadcasting active on secure node
                  </span>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className={cn(
                      "flex flex-col max-w-[85%] rounded-2xl p-4 border text-body shadow-sm",
                      msg.userId === user?.id
                        ? "bg-brand-500/10 border-brand-500/30 ml-auto items-end rounded-tr-sm inner-light"
                        : "bg-surface-900/80 border-surface-700 mr-auto items-start rounded-tl-sm"
                    )}
                  >
                    <span className="text-[10px] font-black text-surface-500 tracking-widest uppercase mb-1.5">
                      {msg.username}
                    </span>
                    <p className="text-white font-medium whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                  </motion.div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-surface-800/80 bg-surface-900/50 shrink-0 glass">
              <div className="flex items-center space-x-3 bg-surface-950/80 rounded-xl border border-surface-700 p-1.5 shadow-inner transition-colors focus-within:border-brand-500/50">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Transmit message to channel..."
                  className="flex-1 bg-transparent border-0 outline-none text-body text-white placeholder-surface-500 px-4 py-2.5 font-medium"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-30 disabled:hover:bg-brand-500 text-white rounded-lg transition-colors flex items-center justify-center shadow-md disabled:shadow-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {currentRoom.state === MatchState.COUNTDOWN && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-surface-950 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-md" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-cyan/20 rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-accent-violet/20 rounded-full blur-[200px] pointer-events-none" />

            <motion.div
              key={countdown ?? 'idle'}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.5 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              {countdown === 0 ? (
                <span className="text-[120px] md:text-[160px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-200 to-accent-cyan tracking-widest italic leading-none py-10 drop-shadow-[0_0_50px_rgba(34,211,238,0.5)]">
                  ENGAGE
                </span>
              ) : (
                <>
                  <span className="text-[200px] md:text-[300px] font-mono font-black text-white tracking-tighter leading-none drop-shadow-[0_0_80px_rgba(255,255,255,0.4)]">
                    {countdown}
                  </span>
                  <span className="text-3xl md:text-4xl font-black text-accent-cyan tracking-[0.5em] mt-2 uppercase drop-shadow-lg animate-pulse">
                    INITIALIZING COMBAT
                  </span>
                </>
              )}
            </motion.div>

            {/* Visual accents */}
            <div className="absolute top-1/4 left-0 w-full h-[1px] bg-white/10" />
            <div className="absolute bottom-1/4 left-0 w-full h-[1px] bg-white/10" />
            <div className="absolute top-0 left-1/4 w-[1px] h-full bg-white/10" />
            <div className="absolute top-0 right-1/4 w-[1px] h-full bg-white/10" />
            <div className="absolute inset-0 bg-noise opacity-50 mix-blend-overlay" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
