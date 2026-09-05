import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Swords,
  Flame,
  Zap,
  Users,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 1. Quickode Card with Snappy Kinetic Speed Tilt & Electrical Surge
const QuickodeCard: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Snappy, high-stiffness spring for kinetic speed feel
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 350, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 350, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width - 0.5;
    const y = (touch.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, x)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, y)));
  };

  const handleTouchEnd = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileHover={{ scale: 1.025, y: -6 }}
        whileTap={{ scale: 0.98 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-emerald-500/60 shadow-2xl flex flex-col justify-between relative overflow-hidden group h-full cursor-pointer transition-colors duration-200"
      >
        {/* Dynamic Electric Laser Cursor Spotlight (subtle on mobile, intense on hover/touch) */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-35 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]) =>
                `radial-gradient(450px circle at ${(Number(x) + 0.5) * 100}% ${(Number(y) + 0.5) * 100}%, rgba(16, 185, 129, 0.22), transparent 70%)`
            ),
          }}
        />

        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/25 transition-colors" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, -8, 8, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ rotate: [-12, 12, -6, 6, 0], scale: 1.25 }}
              className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-shadow"
            >
              <Zap size={24} />
            </motion.div>
            <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
              FAST 1v1 SPRINT
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-emerald-300 transition-colors">
            Quickode
          </h3>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6 font-sans">
            A rapid head-to-head sprint. Both players get the exact same coding question. First to write clean code and pass all test cases takes the win!
          </p>

          {/* Mode Highlights Pill List */}
          <div className="space-y-2 font-mono text-xs mb-6">
            <div className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 flex items-center justify-between text-neutral-300 group-hover:border-emerald-500/30 transition-colors">
              <span className="flex items-center gap-2 text-white font-medium">
                <Clock size={13} className="text-emerald-400" />
                <span>Duration</span>
              </span>
              <span className="text-emerald-400 font-bold">5 Minutes</span>
            </div>
            <div className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 flex items-center justify-between text-neutral-300 group-hover:border-emerald-500/30 transition-colors">
              <span className="flex items-center gap-2 text-white font-medium">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Problem Count</span>
              </span>
              <span className="text-white font-bold">1 Problem</span>
            </div>
          </div>

          {/* Match Card Preview */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-[11px] font-mono text-emerald-300 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Match Pacing</span>
              <span className="text-emerald-400">⚡ High Speed</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans">
              Ideal for casual breaks, daily practice, and fast CP rank gains.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
          <span>Match Format</span>
          <span className="text-emerald-400 font-bold">Single Round Blitz</span>
        </div>
      </motion.div>
    </div>
  );
};

// 2. Multi-Round Card with Deep 3D Multi-Layer Floating Parallax
const MultiRoundCard: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Parallax translation for inner depth layers
  const layerX = useSpring(useTransform(mouseX, [-0.5, 0.5], [14, -14]), { stiffness: 240, damping: 24 });
  const layerY = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 240, damping: 24 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width - 0.5;
    const y = (touch.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, x)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, y)));
  };

  const handleTouchEnd = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileHover={{ y: -8, scale: 1.025 }}
        whileTap={{ scale: 0.98 }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-indigo-500/60 shadow-2xl flex flex-col justify-between relative overflow-hidden group h-full cursor-pointer transition-colors duration-200"
      >
        {/* Deep Indigo/Purple Cursor Spotlight (subtle on mobile, intense on hover/touch) */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-35 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]) =>
                `radial-gradient(450px circle at ${(Number(x) + 0.5) * 100}% ${(Number(y) + 0.5) * 100}%, rgba(99, 102, 241, 0.25), transparent 70%)`
            ),
          }}
        />

        <div className="absolute -top-20 -right-20 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/25 transition-colors" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <motion.div
              animate={{
                rotate: [0, 8, -4, 0],
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ rotate: 18, scale: 1.25 }}
              className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-shadow"
            >
              <Swords size={24} />
            </motion.div>
            <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold uppercase">
              BEST OF 3 SERIES
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-indigo-300 transition-colors">
            Multi-Round Battle
          </h3>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6 font-sans">
            The true tournament format. Compete across 3 separate rounds with increasing problem difficulty. First player to claim 2 rounds wins the match.
          </p>

          {/* Mode Highlights with Floating Parallax Depth */}
          <motion.div style={{ x: layerX, y: layerY }} className="space-y-2 font-mono text-xs mb-6">
            <div className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 flex items-center justify-between text-neutral-300 group-hover:border-indigo-500/30 transition-colors">
              <span className="flex items-center gap-2 text-white font-medium">
                <Clock size={13} className="text-indigo-400" />
                <span>Duration</span>
              </span>
              <span className="text-indigo-400 font-bold">Up to 15 Mins</span>
            </div>
            <div className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 flex items-center justify-between text-neutral-300 group-hover:border-indigo-500/30 transition-colors">
              <span className="flex items-center gap-2 text-white font-medium">
                <Shield size={13} className="text-indigo-400" />
                <span>Round Format</span>
              </span>
              <span className="text-white font-bold">Best of 3 Rounds</span>
            </div>
          </motion.div>

          {/* Match Card Preview */}
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/25 text-[11px] font-mono text-indigo-300 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Match Stakes</span>
              <span className="text-indigo-300">🏆 High Rating (CP)</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans">
              Rewards stamina, problem-solving depth, and comeback skills.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
          <span>Match Format</span>
          <span className="text-indigo-400 font-bold">Strategic 3-Round Clash</span>
        </div>
      </motion.div>
    </div>
  );
};

