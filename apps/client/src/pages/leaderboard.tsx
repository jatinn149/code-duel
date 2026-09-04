import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard, LeaderboardUser } from '@/api/auth-api';
import { calculateCpRank } from '@code-duel/shared';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Search,
  Sparkles,
  Shield,
  Activity
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

export const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    getLeaderboard()
      .then((data) => {
        setPlayers(data.leaderboard || []);
      })
      .catch((err) => {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to link with leaderboard protocols.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(p => p.username.toLowerCase().includes(query));
  }, [players, searchQuery]);

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/10 text-amber-400 border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
    if (rank === 2) return 'bg-slate-300/10 text-slate-300 border border-slate-300/30';
    if (rank === 3) return 'bg-amber-700/10 text-amber-600 border border-amber-700/30';
    return 'bg-zinc-900 border border-zinc-800 text-zinc-400';
  };

  const getRankColorClass = (cp: number) => {
    const rankName = calculateCpRank(cp).toUpperCase();
    if (rankName === 'APEX CODER') {
      return 'text-white border-white font-extrabold shadow-[0_0_15px_rgba(255,255,255,0.15)]';
    }
    if (rankName.includes('CODEBREAKER') || rankName.includes('GRANDMASTER')) {
      return 'text-rose-400 border-rose-900';
    }
    if (rankName.includes('ELITE') || rankName.includes('MASTER')) {
      return 'text-indigo-400 border-indigo-900';
    }
    if (rankName.includes('SPECIALIST') || rankName.includes('EXPERT')) {
      return 'text-amber-400 border-amber-900';
    }
    if (rankName.includes('CODER') || rankName.includes('APPRENTICE')) {
      return 'text-emerald-400 border-emerald-900';
    }
    return 'text-zinc-500 border-zinc-800';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 p-4 sm:p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col space-y-6 sm:space-y-8 bg-black text-zinc-100"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center space-x-2 border border-zinc-900 bg-zinc-950 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-widest uppercase">
            COMMUNICATION PROTOCOL LINKED
          </span>
        </div>
      </motion.div>

      {/* Main Title Section */}
      <motion.div variants={itemVariants} className="relative w-full rounded-xl border border-zinc-900 bg-[#0a0a0a] p-5 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Arena <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Leaderboard</span>
            </h1>
            <p className="text-zinc-500 font-medium text-xs tracking-wider uppercase">
              Global rankings of the top coding arena players
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white font-mono placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          </div>
        </div>
      </motion.div>

      {/* Leaderboard Table Container */}
      <motion.div variants={itemVariants} className="w-full bg-[#0a0a0a] border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Syncing global ledgers...
            </span>
          </div>
        ) : error ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-rose-400 font-bold">
              Link Failed
            </span>
            <p className="text-[10px] text-zinc-500 font-mono">
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                getLeaderboard()
                  .then((data) => setPlayers(data.leaderboard || []))
                  .catch(() => setError('Failed to link with leaderboard protocols.'))
                  .finally(() => setLoading(false));
              }}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-mono hover:text-white uppercase tracking-wider transition-all"
            >
              Retry Link
            </button>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-600 font-bold">
              No players found
            </span>
            <p className="text-[10px] text-zinc-700 font-mono">
              Try searching for a different username
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900/80 bg-zinc-950/40 text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-center w-16">Rank</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6">Player</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-right w-36">Coder Points</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-center w-24">Level</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-center w-36">Tier</th>
                  <th className="py-3 sm:py-4 px-3 sm:px-6 text-right w-44">Win Rate / Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/30 text-xs">
                {filteredPlayers.map((player, idx) => {
                  const rank = idx + 1;
                  const winRate = player.matchesPlayed === 0 ? '0.0' : ((player.wins / player.matchesPlayed) * 100).toFixed(1);
                  const isTopThree = rank <= 3;
                  return (
                    <tr
                      key={player.id}
                      className={`hover:bg-zinc-900/10 transition-colors group ${
                        isTopThree ? 'bg-indigo-950/5' : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-center font-mono font-black">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${getRankBadgeClass(rank)}`}>
                          {rank}
                        </span>
                      </td>

                      {/* Operator Name */}
                      <td className="py-3.5 sm:py-4.5 px-3 sm:px-6 font-bold text-white tracking-tight">
                        <div className="flex items-center space-x-2">
                          <span className="group-hover:text-indigo-400 transition-colors">
                            {player.username}
                          </span>
                          {isTopThree && <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                      </td>

                      {/* Coder Points */}
                      <td className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-right font-mono font-black text-white">
                        <div className="flex flex-col items-end">
                          <span>{player.rating} CP</span>
                          <span className={`text-[8px] font-semibold uppercase tracking-wider ${getRankColorClass(player.rating)}`}>
                            {calculateCpRank(player.rating)}
                          </span>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-center">
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-zinc-900 text-[10px] font-mono font-bold text-zinc-400 border border-zinc-800">
                          <Shield className="w-3 h-3 text-indigo-400" />
                          <span>Lvl {player.level ?? 1}</span>
                        </span>
                      </td>

                      {/* Seasonal Tier */}
                      <td className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-center font-mono">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded">
                          {player.seasonalTier || 'UNRANKED'}
                        </span>
                      </td>

                      {/* Win/Loss */}
                      <td className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-right font-mono text-zinc-400">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-zinc-300">{winRate}% WR</span>
                          <span className="text-[8px] text-zinc-600 font-semibold uppercase mt-0.5">
                            {player.wins} W / {player.losses} L
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Footer Info */}
      <motion.div variants={itemVariants} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-center">
        <p className="text-[9px] font-mono text-zinc-600 font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-zinc-700" />
          Leaderboard updates dynamically after every match.
        </p>
      </motion.div>
    </motion.div>
  );
};
