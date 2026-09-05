import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Swords,
  Terminal,
  Trophy,
  ArrowRight,
  Flame,
  Play,
  CheckCircle2,
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const yTranslate = useTransform(scrollY, [0, 500], [0, 80]);
  const opacityFade = useTransform(scrollY, [0, 400], [1, 0.4]);

  return (
    <section
      ref={heroRef}
      id="hero-section"
      className="relative min-h-[92vh] flex flex-col items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#030303]"
    >
      {/* Dynamic Background Mesh Grids & Ambient Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none" />
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Floating Colored Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-64 bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full text-center relative z-10 flex flex-col items-center">
        {/* Eyebrow Pill */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all text-neutral-300 text-xs font-mono font-medium shadow-xl backdrop-blur-md mb-8 cursor-pointer group"
          onClick={() => {
            const el = document.getElementById('game-modes');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          <span className="font-bold text-white tracking-wide">SEASON 3 CHAOS ARENA NOW LIVE</span>
          <span className="text-neutral-500">•</span>
          <span className="text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            <span>Explore Modes</span>
            <ArrowRight size={12} />
          </span>
        </motion.div>

        {/* Main Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05] sm:leading-[1.02] max-w-5xl"
        >
          DUEL LIVE. SHIP CODE.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
            DOMINATE THE LADDER.
          </span>
        </motion.h1>

        {/* Hero Supporting Text */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-neutral-400 max-w-3xl mt-6 sm:mt-7 font-normal leading-relaxed"
        >
          The premier real-time competitive programming arena. Go head-to-head in 1v1 ranked duels, multi-round battle royales, and chaos arenas powered by isolated, sub-millisecond automated judge clusters.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 mt-9 sm:mt-10 w-full sm:w-auto"
        >
          <button
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-neutral-100 text-black font-mono text-xs font-black tracking-wider uppercase transition-all shadow-[0_0_40px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2.5 active:scale-95"
          >
            <Swords size={16} className="text-black" />
            <span>START DUELING NOW (FREE)</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('duel-simulation');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 font-mono text-xs font-bold tracking-wide transition-all backdrop-blur-md flex items-center justify-center gap-2 active:scale-95"
          >
            <Play size={14} className="text-indigo-400 fill-indigo-400" />
            <span>WATCH LIVE COMBAT SIMULATOR</span>
          </button>
        </motion.div>

        {/* Live Arena Mockup Showcase (Styled with 3D Depth) */}
        <motion.div
          style={{ y: yTranslate, opacity: opacityFade }}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-5xl mt-14 sm:mt-16 relative"
        >
          {/* Subtle Outer Glow Border Ring */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-emerald-500/30 rounded-3xl blur-xl opacity-60 pointer-events-none" />

          {/* Arena HUD Window Container */}
          <div className="relative rounded-2xl sm:rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden text-left">
            {/* Window Title Bar */}
            <div className="px-4 py-3 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] font-mono text-neutral-400 ml-2 hidden sm:inline">
                  battle_arena://live_combat_room_4091 [RANKED_BLITZ]
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                  <Flame size={12} />
                  ROUND 2 / 3
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  SPECTATING (127 VIEWERS)
                </span>
              </div>
            </div>

            {/* Duelists Head-to-Head HUD Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/40 via-neutral-900/50 to-rose-950/40 border-b border-neutral-800/80 grid grid-cols-7 items-center gap-2">
              {/* Operative 1 (Python) */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-white font-mono shadow-md">
                  V
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-white truncate">@valkyrie_coder</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Coder
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-450 block">580 CP • Python 3.12</span>
                </div>
              </div>

              {/* VS Timer Center */}
              <div className="col-span-1 text-center flex flex-col items-center">
                <span className="text-xs font-black font-mono text-neutral-500">VS</span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mt-0.5">
                  01:42
                </span>
              </div>

              {/* Operative 2 (C++) */}
              <div className="col-span-3 flex items-center justify-end gap-3 text-right">
                <div className="min-w-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      Specialist
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white truncate">@matrix_zero</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-450 block">940 CP • C++ 20</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-bold text-white font-mono shadow-md">
                  M
                </div>
              </div>
            </div>

            {/* Mock Editor & Judge Output Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 font-mono text-xs">
              {/* Left Code Editor View (Python) */}
              <div className="lg:col-span-7 p-4 sm:p-5 bg-black/90 border-b lg:border-b-0 lg:border-r border-neutral-800/80">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pb-3 mb-3 border-b border-neutral-900">
                  <span className="flex items-center gap-2 text-neutral-350">
                    <Terminal size={12} className="text-indigo-400" />
                    <span>solution.py</span>
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Compiled 0 errors</span>
                  </span>
                </div>

                <div className="space-y-1 text-neutral-300 text-[11px] sm:text-xs leading-relaxed overflow-x-auto">
                  <p><span className="text-purple-400 font-bold">def</span> <span className="text-blue-400">longest_increasing_subseq</span>(arr: list[int]) -&gt; int:</p>
                  <p className="pl-4 text-neutral-400"># Fast O(N log N) patience sorting via binary search</p>
                  <p className="pl-4">tails = []</p>
                  <p className="pl-4"><span className="text-purple-400 font-bold">for</span> x <span className="text-purple-400 font-bold">in</span> arr:</p>
                  <p className="pl-8">idx = bisect.bisect_left(tails, x)</p>
                  <p className="pl-8"><span className="text-purple-400 font-bold">if</span> idx == <span className="text-yellow-400">len</span>(tails): tails.append(x)</p>
                  <p className="pl-8"><span className="text-purple-400 font-bold">else</span>: tails[idx] = x</p>
                  <p className="pl-4"><span className="text-purple-400 font-bold">return</span> <span className="text-yellow-400">len</span>(tails)</p>
                </div>
              </div>

              {/* Right Live Judge Telemetry */}
              <div className="lg:col-span-5 p-4 sm:p-5 bg-neutral-950 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-[10px] font-mono text-neutral-450 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Sandboxed Test Runner</span>
                    <span className="text-emerald-400 font-bold">ALL TESTS PASSED</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-white font-medium">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Sample 01: [10, 9, 2, 5, 3, 7]</span>
                      </span>
                      <span className="text-emerald-400 font-bold">4.2ms</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-white font-medium">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Sample 02: Large Dense Matrix (N=10^5)</span>
                      </span>
                      <span className="text-emerald-400 font-bold">14.8ms</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-emerald-500/30 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-white font-medium">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Corner 03: Negative & Duplicate Streams</span>
                      </span>
                      <span className="text-emerald-400 font-bold">2.1ms</span>
                    </div>
                  </div>
                </div>

                {/* Rating Delta Preview Banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/30 to-indigo-950/30 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Projected Win: +40 CP</span>
                      <span className="text-[10px] text-emerald-300 font-mono">Division Threshold Reached</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-black tracking-wider animate-pulse">
                    PROMOTION READY
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Global Arena Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 w-full max-w-4xl border-t border-neutral-900 pt-10">
          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono block tracking-tight">
              12,400+
            </span>
            <span className="text-xs font-mono text-neutral-450 uppercase tracking-wider mt-1 block">
              Active Operatives
            </span>
          </div>

          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block tracking-tight">
              &lt; 24ms
            </span>
            <span className="text-xs font-mono text-neutral-450 uppercase tracking-wider mt-1 block">
              Execution Latency
            </span>
          </div>

          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono block tracking-tight">
              500+
            </span>
            <span className="text-xs font-mono text-neutral-450 uppercase tracking-wider mt-1 block">
              Competitive Problems
            </span>
          </div>

          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono block tracking-tight">
              9 Tiers
            </span>
            <span className="text-xs font-mono text-neutral-450 uppercase tracking-wider mt-1 block">
              Competitive Ladder
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
