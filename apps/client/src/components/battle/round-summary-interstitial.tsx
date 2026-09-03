import React, { useEffect, useState } from 'react';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Clock, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export const RoundSummaryInterstitial: React.FC = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const [countdownSecs, setCountdownSecs] = useState(10);

  const currentRoundIndex = currentRoom?.currentRound || 1;
  const nextRoundIndex = currentRoundIndex + 1;
  const totalRounds = currentRoom?.totalRounds || 3;

  // Sync remaining countdown time from summaryEndsAt
  useEffect(() => {
    const summaryEndsAt = currentRoom?.summaryEndsAt;
    if (!summaryEndsAt) {
      setCountdownSecs(10);
      return;
    }

    const updateCountdown = () => {
      const targetTime = new Date(summaryEndsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetTime - now) / 1000));
      setCountdownSecs(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [currentRoom?.summaryEndsAt]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 bg-black text-neutral-200 min-h-screen relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg p-8 bg-zinc-950/90 border border-zinc-900/90 rounded-2xl shadow-2xl relative z-10 text-center backdrop-blur-xl"
      >
        {/* Badge & Title */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-widest mb-4">
          <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
          <span>Round {currentRoundIndex} of {totalRounds} Concluded</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase mb-2">
          Preparing Round {nextRoundIndex}
        </h2>
        <p className="text-xs text-zinc-400 font-medium max-w-md mx-auto mb-6">
          Both combatants have concluded Round {currentRoundIndex}. Loading the next challenge into the battleground.
        </p>

        {/* Combatants Ready Status */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {currentRoom?.players.map((player) => {
            const isMe = player.id === user?.id;

            return (
              <div
                key={player.id}
                className="p-3 rounded-xl border bg-zinc-900/40 border-zinc-800/80 text-left flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-white">
                    {(player.username?.charAt(0) || 'P').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[90px]">
                        {player.username}
                      </span>
                      {isMe && (
                        <span className="bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded text-[7.5px] font-mono font-bold uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Ready</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 10-Second Giant Countdown Card */}
        <div className="bg-gradient-to-b from-indigo-950/30 to-black border border-indigo-900/30 rounded-xl p-5 relative overflow-hidden">
          <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-spin-slow text-indigo-400" />
            <span>Next Round Initializing In</span>
          </div>

          <div className="text-5xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_20px_rgba(99,102,241,0.4)] my-1">
            {countdownSecs}s
          </div>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-800">
            <motion.div
              className="bg-indigo-500 h-full rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: `${Math.max(0, (countdownSecs / 10) * 100)}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </div>

          <p className="text-[10px] text-zinc-500 font-mono mt-3 flex items-center justify-center gap-1">
            <span>Entering Round {nextRoundIndex}</span>
            <ArrowRight className="w-3 h-3 text-indigo-400" />
            <span>New Problem Loading</span>
          </p>
        </div>

        {/* Suspense Note */}
        <p className="text-[9px] text-zinc-600 font-mono mt-4 uppercase tracking-wider">
          Complete series analysis and scores will be revealed after Round 3.
        </p>
      </motion.div>
    </div>
  );
};
