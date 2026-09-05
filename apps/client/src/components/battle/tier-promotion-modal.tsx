import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Sparkles,
  ArrowRight,
  Flame,
  Shield,
  Zap,
  CheckCircle2,
  ChevronRight,
  Award,
} from 'lucide-react';
import { clsx } from 'clsx';
import { CP_RANKS } from '@code-duel/shared';

interface TierPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousTier: string;
  newTier: string;
  previousCp: number;
  newCp: number;
  cpChange: number;
  previousLevel: number;
  newLevel: number;
  isTierPromotion: boolean;
  isLevelUp: boolean;
  username: string;
}

const getTierColorStyle = (tier: string) => {
  const t = tier.toLowerCase();
  if (t === 'coder') {
    return {
      border: 'border-emerald-500/60',
      bg: 'bg-emerald-950/40',
      badgeBg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_50px_rgba(16,185,129,0.35)]',
      gradient: 'from-emerald-500 to-teal-400',
    };
  }
  if (t === 'specialist') {
    return {
      border: 'border-indigo-500/60',
      bg: 'bg-indigo-950/40',
      badgeBg: 'bg-indigo-500/20',
      text: 'text-indigo-400',
      glow: 'shadow-[0_0_50px_rgba(99,102,241,0.35)]',
      gradient: 'from-indigo-500 to-purple-400',
    };
  }
  if (t === 'expert') {
    return {
      border: 'border-cyan-500/60',
      bg: 'bg-cyan-950/40',
      badgeBg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_50px_rgba(6,182,212,0.35)]',
      gradient: 'from-cyan-500 to-blue-400',
    };
  }
  if (t === 'elite' || t === 'master') {
    return {
      border: 'border-amber-500/60',
      bg: 'bg-amber-950/40',
      badgeBg: 'bg-amber-500/20',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_50px_rgba(245,158,11,0.35)]',
      gradient: 'from-amber-500 to-yellow-400',
    };
  }
  if (t === 'grandmaster' || t === 'codebreaker' || t === 'apex coder') {
    return {
      border: 'border-rose-500/60',
      bg: 'bg-rose-950/40',
      badgeBg: 'bg-rose-500/20',
      text: 'text-rose-400',
      glow: 'shadow-[0_0_60px_rgba(244,63,94,0.4)]',
      gradient: 'from-rose-500 to-orange-400',
    };
  }
  // Initiate / Default
  return {
    border: 'border-zinc-700',
    bg: 'bg-zinc-900/60',
    badgeBg: 'bg-zinc-800',
    text: 'text-zinc-300',
    glow: 'shadow-[0_0_30px_rgba(161,161,170,0.15)]',
    gradient: 'from-zinc-400 to-zinc-600',
  };
};

function useRollCounter(start: number, end: number, durationMs: number = 1400) {
  const [val, setVal] = useState(start);

  useEffect(() => {
    if (start === end) {
      setVal(end);
      return;
    }
    const startTime = performance.now();
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(start + (end - start) * ease));
      if (progress >= 1) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, [start, end, durationMs]);

  return val;
}

