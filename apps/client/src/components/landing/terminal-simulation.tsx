import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Trophy,
} from 'lucide-react';
import { clsx } from 'clsx';
import { TierPromotionModal } from '@/components/battle/tier-promotion-modal';

export const TerminalSimulation: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showPromoModal, setShowPromoModal] = useState(false);

  const startSimulation = () => {
    setIsRunning(true);
    setActiveStep(1);
  };

  useEffect(() => {
    if (!isRunning) return;

    const t1 = setTimeout(() => setActiveStep(2), 700);
    const t2 = setTimeout(() => setActiveStep(3), 1500);
    const t3 = setTimeout(() => setActiveStep(4), 2200);
    const t4 = setTimeout(() => {
      setActiveStep(5);
      setIsRunning(false);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isRunning]);

  const resetSimulation = () => {
    setIsRunning(false);
    setActiveStep(0);
  };

  return (
    <section id="duel-simulation" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-black relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Terminal size={13} className="text-indigo-400" />
            <span>INTERACTIVE ARENA ENGINE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            EXPERIENCE A LIVE DUEL.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              MILLISECOND EXECUTION.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            Test our real-time grading telemetry right in your browser. Watch an operative submit an algorithmic solution, stream test evaluations, and achieve a live tier promotion from Initiate to Coder.
          </p>
        </div>

        {/* Interactive Simulation Frame */}
        <div className="w-full rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden font-mono">
          {/* Header Bar with Simulation Controls */}
          <div className="p-4 sm:p-5 bg-neutral-900/80 border-b border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-bold text-white tracking-tight font-mono">
                SIMULATED MATCH #8042 [PYTHON 3.12 vs C++ 20]
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {activeStep === 0 ? (
                <button
                  onClick={startSimulation}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
                >
                  <Play size={14} fill="currentColor" />
                  <span>RUN LIVE EVALUATION</span>
                </button>
              ) : activeStep < 5 ? (
                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>EXECUTING TEST RUNNER...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowPromoModal(true)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95 animate-pulse"
                  >
                    <Trophy size={13} />
                    <span>VIEW PROMOTION MODAL</span>
                  </button>
                  <button
                    onClick={resetSimulation}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Reset Simulation"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Body: Split View (Code & Execution Progress) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 text-xs">
            {/* Left: Live Code View */}
            <div className="lg:col-span-7 p-5 sm:p-6 bg-black/95 border-b lg:border-b-0 lg:border-r border-neutral-850">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-900 text-neutral-400 text-[11px]">
                <span className="text-white font-bold flex items-center gap-2">
                  <Terminal size={14} className="text-indigo-400" />
                  <span>two_sum_optimized.py</span>
                </span>
                <span className="text-neutral-500">12 lines • 248 bytes</span>
              </div>

              <div className="space-y-1.5 text-[11px] sm:text-xs leading-relaxed text-neutral-300 overflow-x-auto">
                <p className="text-neutral-500"># Operative: @cyber_gladiator (Initiate: 470 CP)</p>
                <p><span className="text-purple-400 font-bold">def</span> <span className="text-blue-400">solve</span>(nums: list[int], target: int) -&gt; list[int]:</p>
                <p className="pl-4 text-neutral-500"># Single-pass hash table map with complement checking</p>
                <p className="pl-4">lookup = {}</p>
                <p className="pl-4"><span className="text-purple-400 font-bold">for</span> i, val <span className="text-purple-400 font-bold">in</span> <span className="text-yellow-400">enumerate</span>(nums):</p>
                <p className="pl-8">comp = target - val</p>
                <p className="pl-8"><span className="text-purple-400 font-bold">if</span> comp <span className="text-purple-400 font-bold">in</span> lookup:</p>
                <p className="pl-12"><span className="text-purple-400 font-bold">return</span> [lookup[comp], i]</p>
                <p className="pl-8">lookup[val] = i</p>
                <p className="pl-4"><span className="text-purple-400 font-bold">return</span> []</p>
              </div>
            </div>

            {/* Right: Live Sandboxed Telemetry Output */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-neutral-950 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-[10px] text-neutral-450 uppercase tracking-widest block font-bold mb-3">
                  Grading Container Status
                </span>

                <div className="space-y-2.5">
                  {/* Step 1: Compilation */}
                  <div className={clsx(
                    "p-3 rounded-xl border flex items-center justify-between transition-all",
                    activeStep >= 1
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-neutral-900/40 border-neutral-850 text-neutral-500"
                  )}>
                    <div className="flex items-center gap-2">
                      {activeStep >= 1 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-700" />
                      )}
                      <span>Bytecode Compilation</span>
                    </div>
                    <span className="font-bold">{activeStep >= 1 ? '1.8ms' : '—'}</span>
                  </div>

                  {/* Step 2: Public Testcases */}
                  <div className={clsx(
                    "p-3 rounded-xl border flex items-center justify-between transition-all",
                    activeStep >= 2
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-neutral-900/40 border-neutral-850 text-neutral-500"
                  )}>
                    <div className="flex items-center gap-2">
                      {activeStep >= 2 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-700" />
                      )}
                      <span>Public Testcases (5/5 Passed)</span>
                    </div>
                    <span className="font-bold">{activeStep >= 2 ? '4.2ms' : '—'}</span>
                  </div>

                  {/* Step 3: Hidden Stress Tests */}
                  <div className={clsx(
                    "p-3 rounded-xl border flex items-center justify-between transition-all",
                    activeStep >= 3
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-neutral-900/40 border-neutral-850 text-neutral-500"
                  )}>
                    <div className="flex items-center gap-2">
                      {activeStep >= 3 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-700" />
                      )}
                      <span>Hidden Stress & Boundary (40/40)</span>
                    </div>
                    <span className="font-bold">{activeStep >= 3 ? '16.4ms' : '—'}</span>
                  </div>

                  {/* Step 4: Memory Capping */}
                  <div className={clsx(
                    "p-3 rounded-xl border flex items-center justify-between transition-all",
                    activeStep >= 4
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                      : "bg-neutral-900/40 border-neutral-850 text-neutral-500"
                  )}>
                    <div className="flex items-center gap-2">
                      {activeStep >= 4 ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-neutral-700" />
                      )}
                      <span>Memory Profile: 14.2 MB / 256 MB</span>
                    </div>
                    <span className="font-bold">{activeStep >= 4 ? 'SAFE' : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Result Banner */}
              <div className={clsx(
                "p-4 rounded-xl border transition-all",
                activeStep === 5
                  ? "bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-indigo-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/30"
                  : "bg-neutral-900/40 border-neutral-850 opacity-60"
              )}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-400" />
                    <span>DUEL VICTORY: +40 CP</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    100% CORRECT
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  470 CP (Initiate) ➔ <span className="text-emerald-400 font-bold">510 CP (Coder Tier Achieved!)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Promotion Modal */}
      <TierPromotionModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        previousTier="Initiate"
        newTier="Coder"
        previousCp={470}
        newCp={510}
        cpChange={40}
        previousLevel={1}
        newLevel={2}
        isTierPromotion={true}
        isLevelUp={true}
        username="cyber_gladiator"
      />
    </section>
  );
};
