import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Trophy, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface RewardCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  xp?: number;
  cp?: number;
  tierUpgrade?: string;
  title?: string;
  message?: string;
}

export const RewardCelebrationModal: React.FC<RewardCelebrationModalProps> = ({
  isOpen,
  onClose,
  xp = 0,
  cp = 0,
  tierUpgrade,
  title = 'HQ Resource Dispatch',
  message = 'Rewards successfully credited to your operative credentials.',
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      const items = Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: (Math.random() - 0.5) * 260,
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.4,
      }));
      setParticles(items);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.4, 0.8],
                x: p.x,
                y: p.y,
              }}
              transition={{
                duration: 1.6,
                delay: p.delay,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: 'easeOut',
              }}
              className="absolute rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              style={{ width: p.size, height: p.size }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          className="relative w-full max-w-md bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-300" />
          
          <div className="relative mx-auto w-20 h-20 mb-4 rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
            >
              <Trophy className="text-amber-400 w-10 h-10 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-emerald-400"
            >
              <Sparkles size={16} />
            </motion.div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono uppercase tracking-widest mb-3">
            <ShieldCheck size={13} />
            <span>HQ RESOURCE DISPATCH SECURED</span>
          </div>

          {tierUpgrade && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-3 px-3.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/50 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              <Trophy size={15} className="text-amber-400" />
              <span>TIER PROMOTION: {tierUpgrade}</span>
            </motion.div>
          )}

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
            {title}
          </h2>

          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6 leading-relaxed">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {xp > 0 ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="text-emerald-400 flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                  <Sparkles size={14} />
                  <span>Combat XP</span>
                </div>
                <div className="text-2xl font-black text-emerald-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                  +{xp.toLocaleString()}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Credited to Account</span>
              </motion.div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 font-mono">No XP Attached</span>
              </div>
            )}

            {cp > 0 ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                <div className="text-amber-400 flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                  <Zap size={14} />
                  <span>Rating CP</span>
                </div>
                <div className="text-2xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                  +{cp.toLocaleString()}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Rank Boost Applied</span>
              </motion.div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 font-mono">No CP Attached</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center justify-center gap-2 mb-6">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Updated in real-time. No page refresh needed.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <span>Acknowledge & Continue</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
