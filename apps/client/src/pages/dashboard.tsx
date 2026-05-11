import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/hooks/use-socket';
import { SocketEvents } from '@code-duel/shared';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
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
  const { user } = useAuthStore();
  const { setRoom, setLoading, setError, isLoading } = useRoomStore();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleCreateRoom = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit(SocketEvents.CREATE_ROOM, { maxPlayers: 2 });

    socket.once(SocketEvents.ROOM_UPDATED, (room) => {
      setRoom(room);
      setLoading(false);
      navigate(`/battle/${room.id}`);
    });

    socket.once(SocketEvents.ROOM_ERROR, (message) => {
      setError(message);
      setLoading(false);
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !joinRoomId.trim()) return;

    setLoading(true);
    socket.emit(SocketEvents.JOIN_ROOM, { roomId: joinRoomId.trim() });

    socket.once(SocketEvents.ROOM_UPDATED, (room) => {
      setRoom(room);
      setLoading(false);
      setShowJoinModal(false);
      navigate(`/battle/${room.id}`);
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
      className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col space-y-8"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
            Arena <span className="text-indigo-500">Dashboard</span>
          </h1>
          <div className="flex items-center space-x-2 mt-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-slate-400 font-medium text-sm tracking-wide uppercase">
              Operational Status: <span className="text-emerald-500">Battle Ready</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowJoinModal(true)}
            className="flex-1 md:flex-none esports-button-secondary py-3.5 px-8 flex items-center justify-center space-x-3"
          >
            <LogIn className="w-5 h-5 text-indigo-400" />
            <span className="uppercase tracking-widest text-sm">Join Arena</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 25px -5px rgba(79, 70, 229, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="flex-1 md:flex-none esports-button-primary py-3.5 px-8 flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 fill-current" />
            )}
            <span className="uppercase tracking-widest text-sm">Create Duel</span>
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Player Identity */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
          <div className="esports-card p-6 border-l-4 border-l-indigo-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center mb-4 relative">
                <Sword className="w-10 h-10 text-indigo-500" />
                <div className="absolute -bottom-2 -right-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] font-black text-white">Lvl 42</span>
                </div>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {user?.username}
              </h2>
              <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase mt-1">
                Elite Guardian
              </p>

              <div className="w-full mt-6 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">
                    Skill Rating
                  </span>
                  <span className="text-white font-mono">{user?.rating} MMR</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '68%' }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="esports-card p-5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center">
              <Activity className="w-3 h-3 mr-2 text-indigo-500" />
              Battle Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  Win Rate
                </p>
                <p className="text-lg font-black text-emerald-500 mt-1">64.2%</p>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  Win Streak
                </p>
                <p className="text-lg font-black text-indigo-500 mt-1">8</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center Column: Game Selection */}
        <motion.div variants={itemVariants} className="lg:col-span-6 space-y-6">
          <div className="relative group overflow-hidden rounded-3xl h-[400px] flex flex-col justify-end p-8 border border-white/5">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-md">
                  Ranked Match
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-md">
                  1 vs 1
                </span>
              </div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-4">
                Global Ranked <br />
                Season 4
              </h2>
              <p className="text-slate-300 max-w-md text-sm mb-6 font-medium leading-relaxed">
                Test your algorithmic speed against the world's best. Stake your rating and climb
                the leaderboards in high-intensity duels.
              </p>
              <button
                onClick={handleCreateRoom}
                className="w-full sm:w-auto px-10 py-4 bg-white text-slate-950 font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-indigo-500 hover:text-white transition-all transform active:scale-95"
              >
                Enter Matchmaking
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="esports-card p-6 hover:border-indigo-500/30 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                  <Target className="w-6 h-6 text-indigo-500" />
                </div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                  Training
                </span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Practice Range
              </h3>
              <p className="text-slate-500 text-xs mt-2 font-medium">
                Solve challenges solo to sharpen your skills before entering the Arena.
              </p>
            </div>

            <div className="esports-card p-6 hover:border-rose-500/30 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-rose-500/10 rounded-xl group-hover:bg-rose-500/20 transition-colors">
                  <Trophy className="w-6 h-6 text-rose-500" />
                </div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                  Live
                </span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Tournament Room
              </h3>
              <p className="text-slate-500 text-xs mt-2 font-medium">
                Join organized community events with prize pools and unique problems.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Global Stats / Social */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
          <div className="esports-card overflow-hidden">
            <div className="p-5 border-b border-slate-800/50 bg-slate-800/20">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center">
                <Users className="w-3 h-3 mr-2 text-indigo-500" />
                Live in Arena
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400">
                      #{i + 10}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white uppercase tracking-tight">
                        User_{i}42
                      </span>
                      <span className="text-[9px] text-emerald-500 font-bold uppercase">
                        In Match
                      </span>
                    </div>
                  </div>
                  <Play className="w-3 h-3 text-slate-600 group-hover:text-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          <div className="esports-card p-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
              Season Progress
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Tier</span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest px-2 py-0.5 bg-indigo-500 rounded">
                  Platinum
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Season Ends</span>
                <span className="text-[10px] font-mono text-white italic">14d 06h 22m</span>
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
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                    Enter the Arena
                  </h2>
                  <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">
                    Verification Required
                  </p>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleJoinRoom}>
                <div className="mb-8">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                    Room Deployment Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-800"
                      autoFocus
                    />
                    <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !joinRoomId.trim()}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3 transition-all"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Initiate Deployment</span>
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
