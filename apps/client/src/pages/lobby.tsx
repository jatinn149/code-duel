import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { SocketEvents, normalizeRoomCode, calculateCpRank } from '@code-duel/shared';
import { MatchState, GameMode } from '@code-duel/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  LogOut,
  Zap,
  Sword,
  Crown,
  Send,
  Copy,
  Check,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { useLatency } from '@/hooks/use-latency';
import { useCountdown } from '@/hooks/use-countdown';
import { useRoomEvents } from '@/hooks/use-room-events';
import { PlayerHoverCard } from '@/components/lobby/player-hover-card';

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export const LobbyPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const socket = useSocket();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, countdown } = useRoomStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Register lobby network hooks
  useLatency(socket);
  useCountdown(currentRoom?.countdownStartAt);
  useRoomEvents(socket, roomId);

  useEffect(() => {
    if (!socket || !roomId) return;

    const normCurrentRoomId = currentRoom ? normalizeRoomCode(currentRoom.id) : '';
    const normRoomId = normalizeRoomCode(roomId);

    // Join room if not inside
    if (!currentRoom || normCurrentRoomId !== normRoomId) {
      if ((socket as any)._lastEmittedJoinRoomId !== normRoomId) {
        (socket as any)._lastEmittedJoinRoomId = normRoomId;
        socket.emit(SocketEvents.JOIN_ROOM, { roomId: normRoomId });
      }
    }

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on(SocketEvents.ROOM_MESSAGE, handleMessage);

    return () => {
      socket.off(SocketEvents.ROOM_MESSAGE, handleMessage);
    };
  }, [socket, roomId, currentRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // If match starts (PLAYING state), redirect players immediately to their mode-specific routes
  useEffect(() => {
    if (currentRoom && currentRoom.state === MatchState.PLAYING) {
      const modePath = currentRoom.gameMode === GameMode.MULTI_ROUND
        ? 'multi-round'
        : currentRoom.gameMode === GameMode.CHAOS_ARENA
        ? 'chaos-arena'
        : 'quickode';
      navigate(`/battle/${modePath}/${normalizeRoomCode(roomId || '')}`, { replace: true });
    }
  }, [currentRoom, roomId, navigate]);

  // Navigation Guard / Back Button / Refresh / Close Tab Guard
  useEffect(() => {
    if (!currentRoom || currentRoom.state === MatchState.RESULTS) return;

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
      const confirmLeave = window.confirm(
        "Are you sure you want to leave the lobby? You will exit the room."
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
      e.returnValue = 'Are you sure you want to leave?';
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

  const hostPlayer = useMemo(() => {
    return currentRoom?.players.find((p) => p.isOwner);
  }, [currentRoom]);

  const challengerPlayer = useMemo(() => {
    return currentRoom?.players.find((p) => !p.isOwner);
  }, [currentRoom]);

  const host = useMemo(() => {
    return currentRoom?.players.find((p) => p.isOwner) || currentRoom?.players[0];
  }, [currentRoom]);

  const otherPlayers = useMemo(() => {
    if (!currentRoom || !host) return [];
    return currentRoom.players.filter((p) => p.id !== host.id);
  }, [currentRoom, host]);

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

  const handleLogoClick = () => {
    const confirmLeave = window.confirm("Are you sure you want to leave the lobby? You will be disconnected from the room.");
    if (confirmLeave) {
      handleLeaveRoom();
    }
  };

  const handleCopyRoomCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderSlotCard = (player: any, role: string, index: number) => {
    if (player) {
      return (
        <PlayerHoverCard key={player.id} userId={player.id} username={player.username} className="w-full flex justify-center">
          <div className={`w-full max-w-[320px] h-72 p-6 bg-neutral-950 border rounded-2xl flex flex-col items-center justify-between text-center shadow-lg relative group transition-all duration-300 ${
            player.isReady
              ? 'border-emerald-500/40'
              : player.isOwner
              ? 'border-indigo-500/40'
              : 'border-neutral-900 hover:border-neutral-800'
          }`}>
            <div className="absolute top-4 right-4 bg-neutral-900 text-neutral-450 px-2.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest font-black border border-neutral-800 flex items-center gap-1">
              {player.isOwner && <Crown className="w-2.5 h-2.5 text-indigo-400" />} {role}
            </div>
            
            <div className="w-20 h-20 rounded-full bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center text-2xl font-black font-mono text-white mb-2 mt-4">
              {(player?.username?.charAt(0) || 'P').toUpperCase()}
            </div>

            <div className="min-w-0 w-full mb-1">
              <h2 className="text-base font-bold text-white tracking-tight leading-none truncate max-w-full">
                {player.username}
              </h2>
              <div className="flex flex-col items-center mt-1 space-y-0.5">
                <span className="text-[10px] font-mono text-indigo-400 font-bold block uppercase tracking-wider leading-none">
                  {calculateCpRank(player.rating)}
                </span>
                <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none mt-0.5">
                  Rating: {player.rating} CP
                </span>
                <span className="text-[9px] font-mono text-neutral-550 font-bold block uppercase tracking-wider leading-none">
                  Tier: {player.seasonalTier || 'UNRANKED'}
                </span>
              </div>
            </div>

            <div className="w-full border-t border-neutral-900 pt-3 flex justify-around mt-auto">
              <div className="text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block leading-none">
                  Presence
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mt-1 leading-none ${
                  player.connected ? 'text-emerald-400' : 'text-neutral-600'
                }`}>
                  {player.connected ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="w-px h-6 bg-neutral-900" />
              <div className="text-center">
                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block leading-none">
                  Status
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mt-1 leading-none ${
                  player.isReady ? 'text-emerald-400 animate-pulse' : 'text-amber-500'
                }`}>
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            </div>
          </div>
        </PlayerHoverCard>
      );
    } else {
      return (
        <div key={`empty-${index}`} className="w-full max-w-[320px] h-72 bg-neutral-950 border border-neutral-900 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 text-neutral-600 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-transparent to-transparent opacity-60 animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin mb-3 text-neutral-700" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold">
            Awaiting Operator...
          </span>
          <p className="text-[10px] text-neutral-700 mt-1 font-mono">
            Invite players to slot #{index + 1}
          </p>
        </div>
      );
    }
  };

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          <span className="text-neutral-500 font-mono text-xs uppercase tracking-wider">
            Loading Secure Sector...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-neutral-200 p-6 md:p-10 justify-between relative select-none">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[30%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation HUD */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
        <div
          onClick={handleLogoClick}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-neutral-800 transition-colors group-hover:bg-neutral-200">
            <Sword className="w-4 h-4 text-black transform -rotate-12 animate-pulse" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-extrabold tracking-[0.2em] text-white">
              CODE<span className="text-neutral-500">_</span>DUEL
            </span>
            <span className="text-[9px] font-mono text-neutral-600 tracking-widest uppercase border-l border-neutral-800 pl-2 mt-0.5">
              LEAGUE
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopyRoomCode}
            className="flex items-center space-x-2 bg-neutral-950 border border-neutral-905 px-3.5 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-800 transition-all active:scale-95"
          >
            <span>DEPL_ID: {roomId}</span>
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleLeaveRoom}
            className="p-2 hover:bg-red-950/20 text-neutral-500 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-900/30 active:scale-95"
            title="Disconnect Sector"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Main Competitive VS Display */}
      {currentRoom.maxPlayers === 2 ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-6xl mx-auto w-full mb-8 min-h-0">
          {/* Left Side: Host Panel (5 cols) */}
          <div className="md:col-span-5 flex justify-end w-full">
            {hostPlayer ? (
              <PlayerHoverCard userId={hostPlayer.id} username={hostPlayer.username}>
                <div className="w-80 p-6 bg-neutral-950 border border-neutral-900 rounded-2xl flex flex-col items-center text-center shadow-lg relative group transition-all duration-300 hover:border-indigo-500/40">
                  <div className="absolute top-4 left-4 bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest font-black flex items-center gap-1 border border-indigo-500/20">
                    <Crown className="w-3 h-3 text-indigo-400" /> Host
                  </div>
                  
                  <div className="w-20 h-20 rounded-full bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center text-2xl font-black font-mono text-white mb-4 mt-2">
                    {(hostPlayer?.username?.charAt(0) || 'H').toUpperCase()}
                  </div>

                  <h2 className="text-lg font-bold text-white tracking-tight leading-none">
                    {hostPlayer.username}
                  </h2>
                  <div className="flex flex-col items-center mt-1.5 space-y-0.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold block uppercase tracking-wider leading-none">
                      {calculateCpRank(hostPlayer.rating)}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none mt-1">
                      Rating: {hostPlayer.rating} CP
                    </span>
                    <span className="text-[9px] font-mono text-neutral-555 font-bold block uppercase tracking-wider leading-none">
                      Tier: {hostPlayer.seasonalTier || 'UNRANKED'}
                    </span>
                  </div>

                  <div className="w-full border-t border-neutral-900 my-4 pt-4 flex justify-around">
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                        Presence
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider block mt-1 ${
                        hostPlayer.connected ? 'text-emerald-400' : 'text-neutral-600'
                      }`}>
                        {hostPlayer.connected ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-neutral-900" />
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                        Status
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider block mt-1 ${
                        hostPlayer.isReady ? 'text-emerald-400 animate-pulse' : 'text-amber-500'
                      }`}>
                        {hostPlayer.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              </PlayerHoverCard>
            ) : (
              <div className="w-80 h-64 bg-neutral-950 border border-neutral-900 border-dashed rounded-2xl flex items-center justify-center text-neutral-600 font-mono text-xs uppercase tracking-wider">
                Awaiting Host...
              </div>
            )}
          </div>

          {/* Center Side: VS Status Indicator (2 cols) */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center relative shadow-[0_0_30px_rgba(99,102,241,0.05)]">
              <span className="text-xl font-black italic tracking-tighter text-indigo-400 font-mono">VS</span>
              <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
            </div>

            <div className="mt-6 space-y-2">
              <span className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-3 py-1 rounded-full font-bold block mx-auto w-max">
                {currentRoom.gameMode === GameMode.MULTI_ROUND
                  ? 'Multi-Round'
                  : currentRoom.gameMode === GameMode.CHAOS_ARENA
                  ? 'Chaos Arena'
                  : 'Quickode'}
              </span>
              {currentRoom.gameMode === GameMode.QUICKODE && (
                <div className="space-y-0.5 text-center mt-1.5">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold block uppercase tracking-wider leading-none mb-1">
                    {currentRoom.ruleSet === 'CASUAL' ? 'UNRANKED' : 'RANKED'}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none">
                    PLAYERS {currentRoom.players.length}/{currentRoom.maxPlayers}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none mt-1">
                    ⏱ {Math.round((currentRoom.roundTimer?.duration || 300) / 60)} MINUTES
                  </span>
                </div>
              )}
              {currentRoom.gameMode === GameMode.MULTI_ROUND && (
                <div className="space-y-0.5 text-center mt-1.5">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold block uppercase tracking-wider leading-none mb-1">
                    RANKED
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none">
                    PLAYERS {currentRoom.players.length}/2
                  </span>
                  {currentRoom.roundTimer?.duration && (
                    <span className="text-[9px] font-mono text-neutral-550 block font-bold mt-1 leading-none">
                      ⏱ {Math.round(currentRoom.roundTimer.duration / 60)} MINUTES
                    </span>
                  )}
                </div>
              )}
              {currentRoom.gameMode === GameMode.CHAOS_ARENA && (
                <div className="space-y-0.5 text-center mt-1.5">
                  <span className="text-[9px] font-mono text-red-500 font-bold block uppercase tracking-wider leading-none mb-1">
                    CHAOS RULESET
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none">
                    PLAYERS {currentRoom.players.length}/2
                  </span>
                  {currentRoom.roundTimer?.duration && (
                    <span className="text-[9px] font-mono text-neutral-555 block font-bold mt-1 leading-none">
                      ⏱ {Math.round(currentRoom.roundTimer.duration / 60)} MINUTES
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Challenger Panel (5 cols) */}
          <div className="md:col-span-5 flex justify-start w-full">
            {challengerPlayer ? (
              <PlayerHoverCard userId={challengerPlayer.id} username={challengerPlayer.username}>
                <div className={`w-80 p-6 bg-neutral-950 border rounded-2xl flex flex-col items-center text-center shadow-lg relative group transition-all duration-300 ${
                  challengerPlayer.isReady
                    ? 'border-emerald-500/40'
                    : 'border-neutral-900 hover:border-neutral-800'
                }`}>
                  <div className="absolute top-4 right-4 bg-neutral-900 text-neutral-450 px-2.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest font-black border border-neutral-800">
                    Challenger
                  </div>
                  
                  <div className="w-20 h-20 rounded-full bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center text-2xl font-black font-mono text-white mb-4 mt-2">
                    {(challengerPlayer?.username?.charAt(0) || 'C').toUpperCase()}
                  </div>

                  <h2 className="text-lg font-bold text-white tracking-tight leading-none">
                    {challengerPlayer.username}
                  </h2>
                  <div className="flex flex-col items-center mt-1.5 space-y-0.5">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold block uppercase tracking-wider leading-none">
                      {calculateCpRank(challengerPlayer.rating)}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500 font-bold block uppercase tracking-wider leading-none mt-1">
                      Rating: {challengerPlayer.rating} CP
                    </span>
                    <span className="text-[9px] font-mono text-neutral-555 font-bold block uppercase tracking-wider leading-none">
                      Tier: {challengerPlayer.seasonalTier || 'UNRANKED'}
                    </span>
                  </div>

                  <div className="w-full border-t border-neutral-900 my-4 pt-4 flex justify-around">
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                        Presence
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider block mt-1 ${
                        challengerPlayer.connected ? 'text-emerald-400' : 'text-neutral-600'
                      }`}>
                        {challengerPlayer.connected ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-neutral-900" />
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
                        Status
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider block mt-1 ${
                        challengerPlayer.isReady ? 'text-emerald-400 animate-pulse' : 'text-amber-500'
                      }`}>
                        {challengerPlayer.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              </PlayerHoverCard>
            ) : (
              <div className="w-80 h-64 bg-neutral-950 border border-neutral-900 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 text-neutral-600 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-transparent to-transparent opacity-60 animate-pulse" />
                <Loader2 className="w-6 h-6 animate-spin mb-3 text-neutral-700" />
                <span className="font-mono text-xs uppercase tracking-wider font-bold">
                  Waiting for challenger...
                </span>
                <p className="text-[10px] text-neutral-700 mt-1 font-mono">
                  Share Deployment ID to invite
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full mb-8 min-h-0 space-y-6">
          {/* HUD Settings Bar */}
          <div className="bg-neutral-950 border border-neutral-900 rounded-xl px-6 py-3 flex flex-wrap items-center justify-center gap-6 shadow-md text-xs font-mono text-neutral-400">
            <span className="font-bold text-white uppercase">Duel Settings:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Mode: <strong className="text-zinc-200 uppercase">{currentRoom.gameMode === GameMode.MULTI_ROUND ? 'Multi-Round' : currentRoom.gameMode === GameMode.CHAOS_ARENA ? 'Chaos Arena' : 'Quickode'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Type: <strong className="text-zinc-200 uppercase">{currentRoom.ruleSet === 'CASUAL' ? 'UNRANKED' : 'RANKED'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Players: <strong className="text-zinc-200">{currentRoom.players.length}/{currentRoom.maxPlayers}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Timer: <strong className="text-zinc-200">{Math.round((currentRoom.roundTimer?.duration || 300) / 60)} Min</strong>
            </span>
          </div>

          {/* Grid layout for 4 players */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full justify-items-center">
            {renderSlotCard(host, 'Host', 0)}
            {renderSlotCard(otherPlayers[0], 'Challenger 1', 1)}
            {renderSlotCard(otherPlayers[1], 'Challenger 2', 2)}
            {renderSlotCard(otherPlayers[2], 'Challenger 3', 3)}
          </div>
        </div>
      )}

      {/* Bottom Panel: Chat Terminal & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto w-full items-stretch h-64">
        {/* Chat Terminal Panel (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-900 rounded-xl p-4 flex flex-col h-full">
          <div className="flex items-center space-x-2 border-b border-neutral-900 pb-2 mb-3 text-neutral-400 font-mono text-[9px] font-bold uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Lobby Chat Terminal</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 mb-3 scrollbar-hide font-mono text-[11px]">
            {messages.length === 0 ? (
              <span className="text-neutral-700 block text-center mt-8 uppercase tracking-widest text-[9px]">
                No operational messages. System quiet.
              </span>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                  <span className={`font-bold ${msg.userId === user?.id ? 'text-indigo-400' : 'text-neutral-400'}`}>
                    [{msg.username}]:
                  </span>
                  <span className="text-neutral-300 font-medium">{msg.message}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2 mt-auto">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to sector..."
              className="flex-1 bg-black border border-neutral-900 rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-neutral-700 text-white placeholder:text-neutral-700"
            />
            <button
              type="submit"
              className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-850 hover:border-neutral-700 transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Ready State Control Panel (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-900 rounded-xl p-6 flex flex-col justify-between h-full">
          <div>
            <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest font-mono mb-2">
              Engagement Authorization
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight leading-none">
              Operational Protocols
            </h3>
            <p className="text-[11px] text-neutral-500 leading-normal mt-2">
              Both operators must authenticate readiness. The session owner initiates matchmaking sequence.
            </p>
          </div>

          <div className="space-y-3">
            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleStartDuel}
                disabled={!allReady || !allConnected}
                className="w-full py-3 bg-white hover:bg-neutral-100 disabled:opacity-20 text-black font-semibold uppercase tracking-wider text-xs rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{allReady ? 'Start Match' : 'Awaiting Players Ready'}</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleToggleReady}
                className={`w-full py-3 font-semibold uppercase tracking-wider text-xs rounded-lg transition-all flex items-center justify-center space-x-2 border ${
                  currentPlayer?.isReady
                    ? 'bg-neutral-900 border-neutral-700 text-white'
                    : 'bg-transparent border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {currentPlayer?.isReady ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Sword className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span>{currentPlayer?.isReady ? 'READY TO DUEL' : 'DECLARE READY'}</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Cinematic Full-screen Countdown Overlay */}
      <AnimatePresence>
        {currentRoom.state === MatchState.COUNTDOWN && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center overflow-hidden"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <span className="text-[120px] font-bold text-white italic tracking-tighter leading-none font-mono">
                {countdown || 0}
              </span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-[0.3em] mt-3">
                DEPLOYING TO SECTOR
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
