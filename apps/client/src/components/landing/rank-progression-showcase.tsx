import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Flame, Crown, ChevronRight } from 'lucide-react';
import { CP_RANKS } from '@code-duel/shared';
import { clsx } from 'clsx';

const TIERS_META: Record<string, { color: string; badgeBg: string; border: string; glow: string; perk: string }> = {
  Initiate: {
    color: 'text-zinc-400',
    badgeBg: 'bg-zinc-800',
    border: 'border-zinc-700',
    glow: 'shadow-[0_0_15px_rgba(161,161,170,0.1)]',
    perk: 'Starter calibration duels and basic sandboxed challenges.',
  },
  Coder: {
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    perk: 'Unlocks Ranked Queue and Multi-Round Best-of-3 format.',
  },
  Specialist: {
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20',
    border: 'border-indigo-500/40',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]',
    perk: 'Access to custom private lobby host controls and wager stakes.',
  },
  Expert: {
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_25px_rgba(6,182,212,0.2)]',
    perk: 'Unlocks Chaos Arena unstable mutator matches and timed speed runs.',
  },
  Elite: {
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)]',
    perk: 'Leaderboard badge highlight and guaranteed daily streak grace day.',
  },
  Master: {
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.25)]',
    perk: 'Regional tournament entry invitations and live match spectate access.',
  },
  Grandmaster: {
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.3)]',
    perk: 'Global top 100 standing and live community broadcasts.',
  },
  Codebreaker: {
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    glow: 'shadow-[0_0_40px_rgba(249,115,22,0.35)]',
    perk: 'Verified Master Operative status with custom avatar holographic ring.',
  },
  'Apex Coder': {
    color: 'text-amber-300',
    badgeBg: 'bg-gradient-to-r from-amber-500/25 to-pink-500/25',
    border: 'border-amber-400/60',
    glow: 'shadow-[0_0_50px_rgba(251,191,36,0.4)]',
    perk: 'The pinnacle of competitive programming. Hall of Fame immortalization.',
  },
};

export const RankProgressionShowcase: React.FC = () => {
  return (
    <section id="tier-ladder" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#030303] relative border-t border-neutral-900">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Trophy size={13} className="text-amber-400" />
            <span>COMPETITIVE LADDER ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            9 TIERS OF MASTERY.{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
              PROVE YOUR METTLE.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Starting from Initiate, every correct solution and speed bonus awards Coder Points (CP). Break through division thresholds to trigger full-screen promotions and unlock competitive arena perks.
          </p>
        </div>

        {/* 9-Tier Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CP_RANKS.map((item, idx) => {
            const meta = TIERS_META[item.rank] || TIERS_META['Initiate'];

            return (
              <motion.div
                key={item.rank}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={clsx(
                  "p-6 rounded-2xl bg-neutral-950 border transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1",
                  meta.border,
                  meta.glow
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-widest text-neutral-500 font-bold">
                      DIVISION 0{idx + 1}
                    </span>
                    <span className={clsx("text-xs font-mono font-black px-2.5 py-0.5 rounded-full border", meta.badgeBg, meta.border, meta.color)}>
                      {item.min} {item.max === Infinity ? '+' : `- ${item.max}`} CP
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className={clsx("w-10 h-10 rounded-xl border flex items-center justify-center font-bold", meta.badgeBg, meta.border, meta.color)}>
                      {idx === 8 ? <Crown size={20} /> : idx >= 6 ? <Flame size={20} /> : <Shield size={20} />}
                    </div>
                    <div>
                      <h4 className={clsx("text-lg font-black tracking-tight uppercase", meta.color)}>
                        {item.rank}
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-450 block">
                        Base Entry: {item.min} CP
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 font-normal leading-relaxed mt-2">
                    {meta.perk}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500 group-hover:text-neutral-300 transition-colors">
                  <span>Seasonal Threshold</span>
                  <ChevronRight size={14} className={meta.color} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
