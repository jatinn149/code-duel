import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { SocketEvents, normalizeRoomCode, calculateCpRank } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { getDashboardData, DashboardData } from '@/api/auth-api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Users,
  Trophy,
  Play,
  LogIn,
  X,
  Loader2,
  Target,
  Sword,
  Shield,
  Activity,
  Flame,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
    },
  },
} as const;

export const DashboardPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { setRoom, setLoading, setError, isLoading } = useRoomStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showCreateDuelModal, setShowCreateDuelModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>('MULTI_ROUND');
  const [quickodeDuration, setQuickodeDuration] = useState<number>(300);
  const [quickodeType, setQuickodeType] = useState<'RANKED' | 'CASUAL'>('RANKED');
  const [quickodePlayers, setQuickodePlayers] = useState<number>(2);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboardData()
      .then((data) => {
        setDashboardData(data);
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      });
  }, [setUser]);

  const currentUser = dashboardData?.user || user;
  const rating = currentUser?.rating ?? 0;
  const matchesPlayed = currentUser?.matchesPlayed ?? 0;
  const wins = currentUser?.wins ?? 0;
  const streak = currentUser?.streak ?? 0;
  const highestStreak = currentUser?.highestStreak ?? 0;
  const level = currentUser?.level ?? 1;
  const seasonalTier = currentUser?.seasonalTier || 'UNRANKED';

  const winRate = useMemo(() => {
    if (matchesPlayed === 0) return '0.0';
    return ((wins / matchesPlayed) * 100).toFixed(1);
  }, [wins, matchesPlayed]);

  const weekdays = useMemo(() => {
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const currentDayOfWeek = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const currentMonSunIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const currentStreak = currentUser?.streak ?? 0;
    
    return dayLabels.map((label, idx) => {
      let active = false;
      if (currentStreak > 0) {
        const diff = currentMonSunIndex - idx;
        if (diff >= 0 && diff < currentStreak) {
          active = true;
        } else if (diff < 0) {
          const wrappedDiff = currentMonSunIndex + 7 - idx;
          if (wrappedDiff < currentStreak) {
            active = true;
          }
        }
      }
      return { label, active };
    });
  }, [currentUser?.streak]);

  const [timeLeftStr, setTimeLeftStr] = useState('04h 12m');
  
  useEffect(() => {
    const updateTimer = () => {
      const expiresAt = dashboardData?.dailyChallenge?.expiresAt;
      if (!expiresAt) {
        setTimeLeftStr('04h 12m');
        return;
      }
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeftStr('Expired');
        return;
      }
      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      setTimeLeftStr(`${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [dashboardData?.dailyChallenge?.expiresAt]);

  const directives = useMemo(() => {
    if (!dashboardData?.activeDirectives || dashboardData.activeDirectives.length === 0) {
      return [
        { title: 'Secure Victory', desc: 'Win 2 Ranked Matches', progress: 1, total: 2, xp: '+25 CP', status: 'active' },
        { title: 'Speed Demon', desc: 'Solve medium in under 10m', progress: 0, total: 1, xp: '+15 CP', status: 'active' },
        { title: 'System Warmup', desc: 'Complete 1 practice challenge', progress: 1, total: 1, xp: 'Completed', status: 'completed' }
      ];
    }
    return dashboardData.activeDirectives.map((m: any) => {
      let title = '';
      if (m.type === 'WIN_DUELS') {
        title = m.target === 1 ? 'First Blood' : 'Secure Victory';
      } else if (m.type === 'PLAY_MATCHES') {
        title = 'Arena Gladiator';
      } else if (m.type === 'COMPLETE_CHALLENGE') {
        title = 'Daily Reset';
      } else {
        title = 'System Warmup';
      }
      
      return {
        title,
        desc: m.description,
        progress: m.progress,
        total: m.target,
        xp: m.completed ? 'Completed' : `+${m.xpReward} CP`,
        status: m.completed ? 'completed' : 'active'
      };
    });
  }, [dashboardData?.activeDirectives]);

  const liveArenaMatches = useMemo(() => {
    if (!dashboardData?.liveArena || dashboardData.liveArena.length === 0) {
      return [];
    }
    return dashboardData.liveArena;
  }, [dashboardData?.liveArena]);

  const handleCreateRoom = (mode: string) => {
    if (!socket || isLoading) return;
    setLoading(true);

    let maxPlayers = 2;
    let options: any = undefined;

    if (mode === 'QUICKODE') {
      maxPlayers = quickodePlayers;
      options = {
        duration: quickodeDuration,
        ruleSet: quickodeType,
      };
    } else if (mode === 'MULTI_ROUND') {
      maxPlayers = 2;
      options = {
        ruleSet: 'RANKED',
      };
    } else if (mode === 'CHAOS_ARENA') {
      maxPlayers = 2;
      options = {
        ruleSet: 'CHAOS',
      };
    }

    socket.emit(SocketEvents.CREATE_ROOM, { maxPlayers, gameMode: mode, options });

    socket.once(SocketEvents.ROOM_UPDATED, (room) => {
      setRoom(room);
      setLoading(false);
      setShowCreateDuelModal(false);
      navigate(`/lobby/${room.id}`);
    });

    socket.once(SocketEvents.ROOM_ERROR, (message) => {
      setError(message);
      setLoading(false);
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !joinRoomId.trim() || isLoading) return;

    setLoading(true);
    const normalizedId = normalizeRoomCode(joinRoomId);
    (socket as any)._lastEmittedJoinRoomId = normalizedId;
    socket.emit(SocketEvents.JOIN_ROOM, { roomId: normalizedId });

    socket.once(SocketEvents.ROOM_UPDATED, (room) => {
      setRoom(room);
      setLoading(false);
      setShowJoinModal(false);
      navigate(`/lobby/${room.id}`);
    });

    socket.once(SocketEvents.ROOM_ERROR, (message) => {
      setError(message);
      setLoading(false);
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 p-4 sm:p-6 md:p-10 pb-28 md:pb-10 max-w-7xl mx-auto w-full flex flex-col space-y-6 sm:space-y-8 min-h-screen text-zinc-100 selection:bg-indigo-500/30 selection:text-white"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-900"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Coding <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Duel Terminal</span>
          </h1>
          <div className="flex items-center space-x-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-zinc-500 font-medium text-xs tracking-wider uppercase">
              Status: <span className="text-emerald-400 font-semibold">Ready to Code</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.01, backgroundColor: 'rgba(39, 39, 42, 0.8)' }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowJoinModal(true)}
            className="flex-1 md:flex-none h-11 md:h-auto py-2.5 px-5 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-semibold rounded-xl transition-all flex items-center justify-center space-x-2.5 text-xs uppercase tracking-wider active:scale-95"
          >
            <LogIn className="w-4 h-4 text-indigo-400" />
            <span>Join Room</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01, boxShadow: '0 0 20px -3px rgba(99, 102, 241, 0.3)' }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowCreateDuelModal(true)}
            disabled={isLoading}
            className="flex-1 md:flex-none h-11 md:h-auto py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center space-x-2.5 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-current" />
            )}
            <span>Create Room</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Operator Quick Bar (< lg) */}
      <motion.div variants={itemVariants} className="block lg:hidden">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 p-4 shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/10 border border-indigo-500/40 flex items-center justify-center shadow-md">
                  <Sword className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-800 rounded-md px-1.5 py-0.2 flex items-center space-x-0.5 shadow-sm">
                  <Shield className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-[10px] font-bold text-zinc-300">L{level}</span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-white tracking-tight truncate">
                    {currentUser?.username}
                  </h2>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
                    {calculateCpRank(rating)}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300 text-xs font-mono font-bold">
                    {rating} CP
                  </span>
                </div>
              </div>
            </div>

            {/* Streak pill */}
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl shrink-0">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <div className="text-right font-mono leading-none">
                <span className="text-sm font-black text-amber-400">{streak}</span>
                <span className="text-[9px] text-amber-500/80 block uppercase font-bold">Streak</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Line */}
          <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="text-zinc-400 font-medium">Tier: <strong className="text-indigo-400 uppercase">{seasonalTier}</strong></span>
            <span className="text-zinc-400 font-medium">Win Rate: <strong className="text-emerald-400">{winRate}%</strong></span>
          </div>
        </div>
      </motion.div>

      {/* Mobile Battle Arenas Quick Launch (< lg) */}
      <motion.div variants={itemVariants} className="block lg:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sword className="w-3.5 h-3.5 text-indigo-400" /> Duel Arenas
          </span>
          <span className="text-[11px] font-mono text-zinc-500">Fast Matchmaking</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Multi Round */}
          <button
            onClick={() => handleCreateRoom('MULTI_ROUND')}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 active:scale-95 transition-all text-center group hover:border-amber-500/40"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">Multi-Round</span>
            <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Best of 3</span>
          </button>

          {/* Quickode */}
          <button
            onClick={() => {
              setSelectedMode('QUICKODE');
              setShowCreateDuelModal(true);
            }}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 active:scale-95 transition-all text-center group hover:border-indigo-500/40"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">Quickode</span>
            <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Speed Sprint</span>
          </button>

          {/* Chaos Arena */}
          <button
            onClick={() => handleCreateRoom('CHAOS_ARENA')}
            disabled={isLoading}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 active:scale-95 transition-all text-center group hover:border-rose-500/40"
          >
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">Chaos</span>
            <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">Modifiers</span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1">
        {/* Left Column: Player Identity & Streaks (ordered after play area on mobile) */}
        <motion.div variants={itemVariants} className="order-2 lg:order-1 lg:col-span-3 space-y-6">
          {/* User Identity Block (Desktop only since mobile has quick bar) */}
          <div className="hidden lg:block relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-6 group transition-all duration-300 hover:border-zinc-700/60">
            {/* Subtle glow effect */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all duration-500" />
            
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group-hover:scale-105 transition-all duration-300">
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-indigo-500/20 to-purple-500/5 border border-indigo-500/30 flex items-center justify-center">
                  <Sword className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-800/80 rounded-full px-2 py-0.5 flex items-center space-x-1 shadow-md">
                  <Shield className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-[9px] font-bold text-zinc-300">Lvl {level}</span>
                </div>
              </div>
              
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                {currentUser?.username}
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </h2>
              <p className="text-indigo-400 text-[10px] font-mono font-black tracking-[0.15em] uppercase mt-1">
                {calculateCpRank(rating)}
              </p>

              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium uppercase tracking-wider">
                    Coder Points
                  </span>
                  <span className="text-white font-mono font-bold">{rating} CP</span>
                </div>
                {(() => {
                  const cpRanks = [
                    { rank: 'Initiate', min: 0, max: 199 },
                    { rank: 'Apprentice', min: 200, max: 499 },
                    { rank: 'Coder', min: 500, max: 899 },
                    { rank: 'Specialist', min: 900, max: 1399 },
                    { rank: 'Expert', min: 1400, max: 1999 },
                    { rank: 'Elite', min: 2000, max: 2699 },
                    { rank: 'Master', min: 2700, max: 3499 },
                    { rank: 'Grandmaster', min: 3500, max: 4499 },
                    { rank: 'Codebreaker', min: 4500, max: 5999 },
                    { rank: 'Apex Coder', min: 6000, max: Infinity },
                  ];
                  const currentCp = rating;
                  const idx = cpRanks.findIndex(r => currentCp >= r.min && currentCp <= r.max);
                  const matched = cpRanks[idx] || cpRanks[0];
                  const nextRank = cpRanks[idx + 1] || null;
                  
                  let pct = 100;
                  if (nextRank) {
                    const range = matched.max - matched.min + 1;
                    pct = Math.round(((currentCp - matched.min) / range) * 100);
                  }
                  
                  return (
                    <>
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden p-[1px] border border-zinc-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500 font-bold leading-none mt-1">
                        <span className="uppercase text-indigo-400">Tier: {seasonalTier}</span>
                        <span className="text-zinc-500">{nextRank ? `Next: ${nextRank.rank} (${nextRank.min} CP)` : 'Apex reached'}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Streak Indicator */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 hover:border-zinc-700/60 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-[0.15em] flex items-center">
                <Flame className="w-3.5 h-3.5 mr-1.5 text-amber-500 fill-amber-500/20" />
                Active Streak
              </h3>
              <span className="text-xs text-zinc-400 font-mono">🔥 {streak} {streak === 1 ? 'Day' : 'Days'}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-extrabold text-white tracking-tighter">{streak}</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">Daily Coding Streak</span>
                <span className="text-[11px] text-zinc-400">Solve a challenge daily to extend your streak</span>
              </div>
            </div>

            {/* Week day circles */}
            <div className="flex justify-between pt-2">
              {weekdays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center space-y-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      day.active
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {day.active ? '🔥' : day.label}
                  </div>
                  <span className="text-[10px] font-medium text-zinc-400">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Battle Statistics */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 hover:border-zinc-700/60 transition-all duration-300">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-[0.15em] flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Combat Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-800/80">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Win Rate
                </p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{winRate}%</p>
              </div>
              <div className="bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-800/80">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Win Streak
                </p>
                <p className="text-xl font-bold text-indigo-400 mt-1">{highestStreak}</p>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-zinc-400 border-t border-zinc-900 pt-3 font-mono">
              <span>Total Matches: <strong className="text-zinc-200">{matchesPlayed}</strong></span>
              <span>Matches Won: <strong className="text-emerald-400">{wins}</strong></span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="order-1 lg:order-2 lg:col-span-6 space-y-6">
          {/* Daily Challenge Card */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 group hover:border-zinc-700 transition-all duration-300">
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Daily Code Challenge
                  </span>
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-md">
                    {dashboardData?.dailyChallenge?.difficulty || 'Medium'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{dashboardData?.dailyChallenge?.title || 'Optimal Subarray Search'}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed max-w-md">
                  {dashboardData?.dailyChallenge?.description || "Implement a sliding window solution to locate the minimal contiguous subarray with a degree equal to the array's degree."}
                </p>
                <div className="flex items-center gap-4 pt-1.5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium"><Zap className="w-3.5 h-3.5 text-indigo-400" /> +{dashboardData?.dailyChallenge?.points || 50} CP Reward</span>
                  <span>•</span>
                  <span>Ends in: <strong className="text-zinc-200 font-mono">{timeLeftStr}</strong></span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/daily-challenge')}
                className="w-full md:w-auto h-12 md:h-auto px-5 py-3 md:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all transform active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 border border-amber-400/30 shrink-0"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Enter Daily Cipher</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Other Game Modes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-6 hover:border-zinc-700/80 transition-all cursor-pointer group flex flex-col justify-between h-[160px]">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    <Target className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                    Practice Range
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Code Practice
                </h3>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
                  Solve coding challenges solo to sharpen your skills before entering the Arena.
                </p>
              </div>
            </div>

            <div
              onClick={() => setShowTournamentModal(true)}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-6 hover:border-zinc-700/80 transition-all cursor-pointer group flex flex-col justify-between h-[160px]"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-rose-450 group-hover:text-rose-350 transition-colors">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Tournament Hackathons
                </h3>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
                  Submit performance-efficient code blocks in scheduled league tournaments with high rewards.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="order-3 lg:order-3 lg:col-span-3 space-y-6">
          {/* Directives Tracker */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 hover:border-zinc-700/60 transition-all duration-300">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-[0.15em] flex items-center">
              <Target className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Active Quests
            </h3>
            
            <div className="space-y-3.5">
              {directives.map((mission, idx) => (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-start">
                    <span className={`font-semibold ${mission.status === 'completed' ? 'text-zinc-400 line-through' : 'text-zinc-200'}`}>
                      {mission.title}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {mission.progress}/{mission.total}
                    </span>
                  </div>
                  
                  {/* Progress track */}
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden p-[1px]">
                    <div
                      className={`h-full rounded-full ${
                        mission.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">{mission.desc}</span>
                    <span className={`font-semibold ${mission.status === 'completed' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {mission.xp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Feed / Activity */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md overflow-hidden hover:border-zinc-700/60 transition-all duration-300">
            <div className="p-5 border-b border-zinc-900 bg-zinc-900/20">
               <h3 className="text-xs font-bold text-white uppercase tracking-[0.15em] flex items-center">
                <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Live in Arena
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {liveArenaMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-xs font-mono text-zinc-400 uppercase font-semibold">
                    No active duels
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Create a room to start a live coding duel
                  </p>
                </div>
              ) : (
                liveArenaMatches.map((match: any) => {
                  const pNames = match.players.map((p: any) => p.username).join(' vs ');
                  const modeText = match.mode === 'MULTI_ROUND' ? 'Multi Round' : match.mode === 'CHAOS_ARENA' ? 'Chaos Arena' : 'Quickode';
                  return (
                    <div
                      key={match.roomId}
                      onClick={() => navigate(`/lobby/${match.roomId}`)}
                      className="flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-400">
                          {match.roomId.substring(0, 4)}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors uppercase tracking-tight">
                            {pNames}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            {modeText} · {match.state}
                          </span>
                        </div>
                      </div>
                      <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Season Progress */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md p-5 space-y-4 hover:border-zinc-700/60 transition-all duration-300">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-[0.15em]">
              Season Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase">Current Tier</span>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                  {seasonalTier}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase">Season Ends</span>
                <span className="text-xs font-mono text-zinc-300 italic font-semibold">{(() => {
                  const now = new Date();
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                  const diffMs = end.getTime() - now.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  return `${diffDays}d ${diffHours}h remaining`;
                })()}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-7 shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Subtle top border gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Enter the Arena
                  </h2>
                  <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase mt-1">
                    Secure Room Deployment
                  </p>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleJoinRoom}>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2.5">
                    Room Deployment Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3.5 text-white font-mono text-base tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                      autoFocus
                    />
                    <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isLoading || !joinRoomId.trim()}
                  className="w-full h-12 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Initiate Deployment</span>
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Duel Modal */}
      <AnimatePresence>
        {showCreateDuelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateDuelModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg p-7 shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Subtle top border gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Initialize Duel Protocol
                  </h2>
                  <p className="text-zinc-400 text-xs font-semibold tracking-wider uppercase mt-1">
                    Select Match Configuration Mode
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateDuelModal(false)}
                  className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {[
                  {
                    id: 'MULTI_ROUND',
                    name: 'Multi Round Battle',
                    desc: 'Engage in a best-of-three series of algorithmic challenges. Adapt and outlast your opponent.',
                    icon: Trophy,
                    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  },
                  {
                    id: 'QUICKODE',
                    name: 'Quickode',
                    desc: 'A single, high-speed coding sprint. The fastest clean compilation wins.',
                    icon: Zap,
                    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                  },
                  {
                    id: 'CHAOS_ARENA',
                    name: 'Chaos Arena',
                    desc: 'High-intensity duel featuring dynamic environment anomalies and modifiers.',
                    icon: Activity,
                    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900/60 border-indigo-500/80 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]'
                          : 'bg-zinc-950/20 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-2.5 rounded-lg border ${mode.color} mt-0.5`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white tracking-tight">
                              {mode.name}
                            </span>
                            {isSelected && (
                              <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 leading-normal mt-1">
                            {mode.desc}
                          </p>
                        </div>
                      </div>

                      <AnimatePresence>
                        {mode.id === 'QUICKODE' && isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="overflow-hidden mt-4 pt-4 border-t border-zinc-800/80"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {/* Match Type */}
                              <div className="space-y-1.5">
                                <span className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                  Match Type
                                </span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { label: 'Ranked', value: 'RANKED' },
                                    { label: 'Casual', value: 'CASUAL' }
                                  ].map((opt) => {
                                    const isOptSelected = quickodeType === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setQuickodeType(opt.value as 'RANKED' | 'CASUAL')}
                                        className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                                          isOptSelected
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Player Count */}
                              <div className="space-y-1.5">
                                <span className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                  Player Count
                                </span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { label: '2 Players', value: 2 },
                                    { label: '4 Players', value: 4 }
                                  ].map((opt) => {
                                    const isOptSelected = quickodePlayers === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setQuickodePlayers(opt.value)}
                                        className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                                          isOptSelected
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Time Limit */}
                              <div className="space-y-1.5">
                                <span className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                  Time Limit
                                </span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { label: '5 Min', seconds: 300 },
                                    { label: '10 Min', seconds: 600 }
                                  ].map((opt) => {
                                    const isTimeSelected = quickodeDuration === opt.seconds;
                                    return (
                                      <button
                                        key={opt.seconds}
                                        type="button"
                                        onClick={() => setQuickodeDuration(opt.seconds)}
                                        className={`py-2 px-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
                                          isTimeSelected
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleCreateRoom(selectedMode)}
                disabled={isLoading}
                className="w-full h-12 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 fill-current" />
                )}
                <span>Deploy to Duel Sector</span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tournament Modal */}
      <AnimatePresence>
        {showTournamentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTournamentModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-7 shadow-2xl relative z-10 overflow-hidden font-mono"
            >
              {/* Subtle top border gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 animate-pulse" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-rose-500 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>SYSTEM ALERT: PROTOCOL RESTRICTED</span>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight mt-1 uppercase">
                    Tournament sector offline
                  </h2>
                </div>
                <button
                  onClick={() => setShowTournamentModal(false)}
                  className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-zinc-400 bg-zinc-900/40 border border-zinc-850 rounded-lg p-5 leading-relaxed font-mono">
                <p className="text-zinc-500 font-semibold">// INITIALIZING COMPILING PROTOCOLS...</p>
                <div className="space-y-2 border-l border-zinc-800 pl-3">
                  <p className="text-rose-400">ERROR: Module not fully compiled.</p>
                  <p className="text-zinc-350">Status: still being coded...</p>
                  <p className="text-zinc-450">Target ETA: Coming Soon</p>
                </div>
                <p className="text-zinc-500 font-semibold">// SECURITY SYSTEM ACCESS LEVEL: ENCRYPTED</p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTournamentModal(false)}
                  className="h-11 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
