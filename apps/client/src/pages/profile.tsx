import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { getProfile, CpHistoryItem } from '@/api/auth-api';
import { CP_RANKS } from '@code-duel/shared';
import { motion } from 'framer-motion';
import {
  Trophy,
  Activity,
  Calendar,
  ChevronLeft,
  Mail,
  Zap,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
} as const;

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 120, damping: 15 }
  }
} as const;

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [cpHistory, setCpHistory] = useState<CpHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'cp'>('matches');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProfile()
      .then((data) => {
        setMatchHistory(data.matchHistory || []);
        setCpHistory(data.cpHistory || []);
      })
      .catch((err) => {
        console.error('Error fetching profile data:', err);
        setError('Failed to load combat logs');
      })
      .finally(() => setLoading(false));
  }, []);

  const username = user?.username || 'Unknown Operator';
  const email = user?.email || 'operator@code-duel.net';
  const rating = user?.rating ?? 0;
  const matchesPlayed = user?.matchesPlayed ?? 0;
  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const level = user?.level ?? 1;

  const joinDate = useMemo(() => {
    if (!user?.createdAt) return '—';
    try {
      const date = new Date(user.createdAt);
      return `Joined ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}`;
    } catch {
      return '—';
    }
  }, [user?.createdAt]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const currentRankInfo = useMemo(() => {
    const matched = CP_RANKS.find((r) => rating >= r.min && rating <= r.max);
    if (!matched) {
      return { rank: 'Initiate', min: 0, max: 199, progress: 0, progressText: '0%' };
    }
    const { rank, min, max } = matched;
    if (max === Infinity) {
      return { rank, min, max, progress: 100, progressText: 'APEX ACHIEVED' };
    }
    const range = max - min + 1;
    const progress = Math.min(100, Math.max(0, ((rating - min) / range) * 100));
    return {
      rank,
      min,
      max,
      progress,
      progressText: `${progress.toFixed(0)}% TO NEXT`
    };
  }, [rating]);

  const rankColorClass = useMemo(() => {
    const rankName = currentRankInfo.rank.toUpperCase();
    if (rankName === 'APEX CODER') {
      return 'bg-white text-black border-white font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.15)]';
    }
    if (rankName.includes('CODEBREAKER') || rankName.includes('GRANDMASTER')) {
      return 'bg-rose-950/40 text-rose-400 border-rose-900';
    }
    if (rankName.includes('ELITE') || rankName.includes('MASTER')) {
      return 'bg-indigo-950/40 text-indigo-400 border-indigo-900';
    }
    if (rankName.includes('SPECIALIST') || rankName.includes('EXPERT')) {
      return 'bg-amber-950/40 text-amber-400 border-amber-900';
    }
    if (rankName.includes('CODER')) {
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-900';
    }
    return 'bg-neutral-800 text-neutral-400 border-neutral-700';
  }, [currentRankInfo.rank]);

  const winRate = useMemo(() => {
    if (matchesPlayed === 0) return '0.0';
    return ((wins / matchesPlayed) * 100).toFixed(1);
  }, [matchesPlayed, wins]);

  const trophies = useMemo(() => {
    return [
      {
        id: 'arena-gladiator',
        name: 'Arena Gladiator',
        desc: 'Reach Level 5 in the duel matching system',
        unlocked: level >= 5,
        metric: `Lvl ${level} / 5`
      },
      {
        id: 'veteran-tactician',
        name: 'Veteran Tactician',
        desc: 'Participate in 25 ranked arena matches',
        unlocked: matchesPlayed >= 25,
        metric: `${matchesPlayed} / 25 matches`
      },
      {
        id: 'ruthless-conqueror',
        name: 'Ruthless Conqueror',
        desc: 'Maintain a win rate of 60% or higher',
        unlocked: parseFloat(winRate) >= 60 && matchesPlayed >= 5,
        metric: `${winRate}% / 60% win rate`
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        desc: 'Pass all test cases in under 120 seconds',
        unlocked: false,
        metric: 'Locked'
      },
      {
        id: 'first-blood',
        name: 'First Blood',
        desc: 'Secure your first victory in a ranked duel',
        unlocked: wins > 0,
        metric: `${wins} / 1 win`
      },
      {
        id: 'immaculate-solve',
        name: 'Immaculate Solve',
        desc: 'Pass all test cases on first run',
        unlocked: false,
        metric: 'Locked'
      }
    ];
  }, [level, matchesPlayed, winRate, wins]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 p-4 sm:p-6 md:p-10 pb-28 md:pb-10 max-w-5xl mx-auto w-full flex flex-col space-y-6 sm:space-y-8 bg-black text-zinc-100"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-xs font-semibold text-neutral-400 hover:text-white uppercase tracking-wider transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center space-x-2 border border-neutral-900 bg-neutral-950 px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400 font-bold tracking-widest uppercase">
            SECURE SESSION
          </span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="relative w-full rounded-xl border border-neutral-900 bg-[#0a0a0a] p-5 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="w-20 h-20 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1 relative shadow-lg">
              <div className="w-full h-full rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <span className="text-2xl font-black text-white uppercase font-mono">
                  {(username?.charAt(0) || 'O').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-center md:text-left space-y-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {username}
                </h1>
                <span className="inline-flex self-center px-2.5 py-0.5 rounded text-xs font-mono bg-neutral-900 text-neutral-300 border border-neutral-800 uppercase tracking-wider">
                  verified_operator
                </span>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-neutral-400 font-medium font-mono">
                <span className="flex items-center space-x-1.5 font-sans">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{email}</span>
                </span>
                <span className="w-1.5 h-1.5 bg-neutral-800 rounded-full hidden md:block" />
                <span className="flex items-center space-x-1.5 flex-nowrap font-sans">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{joinDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end w-full md:w-65 space-y-2 bg-black border border-neutral-900 p-4.5 rounded-xl">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest leading-none">
                  CODER POINTS · {currentRankInfo.rank.toUpperCase()}
                </span>
                <span className="text-lg font-bold font-mono text-white mt-1.5">{rating} CP</span>
              </div>

              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold border ${rankColorClass}`}>
                {level}
              </div>
            </div>

            <div className="w-full">
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-1000"
                  style={{ width: `${currentRankInfo.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-medium text-neutral-400 font-mono mt-1 leading-none">
                <span>LVL {level}</span>
                <span>{currentRankInfo.progressText}</span>
              </div>
            </div>

            <div className="w-full pt-2 mt-2 border-t border-neutral-900 flex justify-between items-center text-[10px] font-mono font-bold tracking-wider leading-none">
              <span className="text-neutral-400 uppercase">CURRENT SEASON TIER</span>
              <span className="text-indigo-400 uppercase">{currentRankInfo.rank.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 space-y-8">
          <motion.div variants={itemVariants} className="space-y-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block font-mono">
              // performance_matrix
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-5 hover:border-neutral-800 transition-colors group">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-none block mb-1">
                  Win Rate
                </span>
                <span className="text-2xl font-bold text-white tracking-tight leading-none block mt-1.5 font-mono">
                  {winRate}%
                </span>
                <span className="text-[11px] font-mono text-neutral-500 block mt-3 uppercase font-semibold">Standard Matches</span>
              </div>

              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-5 hover:border-neutral-800 transition-colors group">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-none block mb-1">
                  Total Matches
                </span>
                <span className="text-2xl font-bold text-white tracking-tight leading-none block mt-1.5 font-mono">
                  {matchesPlayed}
                </span>
                <span className="text-[11px] font-mono text-neutral-500 block mt-3 uppercase font-semibold">
                  {wins} Wins / {losses} Losses
                </span>
              </div>

              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-5 hover:border-neutral-800 transition-colors group">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-none block mb-1">
                  Coding Streak (Current / Best)
                </span>
                <span className="text-2xl font-bold text-white tracking-tight leading-none block mt-1.5 font-mono">
                  {Math.max(0, user?.streak ?? 0)} / {Math.max(0, user?.highestStreak ?? 0)}
                </span>
                <span className="text-[11px] font-mono text-neutral-500 block mt-3 uppercase font-semibold">Consecutive wins</span>
              </div>

              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-5 hover:border-neutral-800 transition-colors group">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider leading-none block mb-1">
                  Compiler Parse Accuracy
                </span>
                <span className="text-2xl font-bold text-white tracking-tight leading-none block mt-1.5 font-mono">
                  —
                </span>
                <span className="text-[11px] font-mono text-neutral-500 block mt-3 uppercase font-semibold">Compiler verified stats unavailable</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block font-mono">
              // trophy_room_acquisitions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {trophies.map((trophy) => (
                <div
                  key={trophy.id}
                  className={`border rounded-xl p-4.5 flex items-start space-x-3.5 transition-colors relative ${
                    trophy.unlocked
                      ? 'bg-[#0a0a0a] border-neutral-900 hover:border-neutral-800'
                      : 'bg-black border-neutral-950 opacity-30 select-none'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg border flex items-center justify-center ${
                    !trophy.unlocked
                      ? 'bg-neutral-950 border-neutral-900 text-neutral-800'
                      : 'bg-neutral-900 border-neutral-800 text-white'
                  }`}>
                    <Trophy className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold truncate ${trophy.unlocked ? 'text-white' : 'text-slate-200'}`}>
                        {trophy.name}
                      </span>
                      {trophy.unlocked && (
                        <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug mt-1 font-medium">
                      {trophy.desc}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-2.5">
                      <span className="text-[11px] font-mono text-neutral-400 uppercase font-semibold">
                        Progress:
                      </span>
                      <span className={`text-[11px] font-mono font-bold ${trophy.unlocked ? 'text-neutral-300' : 'text-neutral-700'}`}>
                        {trophy.metric}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="md:col-span-5">
          <motion.div variants={itemVariants} className="space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-900">
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'matches'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Match History
                </button>
                <button
                  onClick={() => setActiveTab('cp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activeTab === 'cp'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>CP History</span>
                </button>
              </div>

              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest hidden sm:inline">
                {activeTab === 'matches' ? `${matchHistory.length} Matches` : `${cpHistory.length} Events`}
              </span>
            </div>

            <div className="flex-1 space-y-3.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 min-h-[200px] space-y-3">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                    Loading combat logs...
                  </span>
                </div>
              ) : error ? (
                <div className="bg-[#0a0a0a] border border-red-950/20 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <span className="font-mono text-xs uppercase tracking-wider text-red-400 font-bold">
                    Error Loading History
                  </span>
                  <p className="text-xs text-neutral-400 mt-1 font-mono">
                    {error}
                  </p>
                  <button
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                      getProfile()
                        .then((data) => {
                          setMatchHistory(data.matchHistory || []);
                          setCpHistory(data.cpHistory || []);
                        })
                        .catch(() => setError('Failed to load logs'))
                        .finally(() => setLoading(false));
                    }}
                    className="mt-4 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs font-mono hover:text-white uppercase tracking-wider transition-all"
                  >
                    Retry Link
                  </button>
                </div>
              ) : activeTab === 'matches' ? (
                matchHistory.length === 0 ? (
                  <div className="bg-[#0a0a0a] border border-neutral-900 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                    <span className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-bold">
                      No matches played yet
                    </span>
                    <p className="text-xs text-neutral-600 mt-1 font-mono">
                      Play matches in the arena to see your duel history here
                    </p>
                  </div>
                ) : (
                  matchHistory.map((match) => {
                    const userResult = match.results?.find((p: any) => p.userId === user?.id);
                    const opponents = match.results?.filter((p: any) => p.userId !== user?.id).map((p: any) => p.username) || [];
                    const opponentDisplay = opponents.length > 0
                      ? opponents.length > 1
                        ? `${opponents[0]} + ${opponents.length - 1} others`
                        : opponents[0]
                      : 'Unknown Opponent';
                    const isWinner = match.winnerId === user?.id;
                    const changeVal = userResult?.ratingChange ?? 0;
                    
                    let outcome: 'victory' | 'defeat' | 'draw' = 'draw';
                    if (match.winnerId) {
                      outcome = isWinner ? 'victory' : 'defeat';
                    }

                    const getModeDisplay = (m: string, c: number) => {
                      if (m === 'MULTI_ROUND') return 'MULTI ROUND';
                      if (m === 'CHAOS_ARENA') return 'CHAOS ARENA';
                      if (m === 'QUICKODE') {
                        return c !== 0 ? 'QUICKODE · RANKED' : 'QUICKODE · UNRANKED';
                      }
                      return m || 'UNKNOWN';
                    };

                    const formatDuration = (ms: number) => {
                      if (!ms) return '—';
                      const totalSec = Math.floor(ms / 1000);
                      const min = Math.floor(totalSec / 60);
                      const sec = totalSec % 60;
                      return `${min}m ${sec}s`;
                    };

                    const changeText = changeVal > 0
                      ? `+${changeVal} CP`
                      : changeVal < 0
                      ? `${changeVal} CP`
                      : match.mode === 'CHAOS_ARENA'
                      ? 'CP Unaffected'
                      : 'CP Unchanged';

                    return (
                      <div
                        key={match.roomId}
                        className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-4.5 flex items-center justify-between hover:border-neutral-800 transition-colors group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <span className={`w-2 h-2 rounded-full ${
                            outcome === 'victory' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : outcome === 'defeat' ? 'bg-red-500' : 'bg-neutral-500'
                          }`} />

                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-white">
                                {getModeDisplay(match.mode, changeVal)}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1 font-mono">
                              <span className="truncate max-w-[120px] sm:max-w-none">vs {opponentDisplay}</span>
                              <span className="text-neutral-700">•</span>
                              <span>{formatDuration(match.durationMs)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end justify-center font-mono">
                          <span className={`text-xs font-bold ${
                            outcome === 'victory' ? 'text-emerald-400' : outcome === 'defeat' ? 'text-red-400' : 'text-neutral-400'
                          }`}>
                            {changeText}
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-500 uppercase mt-1">
                            {formatDate(match.endedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                cpHistory.length === 0 ? (
                  <div className="bg-[#0a0a0a] border border-neutral-900 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                    <span className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-bold">
                      No CP history recorded
                    </span>
                    <p className="text-xs text-neutral-600 mt-1 font-mono">
                      Compete in ranked duels or receive HQ promotions to track your CP ledger
                    </p>
                  </div>
                ) : (
                  cpHistory.map((item) => {
                    const isPositive = item.change > 0;
                    const isNegative = item.change < 0;

                    return (
                      <div
                        key={item.id}
                        className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-4 flex items-center justify-between hover:border-neutral-800 transition-colors group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <span className={`w-2 h-2 rounded-full ${
                            item.type === 'TIER_PROMOTION'
                              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : isPositive
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : isNegative
                              ? 'bg-red-500'
                              : 'bg-indigo-400'
                          }`} />

                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-white">
                                {item.source}
                              </span>
                              {item.type === 'TIER_PROMOTION' && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold uppercase">
                                  Promoted
                                </span>
                              )}
                              {item.type === 'ADMIN_GRANT' && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-mono font-bold uppercase">
                                  HQ Grant
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1 font-mono">
                              <span className="truncate max-w-[140px] sm:max-w-xs">{item.reason}</span>
                            </div>
                            {item.note && (
                              <span className="text-[10px] text-zinc-500 font-sans italic mt-0.5 max-w-[200px] sm:max-w-xs truncate">
                                "{item.note}"
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end justify-center font-mono">
                          <span className={`text-xs font-bold ${
                            item.type === 'TIER_PROMOTION'
                              ? 'text-amber-400'
                              : isPositive
                              ? 'text-emerald-400'
                              : isNegative
                              ? 'text-red-400'
                              : 'text-neutral-400'
                          }`}>
                            {item.change > 0 ? `+${item.change} CP` : item.change < 0 ? `${item.change} CP` : 'Baseline Reset'}
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-500 uppercase mt-1">
                            {formatDate(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

            <div className="bg-[#050505] border border-neutral-950 rounded-xl p-4 text-center mt-4">
              <p className="text-xs font-mono text-neutral-500 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-neutral-600" />
                Recalibrating ratings on queue closure.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
