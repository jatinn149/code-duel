import React, { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { SocketEvents } from '@code-duel/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, UserPlus, UserMinus, Award } from 'lucide-react';
import { clsx } from 'clsx';

interface PlayerSummary {
  id: string;
  username: string;
  playerId: string;
  rank: string;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  matchesPlayed: number;
  winRate: number;
  status: string;
  relationshipState: 'None' | 'Pending Sent' | 'Pending Received' | 'Friends' | 'Self';
}

const summaryCache = new Map<string, PlayerSummary>();

export const PlayerHoverCard: React.FC<{
  userId: string;
  username: string;
  children: React.ReactNode;
  className?: string;
}> = ({ userId, children, className }) => {
  const socket = useSocket();
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!hovered) return;

    if (summaryCache.has(userId)) {
      setSummary(summaryCache.get(userId) || null);
      return;
    }

    setLoading(true);
    fetch(`/api/v1/social/summary/${userId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          summaryCache.set(userId, json.data);
          setSummary(json.data);
        }
      })
      .catch((err) => console.error('Error fetching user summary:', err))
      .finally(() => setLoading(false));
  }, [hovered, userId]);

  const handleAddFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!socket || !summary) return;
    socket.emit(SocketEvents.FRIEND_REQUEST_SEND, { toUserId: userId });
    
    const updated: PlayerSummary = { ...summary, relationshipState: 'Pending Sent' };
    summaryCache.set(userId, updated);
    setSummary(updated);
  };

  const handleCancelRequest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!socket || !summary) return;
    socket.emit('social:friend_request_cancel', { toUserId: userId });

    const updated: PlayerSummary = { ...summary, relationshipState: 'None' };
    summaryCache.set(userId, updated);
    setSummary(updated);
  };

  const handleRemoveFriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!socket || !summary) return;
    socket.emit(SocketEvents.FRIEND_REMOVED, { friendId: userId });

    const updated: PlayerSummary = { ...summary, relationshipState: 'None' };
    summaryCache.set(userId, updated);
    setSummary(updated);
  };

  const getRankBadgeColor = (rank: string) => {
    switch (rank?.toUpperCase()) {
      case 'GRANDMASTER': return 'from-accent-rose to-accent-amber text-white shadow-[0_0_10px_rgba(251,113,133,0.5)]';
      case 'MASTER': return 'from-accent-violet to-accent-rose text-white shadow-[0_0_10px_rgba(167,139,250,0.5)]';
      case 'DIAMOND': return 'from-accent-cyan to-brand-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]';
      case 'PLATINUM': return 'from-accent-emerald to-accent-cyan text-white shadow-[0_0_10px_rgba(52,211,153,0.5)]';
      case 'GOLD': return 'from-accent-amber to-yellow-600 text-surface-950 font-black shadow-[0_0_10px_rgba(251,191,36,0.5)]';
      case 'SILVER': return 'from-surface-300 to-surface-500 text-surface-950 font-black';
      case 'BRONZE': return 'from-yellow-700 to-amber-900 text-white';
      default: return 'from-surface-700 to-surface-800 text-surface-300';
    }
  };

  return (
    <div
      className={clsx("relative", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, type: 'spring', bounce: 0.4 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-80 card-elevated glass shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[9999] pointer-events-auto border-surface-700 p-0 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />
            
            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-caption font-bold text-surface-400 tracking-widest uppercase">Fetching Intel...</span>
                </div>
              ) : summary ? (
                <div className="space-y-5 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-xl bg-surface-900 border border-brand-500/30 flex items-center justify-center font-black text-brand-400 text-xl inner-light shadow-md">
                      {summary.username.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="text-title font-black text-white">{summary.username}</span>
                        <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black tracking-widest bg-gradient-to-r uppercase", getRankBadgeColor(summary.rank))}>
                          {summary.rank}
                        </span>
                      </div>
                      <span className="text-caption font-mono font-bold text-surface-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-accent-amber" />
                        {summary.playerId}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-900/60 border border-surface-700/50 p-3 rounded-xl text-center inner-light">
                      <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase block mb-1">Coder Points</span>
                      <span className="text-body font-black text-white font-mono">{summary.rating} CP</span>
                    </div>
                    <div className="bg-surface-900/60 border border-surface-700/50 p-3 rounded-xl text-center inner-light">
                      <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase block mb-1">Win Rate</span>
                      <span className="text-body font-black text-white font-mono">{summary.winRate}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-caption text-surface-300 bg-surface-900/40 px-4 py-2 rounded-lg border border-surface-800">
                    <div className="flex items-center space-x-2">
                      <Flame className={clsx("w-4 h-4", summary.streak > 0 ? "text-accent-rose animate-pulse" : "text-surface-600")} />
                      <span className="font-bold tracking-widest uppercase">{summary.streak > 0 ? `${summary.streak} Streak` : 'No Streak'}</span>
                    </div>
                    <span className="font-mono font-bold">W {summary.wins} / T {summary.matchesPlayed}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfile(true);
                      }}
                      className="btn-secondary flex-1 py-2 text-[10px]"
                    >
                      VIEW PROFILE
                    </button>

                    {summary.relationshipState === 'None' && (
                      <button
                        onClick={handleAddFriend}
                        className="btn-primary py-2 px-4 text-[10px] flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        ADD
                      </button>
                    )}

                    {summary.relationshipState === 'Pending Sent' && (
                      <button
                        onClick={handleCancelRequest}
                        className="btn-ghost py-2 px-4 text-[10px] text-surface-400 hover:text-accent-rose border border-surface-700 hover:border-accent-rose/30"
                      >
                        CANCEL
                      </button>
                    )}

                    {summary.relationshipState === 'Friends' && (
                      <button
                        onClick={handleRemoveFriend}
                        className="btn-danger py-2 px-4 text-[10px] flex items-center justify-center gap-2"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        REMOVE
                      </button>
                    )}

                    {summary.relationshipState === 'Self' && (
                      <span className="text-[10px] text-brand-400 font-bold tracking-widest uppercase px-2">Your Profile</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="text-caption font-bold text-accent-rose uppercase tracking-widest">Failed to decrypt data</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && summary && (
          <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-md flex items-center justify-center z-[99999] pointer-events-auto p-4 transition-all duration-300 bg-noise">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md card-elevated overflow-hidden p-0 border border-surface-700 glow-brand"
            >
              <div className="relative p-10 pb-8 bg-gradient-to-b from-brand-500/20 via-surface-900/50 to-surface-950">
                <div className="absolute top-0 right-0 w-full h-full bg-brand-500/5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-400/20 via-transparent to-transparent pointer-events-none" />
                
                <div className="flex items-center space-x-6 relative z-10">
                  <div className="w-24 h-24 rounded-2xl bg-surface-900 border border-brand-500/40 flex items-center justify-center font-black text-brand-300 text-4xl shadow-xl shadow-brand-500/20 inner-light relative group">
                    <div className="absolute inset-0 bg-brand-500/20 blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10">{summary.username.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h2 className="text-display text-white text-3xl">{summary.username}</h2>
                    </div>
                    <span className={clsx("px-3 py-1 rounded-md text-[10px] font-black tracking-widest bg-gradient-to-r uppercase shadow-md inline-block mb-3", getRankBadgeColor(summary.rank))}>
                      {summary.rank}
                    </span>
                    <p className="text-caption font-mono text-surface-400 font-bold flex items-center gap-2">
                      <Award className="w-4 h-4 text-surface-500" />
                      {summary.playerId}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-3 bg-surface-900/80 px-3 py-1.5 rounded-lg border border-surface-800 w-fit">
                      <span className={clsx("w-2.5 h-2.5 rounded-full animate-pulse", summary.status === 'ONLINE' ? 'bg-accent-emerald' : (summary.status === 'IN_GAME' ? 'bg-accent-amber' : 'bg-surface-600'))} />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-surface-300">{summary.status || 'OFFLINE'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-2 space-y-8 bg-surface-950">
                <div className="grid grid-cols-3 gap-4">
                  <div className="card p-4 text-center inner-light border-surface-800">
                    <span className="text-[10px] font-bold text-surface-500 tracking-widest uppercase block mb-2">Rating</span>
                    <span className="text-title font-black text-white font-mono drop-shadow-sm">{summary.rating}</span>
                  </div>
                  <div className="card p-4 text-center inner-light border-surface-800">
                    <span className="text-[10px] font-bold text-surface-500 tracking-widest uppercase block mb-2">Matches</span>
                    <span className="text-title font-black text-white font-mono drop-shadow-sm">{summary.matchesPlayed}</span>
                  </div>
                  <div className="card p-4 text-center inner-light border-surface-800">
                    <span className="text-[10px] font-bold text-surface-500 tracking-widest uppercase block mb-2">Win %</span>
                    <span className="text-title font-black text-accent-cyan font-mono drop-shadow-sm">{summary.winRate}%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-body border-b border-surface-800/80 pb-3">
                    <span className="text-surface-400 font-bold tracking-widest uppercase text-xs">Total Victories</span>
                    <span className="text-accent-emerald font-black font-mono text-lg">{summary.wins}</span>
                  </div>
                  <div className="flex justify-between items-center text-body border-b border-surface-800/80 pb-3">
                    <span className="text-surface-400 font-bold tracking-widest uppercase text-xs">Total Defeats</span>
                    <span className="text-accent-rose font-black font-mono text-lg">{summary.losses}</span>
                  </div>
                  <div className="flex justify-between items-center text-body border-b border-surface-800/80 pb-3">
                    <span className="text-surface-400 font-bold tracking-widest uppercase text-xs">Current Streak</span>
                    <span className="text-accent-amber font-black font-mono flex items-center gap-2 text-lg">
                      <Flame className="w-5 h-5 text-accent-amber animate-pulse" />
                      {summary.streak} WINS
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfile(false);
                    }}
                    className="btn-primary w-full py-4 text-xs font-bold tracking-widest"
                  >
                    CLOSE DOSSIER
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