// 3. Chaos Arena Card with Unstable Chaotic Wobble & Zero CP Risk
const ChaosArenaCard: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Unstable angular sway for chaos effect
  const rotateZ = useSpring(useTransform(mouseX, [-0.5, 0.5], [-3.5, 3.5]), { stiffness: 220, damping: 16 });
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 16 });
  const mutatorDrift = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 18 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width - 0.5;
    const y = (touch.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(Math.max(-0.5, Math.min(0.5, x)));
    mouseY.set(Math.max(-0.5, Math.min(0.5, y)));
  };

  const handleTouchEnd = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        whileHover={{ scale: 1.025, y: -6 }}
        whileTap={{ scale: 0.98 }}
        style={{
          rotateZ,
          rotateX,
          transformStyle: 'preserve-3d',
        }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800 hover:border-rose-500/60 shadow-2xl flex flex-col justify-between relative overflow-hidden group h-full cursor-pointer transition-colors duration-200"
      >
        {/* Dynamic Fiery Crimson/Amber Cursor Spotlight (subtle on mobile, intense on hover/touch) */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-35 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [mouseX, mouseY],
              ([x, y]) =>
                `radial-gradient(450px circle at ${(Number(x) + 0.5) * 100}% ${(Number(y) + 0.5) * 100}%, rgba(244, 63, 94, 0.22), transparent 70%)`
            ),
          }}
        />

        <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/25 transition-colors" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <motion.div
              animate={{
                scale: [1, 1.2, 0.95, 1.15, 1],
                rotate: [-6, 6, -4, 4, 0],
              }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{
                scale: [1, 1.3, 0.9, 1.25, 1],
                rotate: [-10, 10, -6, 6, 0],
              }}
              className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-shadow"
            >
              <Flame size={24} />
            </motion.div>
            <span className="text-[10px] font-mono tracking-widest px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold uppercase">
              UNRANKED • 0 CP RISK
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight mb-2 group-hover:text-rose-300 transition-colors">
            Chaos Arena
          </h3>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-6 font-sans">
            Competitive coding with unpredictable twists! Random match modifiers trigger live—such as blindfold syntax, speed surges, and sudden death. Play for pure fun without risking any CP!
          </p>

          {/* Mode Highlights with Drifting Mutators (NO FAKE CP) */}
          <div className="space-y-2 font-mono text-xs mb-6">
            <motion.div
              style={{ x: mutatorDrift }}
              className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 flex items-center justify-between text-neutral-300 group-hover:border-rose-500/30 transition-colors"
            >
              <span className="flex items-center gap-2 text-white font-medium">
                <Flame size={13} className="text-rose-400" />
                <span>Surprise Element</span>
              </span>
              <span className="text-rose-400 font-bold">Random Mutators</span>
            </motion.div>
            <motion.div
              style={{ x: useTransform(mutatorDrift, (v) => -v) }}
              className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 flex items-center justify-between text-neutral-300 group-hover:border-rose-500/30 transition-colors"
            >
              <span className="flex items-center gap-2 text-white font-medium">
                <Shield size={13} className="text-emerald-400" />
                <span>Rating Risk</span>
              </span>
              <span className="text-emerald-400 font-bold">0 CP (Safe Practice)</span>
            </motion.div>
          </div>

          {/* Match Card Preview */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/25 text-[11px] font-mono text-rose-300 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Mutator Intensity</span>
              <span className="text-rose-400">⚡ Unpredictable</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-sans">
              Pure chaotic adrenaline and quick thinking with zero rating loss.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-5 border-t border-neutral-850 mt-6 font-mono text-xs flex justify-between items-center text-neutral-400">
          <span>Match Format</span>
          <span className="text-rose-400 font-bold">Unranked Chaos Battlefield</span>
        </div>
      </motion.div>
    </div>
  );
};

export const BentoFeatures: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="game-modes" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#030303] relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Layers size={13} className="text-indigo-400" />
            <span>CHOOSE YOUR BATTLEFIELD</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            3 EXCITING MODES.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              ENDLESS ACTION.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Whether you have 5 minutes for a quick speed run or want a high-stakes best-of-3 showdown, Code Duel gives you the perfect match format.
          </p>
        </div>

        {/* 3 Main Battle Modes Grid (Quickode, Multi-Round, Chaos Arena) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-8">
          <QuickodeCard />
          <MultiRoundCard />
          <ChaosArenaCard />
        </div>

        {/* Secondary Row: Daily Directives & Social Friend Matchmaking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Daily Directives */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="p-6 sm:p-7 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">
                      Daily Directives & Streaks
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Refreshes Every 24 Hours
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  DAILY CP
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-4">
                Solve fresh daily coding puzzles to keep your streak alive. Fulfilling your daily mission unlocks an instant reward claim button with bonus Coder Points (CP) and XP.
              </p>

              <div className="p-3.5 rounded-xl bg-black/60 border border-neutral-850 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-neutral-300">Daily Mission: Solve 1 Match</span>
                </div>
                <span className="text-emerald-400 font-bold">+50 CP Reward</span>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-850 mt-5 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Preserve streak grace days</span>
              <span className="text-amber-400 font-semibold">Automatic Tracker</span>
            </div>
          </motion.div>

          {/* Card: Play With Friends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="p-6 sm:p-7 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight">
                      Friends & Private Lobbies
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Real-Time Social Network
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                  INSTANT INVITE
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed mb-4">
                Challenge your friends directly. Send match invitations that appear instantly in their inbox, check who is currently online, and chat in private room lobbies.
              </p>

              <div className="p-3.5 rounded-xl bg-black/60 border border-neutral-850 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-neutral-300">Direct Friend Challenge</span>
                </div>
                <span className="text-indigo-400 font-bold">1-Click Join</span>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-850 mt-5 flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Custom room passwords</span>
              <button 
                onClick={() => navigate('/signup')} 
                className="text-white hover:text-indigo-400 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Join Arena</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
