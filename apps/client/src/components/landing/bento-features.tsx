import React from 'react';
import { motion } from 'framer-motion';
import {
  Swords,
  Flame,
  Zap,
  ShieldAlert,
  Users,
  Layers,
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  return (
    <section id="game-modes" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#030303] relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Layers size={13} className="text-indigo-400" />
            <span>MISSION SPECIFICATIONS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            BUILT FOR ESPORTS CODING.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              ENGINEERED FOR PRESSURE.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Every match mode tests a unique facet of software engineering: raw algorithmic knowledge, composure under real-time chaos, daily consistency, and tactical speed.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Card 1: 1v1 Ranked Duels (Large Col 8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-colors" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Swords size={24} />
                </div>
                <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold uppercase">
                  COMPETITIVE ELO RANKED
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                1v1 Head-to-Head Ranked Duels
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl mb-6">
                Enter algorithmic matchmaking and battle peer developers in real-time. Gain or lose Coder Points (CP) based on submission correctness, test execution speed, and solution efficiency.
              </p>

              {/* Visual Match Representation */}
              <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800/80 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-2 border-b border-neutral-850">
                  <span>MATCHMAKING QUEUE: FAST ESTIMATE &lt; 5s</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    MATCHED
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-white font-bold text-xs">
                      O
                    </div>
                    <span className="text-white font-bold">Operative #810</span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      Coder (750 CP)
                    </span>
                  </div>
                  <span className="text-neutral-500 font-bold">VS</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                      Coder (780 CP)
                    </span>
                    <span className="text-white font-bold">Challenger #422</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      C
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-neutral-850 text-left font-mono">
              <div>
                <span className="text-[10px] text-neutral-450 uppercase block">Round Format</span>
                <span className="text-xs font-bold text-white mt-0.5 block">Best of 1 or 3</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-450 uppercase block">Time Control</span>
                <span className="text-xs font-bold text-amber-400 mt-0.5 block">5 - 15 Minutes</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-450 uppercase block">Stake</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">Rank Elo (CP)</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Chaos Arena (Col 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/20 transition-colors" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Flame size={24} />
                </div>
                <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold uppercase">
                  UNSTABLE
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                Chaos Arena
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6">
                Survival under extreme environmental adversity. Solve problems while handling randomized in-game mutators like screen inversion, time dilations, and memory starvation.
              </p>

              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800 flex items-center justify-between text-neutral-300">
                  <span className="text-rose-400 font-bold">⚡ Blind Syntax</span>
                  <span className="text-[10px] text-neutral-450">Linter Disabled</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800 flex items-center justify-between text-neutral-300">
                  <span className="text-amber-400 font-bold">⏱️ Sudden Death</span>
                  <span className="text-[10px] text-neutral-450">Half-Time Clock</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
              <span>Dynamic Match Mutators</span>
              <span className="text-rose-400 font-bold">High Risk / High Reward</span>
            </div>
          </motion.div>

          {/* Card 3: Daily Directives (Col 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between shadow-2xl relative overflow-hidden group"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap size={24} />
                </div>
                <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold uppercase">
                  24H CADENCE
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                Daily Directives
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6">
                Rotated every midnight UTC. Maintain your coding streak, preserve streak grace days, and claim bonus CP and XP resources to climb the daily leaderboard.
              </p>

              <div className="p-4 rounded-xl bg-black/60 border border-neutral-800 font-mono text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-450 uppercase block">Active Streak</span>
                  <span className="text-lg font-black text-amber-400 mt-0.5 block flex items-center gap-1.5">
                    14 Days 🔥
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-450 uppercase block">Streak Grace</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block">
                    3 Charges Available
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
              <span>Automatic Reset Engine</span>
              <span className="text-amber-400 font-bold">Midnight UTC</span>
            </div>
          </motion.div>

          {/* Card 4: God Mode & Cloaked Spectator (Col 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between shadow-2xl relative overflow-hidden group"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldAlert size={24} />
                </div>
                <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold uppercase">
                  INVISIBLE SPECTATOR
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                God Mode & Spectate
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6">
                Admins and tournament referees can spectate any live match invisibly without detection. Instant room termination and real-time fraud inspection ensure tournament integrity.
              </p>

              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 font-mono text-xs space-y-1.5">
                <span className="text-purple-300 font-bold block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  Cloaked Stealth Protocol
                </span>
                <p className="text-[11px] text-neutral-400">
                  Referee connections emit zero presence footprint to active battle gladiators.
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
              <span>Tournament Referee</span>
              <span className="text-purple-400 font-bold">100% Unobtrusive</span>
            </div>
          </motion.div>

          {/* Card 5: Real-Time Social & Mailbox (Col 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between shadow-2xl relative overflow-hidden group"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users size={24} />
                </div>
                <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase">
                  INSTANT SYNC
                </span>
              </div>

              <h3 className="text-2xl font-black text-white tracking-tight mb-2">
                Live Operative Network
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6">
                Direct friend challenges, inbox reward claims with animations, and real-time presence indicators. Challenge any friend directly from your lobby with instant push delivery.
              </p>

              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 font-mono text-xs space-y-1.5">
                <span className="text-cyan-300 font-bold block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Instant Direct Transmissions
                </span>
                <p className="text-[11px] text-neutral-400">
                  Dual-socket event mesh ensures notifications and duel invites land with zero refresh.
                </p>
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
              <span>Dual Socket Protocol</span>
              <span className="text-cyan-400 font-bold">&lt; 15ms Broadcast</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
