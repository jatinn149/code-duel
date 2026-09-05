import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Trophy,
  Target,
  Code2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { TierPromotionModal } from '@/components/battle/tier-promotion-modal';

interface TestCase {
  id: string;
  label: string;
  input: string;
  expected: string;
  actual: string;
  runtime: string;
}

const REAL_TEST_CASES: TestCase[] = [
  {
    id: 'case-1',
    label: 'Test Case 1',
    input: '[1, 2, 3, 4, 5]',
    expected: '2',
    actual: '2',
    runtime: '12ms',
  },
  {
    id: 'case-2',
    label: 'Test Case 2',
    input: '[10, 20, 30]',
    expected: '3',
    actual: '3',
    runtime: '14ms',
  },
  {
    id: 'case-3',
    label: 'Test Case 3',
    input: '[]',
    expected: '0',
    actual: '0',
    runtime: '8ms',
  },
];

export const TerminalSimulation: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const [showPromoModal, setShowPromoModal] = useState(false);

  const startSimulation = () => {
    setIsRunning(true);
    setActiveStep(1);
  };

  useEffect(() => {
    if (!isRunning) return;

    const t1 = setTimeout(() => setActiveStep(2), 600);
    const t2 = setTimeout(() => setActiveStep(3), 1200);
    const t3 = setTimeout(() => setActiveStep(4), 1800);
    const t4 = setTimeout(() => {
      setActiveStep(5);
      setIsRunning(false);
    }, 2400);

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
    setSelectedCaseIndex(0);
  };

  return (
    <section id="duel-simulation" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-black relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-xs font-mono font-semibold uppercase tracking-widest mb-4">
            <Terminal size={13} className="text-indigo-400" />
            <span>INTERACTIVE BATTLEGROUND SIMULATOR</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-4">
            EXPERIENCE A LIVE DUEL.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              SOLVE & LEVEL UP.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
            See what an actual match in Code Duel feels like. Review the problem statement, inspect the Python solution, and click Submit to run the test cases and unlock a rank tier promotion!
          </p>
        </div>

        {/* Live Battleground Window */}
        <div className="w-full rounded-2xl sm:rounded-3xl bg-[#070707] border border-neutral-800 shadow-2xl overflow-hidden font-sans">
          {/* Top Arena HUD Header */}
          <div className="p-3 sm:p-4 bg-neutral-900/95 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 font-mono">
            {/* Left: Mode Badge & Problem Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase">
                QUICKODE (1v1)
              </span>
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[170px] sm:max-w-none">
                Chaos Counter: Even Transactions
              </span>
            </div>

            {/* Center: Live Players Matchup & Countdown */}
            <div className="flex items-center gap-3 bg-black/60 px-3.5 py-1.5 rounded-xl border border-neutral-800 text-xs">
              {/* Player 1 (You) */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px] relative">
                  <span>A</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 ring-1 ring-black" />
                </div>
                <div className="text-left hidden xs:block">
                  <span className="text-white font-bold block leading-none">You (Alex)</span>
                  <span className="text-[9px] text-neutral-400 font-mono">470 CP</span>
                </div>
              </div>

              {/* VS & Live Timer */}
              <div className="flex items-center gap-1.5 px-2 border-x border-neutral-800">
                <span className="text-[10px] text-indigo-400 font-black">VS</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 ml-1">
                  <Clock size={11} />
                  <span>04:18</span>
                </span>
              </div>

              {/* Player 2 (Opponent) */}
              <div className="flex items-center gap-2">
                <div className="text-right hidden xs:block">
                  <span className="text-neutral-300 font-bold block leading-none">KaiDev</span>
                  <span className="text-[9px] text-neutral-400 font-mono">485 CP</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 font-bold text-[10px] relative">
                  <span>K</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 ring-1 ring-black" />
                </div>
              </div>
            </div>

            {/* Right: Simulation Action Trigger */}
            <div className="flex items-center gap-2">
              {activeStep === 0 ? (
                <button
                  onClick={startSimulation}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                >
                  <Play size={13} fill="currentColor" />
                  <span>SUBMIT CODE</span>
                </button>
              ) : activeStep < 5 ? (
                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>EVALUATING TEST CASES...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPromoModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono uppercase flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all active:scale-95 animate-pulse"
                  >
                    <Trophy size={13} />
                    <span>LEVEL UP ANIMATION</span>
                  </button>
                  <button
                    onClick={resetSimulation}
                    className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Reset Simulator"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Battle Content: Split View (Task Details on Left, Monaco Editor + Tests on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            {/* Left Column: Task Specification (like in QuickodeBattle) */}
            <div className="lg:col-span-4 p-5 sm:p-6 bg-[#090909] border-b lg:border-b-0 lg:border-r border-neutral-850 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
                  <Target size={13} className="text-indigo-400" />
                  <span>TASK SPECIFICATION</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Chaos Counter: Even Transactions
                    </h3>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      EASY
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                    Given a list of transaction amounts, count how many amounts are even numbers.
                  </p>
                </div>

                {/* Example Cards */}
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="p-3 rounded-xl bg-black/80 border border-neutral-800/80">
                    <span className="text-neutral-500 text-[10px] block font-bold">EXAMPLE 1</span>
                    <p className="text-neutral-300 mt-1">
                      <span className="text-neutral-500">Input:</span> transactions = [1, 2, 3, 4, 5]
                    </p>
                    <p className="text-emerald-400">
                      <span className="text-neutral-500">Output:</span> 2
                    </p>
                    <span className="text-[10px] text-neutral-400 font-sans block mt-0.5">
                      Explanation: 2 and 4 are even.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/80 border border-neutral-800/80">
                    <span className="text-neutral-500 text-[10px] block font-bold">EXAMPLE 2</span>
                    <p className="text-neutral-300 mt-1">
                      <span className="text-neutral-500">Input:</span> transactions = [10, 20, 30]
                    </p>
                    <p className="text-emerald-400">
                      <span className="text-neutral-500">Output:</span> 3
                    </p>
                  </div>
                </div>

                {/* Constraints */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-[10px] font-mono space-y-1">
                  <span className="text-neutral-500 uppercase font-bold block">CONSTRAINTS</span>
                  <p className="text-neutral-400">• Time Limit: 2000ms</p>
                  <p className="text-neutral-400">• Memory Limit: 128MB</p>
                  <p className="text-neutral-400">• 0 &lt;= len(transactions) &lt;= 10,000</p>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-850 mt-4 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Real Problem Bank ID #2</span>
                <span className="text-emerald-400 font-bold">Live in Quickode</span>
              </div>
            </div>

            {/* Right Column: Code Editor & Test Console */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-black">
              {/* Code Editor Header */}
              <div>
                <div className="px-4 py-2.5 bg-neutral-900/60 border-b border-neutral-850 flex items-center justify-between font-mono text-xs text-neutral-400">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Code2 size={14} className="text-indigo-400" />
                    <span>solution.py</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Python 3.11
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px]">4 lines • UTF-8</span>
                </div>

                {/* Monaco Editor Mock Body */}
                <div className="p-5 font-mono text-xs sm:text-sm leading-relaxed text-neutral-200 overflow-x-auto">
                  <div className="flex gap-4">
                    {/* Line numbers */}
                    <div className="select-none text-neutral-600 text-right pr-2 space-y-1 font-mono text-xs">
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                      <div>4</div>
                    </div>

                    {/* Code lines */}
                    <div className="space-y-1">
                      <div>
                        <span className="text-purple-400 font-bold">def</span>{' '}
                        <span className="text-blue-400 font-semibold">countEven</span>(transactions: list) -&gt; int:
                      </div>
                      <div className="pl-6 text-neutral-500 italic">
                        # Count how many transaction amounts are even
                      </div>
                      <div className="pl-6">
                        <span className="text-purple-400 font-bold">return</span>{' '}
                        <span className="text-yellow-400">sum</span>(1 <span className="text-purple-400 font-bold">for</span> x <span className="text-purple-400 font-bold">in</span> transactions <span className="text-purple-400 font-bold">if</span> x % 2 == 0)
                      </div>
                      <div>&nbsp;</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Test Execution Drawer (just like real battle console) */}
              <div className="border-t border-neutral-850 bg-neutral-950/90 font-mono text-xs">
                {/* Test Console Header & Tabs */}
                <div className="px-4 py-2 bg-neutral-900/40 border-b border-neutral-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {REAL_TEST_CASES.map((tc, idx) => (
                      <button
                        key={tc.id}
                        onClick={() => setSelectedCaseIndex(idx)}
                        className={clsx(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                          selectedCaseIndex === idx
                            ? "bg-neutral-800 text-white border border-neutral-700"
                            : "text-neutral-400 hover:text-neutral-200"
                        )}
                      >
                        {activeStep >= idx + 2 ? (
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                        )}
                        <span>Case {idx + 1}</span>
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-neutral-400">
                    {activeStep >= 4 ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>3/3 Tests Passed (34ms)</span>
                      </span>
                    ) : activeStep > 0 ? (
                      <span className="text-amber-400">Evaluating...</span>
                    ) : (
                      <span>Ready for submission</span>
                    )}
                  </span>
                </div>

                {/* Selected Test Case Inspection */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Input</span>
                    <span className="text-white mt-1 block font-mono">{REAL_TEST_CASES[selectedCaseIndex].input}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Expected Output</span>
                    <span className="text-emerald-400 mt-1 block font-mono">{REAL_TEST_CASES[selectedCaseIndex].expected}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Actual Output</span>
                    <span className={clsx("mt-1 block font-mono font-bold", activeStep >= 2 ? "text-emerald-400" : "text-neutral-600")}>
                      {activeStep >= 2 ? REAL_TEST_CASES[selectedCaseIndex].actual : '—'}
                    </span>
                  </div>
                </div>

                {/* Match Result Banner when complete */}
                {activeStep === 5 && (
                  <div className="mx-4 mb-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-amber-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Trophy size={18} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          MATCH VICTORY! +40 Coder Points (CP) Earned
                        </span>
                        <span className="text-[11px] text-neutral-300">
                          Rating updated: 470 CP (Initiate) ➔ <span className="text-emerald-400 font-bold">510 CP (Coder Tier Achieved!)</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowPromoModal(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
                    >
                      <Sparkles size={13} />
                      <span>OPEN LEVEL UP ANIMATION</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Tier Promotion Modal */}
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
        username="Alex"
      />
    </section>
  );
};