export const TierPromotionModal: React.FC<TierPromotionModalProps> = ({
  isOpen,
  onClose,
  previousTier,
  newTier,
  previousCp,
  newCp,
  cpChange,
  previousLevel,
  newLevel,
  isTierPromotion,
  isLevelUp,
  username,
}) => {
  const animatedCp = useRollCounter(previousCp, newCp, 1500);
  const newStyle = getTierColorStyle(newTier);
  const prevStyle = getTierColorStyle(previousTier);

  // Play synthetic esports triumphant fanfare when modal appears
  useEffect(() => {
    if (!isOpen) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // 4-note ascending heroic chord: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.7);
      });
    } catch {
      // Audio context may be restricted by browser policy
    }
  }, [isOpen]);

  const targetTierRank = CP_RANKS.find((r) => r.rank.toLowerCase() === newTier.toLowerCase());
  const baselineCp = targetTierRank?.min ?? newCp;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none">
          {/* Backdrop Blur + Deep Cosmic Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
          />

          {/* Glowing Ambient Radial Burst */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-500/10 via-emerald-500/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

          {/* Main Cinematic Card Container */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={clsx(
              "relative z-10 w-full max-w-2xl bg-zinc-950/95 border rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl overflow-hidden",
              newStyle.border,
              newStyle.glow
            )}
          >
            {/* Ambient Corner Sparkles Accent */}
            <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-40">
              <Sparkles className="w-12 h-12 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            {/* Top Eyebrow Badge */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono font-black tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTierPromotion ? 'TIER ASCENSION ACHIEVED' : 'OPERATIVE LEVEL UP'}</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </motion.div>

            {/* Main Title Banner */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-4xl font-black text-white tracking-wider uppercase mb-1 drop-shadow-md"
            >
              {isTierPromotion ? (
                <>
                  PROMOTED TO{' '}
                  <span className={clsx("bg-gradient-to-r bg-clip-text text-transparent", newStyle.gradient)}>
                    {newTier}
                  </span>
                </>
              ) : (
                <>LEVEL {newLevel} UNLOCKED</>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6"
            >
              Congratulations <span className="text-white font-bold">@{username}</span>! Your tactical performance has elevated your competitive standing in the Code Duel League.
            </motion.p>

            {/* Side-by-Side Tier Transition Visualizer */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-7 items-center gap-3 sm:gap-2 mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
              {/* Previous Tier Card */}
              <div className={clsx("sm:col-span-3 p-4 rounded-xl border flex flex-col items-center justify-center", prevStyle.bg, prevStyle.border)}>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold mb-1">
                  Previous Division
                </span>
                <div className={clsx("w-12 h-12 rounded-xl border flex items-center justify-center my-2 text-zinc-400 font-bold", prevStyle.badgeBg, prevStyle.border)}>
                  <Shield size={24} className={prevStyle.text} />
                </div>
                <h3 className={clsx("text-base font-black uppercase tracking-wide", prevStyle.text)}>
                  {previousTier}
                </h3>
                <span className="text-xs font-mono text-zinc-400 mt-0.5">
                  {previousCp} CP
                </span>
                {isLevelUp && (
                  <span className="text-[10px] font-mono text-zinc-400 mt-1">
                    Level {previousLevel}
                  </span>
                )}
              </div>

              {/* Transition Indicator with Delta */}
              <div className="sm:col-span-1 flex flex-col items-center justify-center my-1 sm:my-0">
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-md"
                >
                  <ArrowRight size={16} />
                </motion.div>
                {cpChange > 0 && (
                  <span className="text-[11px] font-mono font-extrabold text-emerald-400 mt-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    +{cpChange} CP
                  </span>
                )}
              </div>

              {/* New Tier Card (Highlighted with Glowing Aura) */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: [0.98, 1.02, 1] }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className={clsx(
                  "sm:col-span-3 p-4 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden shadow-lg",
                  newStyle.bg,
                  newStyle.border,
                  newStyle.glow
                )}
              >
                <span className={clsx("text-[10px] font-mono uppercase tracking-widest font-black mb-1 flex items-center gap-1", newStyle.text)}>
                  <Flame size={12} className="animate-pulse" />
                  New Rank Unlocked
                </span>
                <div className={clsx("w-12 h-12 rounded-xl border flex items-center justify-center my-2 shadow-md", newStyle.badgeBg, newStyle.border, newStyle.text)}>
                  <Award size={26} className="animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
                <h3 className={clsx("text-base sm:text-lg font-black uppercase tracking-wide", newStyle.text)}>
                  {newTier}
                </h3>
                <span className="text-xs font-mono font-bold text-white mt-0.5">
                  {animatedCp} CP
                </span>
                {isLevelUp && (
                  <span className="text-[10px] font-mono text-amber-300 font-bold mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Level {newLevel}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Live Progress Baseline Tracker */}
            <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 mb-6 text-left flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-wide">
                    Division Threshold Achieved
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    Baseline entry: <span className="text-amber-400 font-bold">{baselineCp} CP</span> • Current rating: <span className="text-emerald-400 font-bold">{animatedCp} CP</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                <Zap size={14} className="text-yellow-400" />
                <span>Rank Synchronized</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className={clsx(
                  "w-full sm:w-auto px-8 py-3.5 rounded-xl font-mono text-xs font-black tracking-wider uppercase text-white shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all",
                  "bg-gradient-to-r hover:brightness-110 shadow-indigo-500/25",
                  newStyle.gradient
                )}
              >
                <span>CLAIM & CONTINUE TO RESULTS</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
