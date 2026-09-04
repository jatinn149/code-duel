import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { apiClient } from '@/api/api-client';
import { useAuthStore } from '@/store/auth-store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Flame, Trophy, Clock, Play, CheckCircle2, AlertCircle, Loader2,
  Terminal, Sparkles, ArrowLeft, Share2, Check, Bot, Activity
} from 'lucide-react';
import { clsx } from 'clsx';

interface DailyProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  initialCode: string;
  sampleTestCases: Array<{ input: any; expectedOutput: any }>;
}

interface SolvedResult {
  timeElapsedSec: number;
  completedAt: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  timeElapsedSec: number;
  completedAt: string;
}

const QUIRKY_AI_QUOTES = [
  "Decrypt today's cipher before midnight UTC. Don't let your CPU down.",
  "1 challenge. Global bragging rights. Let's see your synapses fire.",
  "Compiling at the speed of light... brain cells detected.",
  "Warning: suboptimal algorithms may trigger sarcastic AI commentary.",
  "Operative on deck. Solve clean, solve fast, claim the leaderboard.",
];

export const DailyChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [userResult, setUserResult] = useState<SolvedResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streak, setStreak] = useState<number>(user?.streak || 0);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(0);
  const [code, setCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'problem' | 'leaderboard'>('problem');
  const [mobileView, setMobileView] = useState<'intel' | 'code' | 'output'>('code');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<{
    verdict?: string;
    results?: Array<{ passed: boolean; input: any; expected: any; actual: any; error?: string }>;
    error?: string;
  } | null>(null);

  // Victory celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [solveStats, setSolveStats] = useState<{ timeSec: number; xpEarned: number; cpEarned: number } | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Stopwatch timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Random quirky quote
  const quirkyQuote = useRef(QUIRKY_AI_QUOTES[Math.floor(Math.random() * QUIRKY_AI_QUOTES.length)]).current;

  // Load Daily Challenge
  useEffect(() => {
    apiClient.get('/auth/daily-challenge')
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setProblem(d.problem);
          setCode(d.problem.initialCode || '# Solve today\'s challenge\n');
          setAlreadySolved(d.alreadySolved);
          setUserResult(d.userResult);
          setLeaderboard(d.leaderboard || []);
          setStreak(d.streak || 0);
          setTimeRemainingSec(d.timeRemainingSec || 0);
          if (d.alreadySolved && d.userResult) {
            setElapsedSeconds(d.userResult.timeElapsedSec || 0);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load daily challenge:', err);
      });
  }, []);

  // Timer tick
  useEffect(() => {
    if (alreadySolved) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [alreadySolved]);

  // Countdown timer to next midnight
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setTimeRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  const formatStopwatch = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatCountdown = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const handleRunSampleTests = async () => {
    if (!problem || isRunning || isSubmitting) return;
    setIsRunning(true);
    setTerminalOutput(null);

    try {
      const res = await apiClient.post('/auth/daily-challenge/run', {
        code,
        language: 'python',
      });
      if (res.data?.success && res.data?.data) {
        setTerminalOutput({
          verdict: res.data.data.verdict,
          results: res.data.data.results,
        });
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setMobileView('output');
        }
      }
    } catch (err: any) {
      setTerminalOutput({
        error: err.response?.data?.message || 'Execution failed. Check your syntax.',
      });
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileView('output');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitDaily = async () => {
    if (!problem || isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setTerminalOutput(null);

    try {
      const res = await apiClient.post('/auth/daily-challenge/submit', {
        code,
        language: 'python',
        timeElapsedSec: elapsedSeconds,
      });

      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setTerminalOutput({
          verdict: d.verdict,
          results: d.results,
        });
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setMobileView('output');
        }

        if (d.passed) {
          if (timerRef.current) clearInterval(timerRef.current);
          setAlreadySolved(true);
          const currentStreak = d.newStreak ?? d.streak ?? (streak + 1);
          setStreak(currentStreak);
          setSolveStats({
            timeSec: d.timeElapsedSec || elapsedSeconds,
            xpEarned: d.xpEarned || 500,
            cpEarned: d.cpEarned || 50,
          });
          setShowCelebration(true);

          if (user) {
            setUser({
              ...user,
              rating: (user.rating || 0) + (d.cpEarned || 50),
              xp: (user.xp || 0) + (d.xpEarned || 500),
              streak: currentStreak,
            });
          }
        }
      }
    } catch (err: any) {
      setTerminalOutput({
        error: err.response?.data?.message || 'Submission error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    const timeFormatted = formatStopwatch(solveStats?.timeSec || elapsedSeconds);
    const text = `⚔️ Code Duel Daily Cipher Solved!\n⏱️ Time: ${timeFormatted}\n🔥 Active Streak: ${streak} Days\nCan you beat my time? https://codeduel.io`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Quirky Top HUD Bar */}
      <header className="h-16 px-3 sm:px-6 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 sm:p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-mono"
            title="Return to Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 hidden xs:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
              <Zap size={16} className="fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] sm:text-xs font-black font-mono tracking-widest uppercase text-white">
                  DAILY CIPHER
                </span>
                <span className="text-[8.5px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                  {problem?.difficulty || 'Medium'}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 block -mt-0.5">
                Protocol 0x{new Date().toISOString().split('T')[0].replace(/-/g, '')}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Stopwatch */}
        <div className="flex items-center gap-2 sm:gap-3 bg-zinc-950 border border-zinc-800/80 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl shadow-inner font-mono">
          <Clock size={15} className="text-amber-400 animate-pulse shrink-0" />
          <div className="text-center">
            <span className="text-xs sm:text-sm font-black tracking-wider text-white">
              {formatStopwatch(elapsedSeconds)}
            </span>
            <span className="text-[8px] sm:text-[9px] text-zinc-500 block uppercase">
              {alreadySolved ? 'Solve Time' : 'Elapsed'}
            </span>
          </div>
        </div>

        {/* Right: Streak & Reset Countdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col items-end text-right font-mono">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Next Cipher In</span>
            <span className="text-xs font-bold text-zinc-300">{formatCountdown(timeRemainingSec)}</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 bg-orange-500/10 border border-orange-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-orange-400 font-mono text-xs font-bold shrink-0">
            <Flame size={15} className="fill-current animate-bounce shrink-0" />
            <span>{streak}d</span>
          </div>
        </div>
      </header>

      {/* Quirky Robot AI Banner */}
      <div className="px-3 sm:px-6 py-2 bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-purple-950/40 border-b border-zinc-850 flex items-center gap-2 sm:gap-3 text-xs font-mono text-indigo-300 shrink-0">
        <Bot size={15} className="text-indigo-400 shrink-0 animate-pulse" />
        <span className="truncate text-[11px] sm:text-xs">
          <strong className="text-white font-bold">BYTEMASTER-9000:</strong> "{quirkyQuote}"
        </span>
        <span className="ml-auto hidden lg:inline-block text-[10px] text-zinc-500 shrink-0">
          Reward: +500 XP • +50 CP
        </span>
      </div>

      {/* Mobile Sub-Navigation View Switcher (< md) */}
      <div className="flex md:hidden border-b border-zinc-800/80 bg-zinc-900/90 shrink-0 px-2 py-1.5 items-center justify-around text-xs font-mono safe-area-top">
        <button
          onClick={() => setMobileView('intel')}
          className={clsx(
            "px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs",
            mobileView === 'intel'
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Zap size={13} />
          <span>Cipher Intel</span>
        </button>
        <button
          onClick={() => setMobileView('code')}
          className={clsx(
            "px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs",
            mobileView === 'code'
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Terminal size={13} />
          <span>Code Editor</span>
        </button>
        <button
          onClick={() => setMobileView('output')}
          className={clsx(
            "px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all relative text-xs",
            mobileView === 'output'
              ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Activity size={13} />
          <span>Output</span>
          {terminalOutput && (
            <span className={clsx(
              "w-2 h-2 rounded-full ml-0.5",
              terminalOutput.verdict === 'ACCEPTED' ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            )} />
          )}
        </button>
      </div>

      {/* Main Dual Pane Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Problem Description & Leaderboard Tabs */}
        <div className={clsx(
          "w-full md:w-[420px] lg:w-[480px] border-r border-zinc-850 flex flex-col bg-zinc-950 shrink-0 overflow-hidden",
          mobileView !== 'intel' && "hidden md:flex"
        )}>
          {/* Tabs */}
          <div className="flex border-b border-zinc-850 bg-zinc-900/30 shrink-0">
            <button
              onClick={() => setActiveTab('problem')}
              className={clsx(
                "flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors",
                activeTab === 'problem'
                  ? "border-amber-400 text-amber-400 bg-zinc-900/40"
                  : "border-transparent text-zinc-400 hover:text-white"
              )}
            >
              Cipher Intel
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={clsx(
                "flex-1 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center justify-center gap-1.5",
                activeTab === 'leaderboard'
                  ? "border-amber-400 text-amber-400 bg-zinc-900/40"
                  : "border-transparent text-zinc-400 hover:text-white"
              )}
            >
              <Trophy size={14} />
              Today's Solvers ({leaderboard.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeTab === 'problem' ? (
              problem ? (
                <>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">{problem.title}</h2>
                    <p className="text-xs font-mono text-zinc-400 mt-2 whitespace-pre-line leading-relaxed">
                      {problem.description}
                    </p>
                  </div>

                  {/* Sample Test Cases */}
                  {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 tracking-wider block">
                        Sample Transmissions
                      </span>
                      {problem.sampleTestCases.map((tc, idx) => (
                        <div key={idx} className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1.5 font-mono text-xs">
                          <div className="text-zinc-400">
                            <span className="text-zinc-500 font-bold">Input:</span>{' '}
                            <code className="text-indigo-300">{JSON.stringify(tc.input)}</code>
                          </div>
                          <div className="text-zinc-400">
                            <span className="text-zinc-500 font-bold">Expected:</span>{' '}
                            <code className="text-emerald-400">{JSON.stringify(tc.expectedOutput)}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Daily Rewards Card */}
                  <div className="p-4 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-orange-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
                      <Sparkles size={16} />
                      <span>CLEARANCE REWARDS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div className="p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Experience</span>
                        <span className="text-sm font-black text-white">+500 XP</span>
                      </div>
                      <div className="p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 block uppercase">Rank Rating</span>
                        <span className="text-sm font-black text-amber-400">+50 CP</span>
                      </div>
                    </div>
                  </div>

                  {alreadySolved && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-center space-y-1.5">
                      <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                        Cipher Successfully Solved Today!
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        You solved today's cipher in {formatStopwatch(userResult?.timeElapsedSec || elapsedSeconds)}.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500 font-mono text-xs">
                  <Loader2 size={24} className="animate-spin text-amber-400 mb-2" />
                  Decrypting today's mission intel...
                </div>
              )
            ) : (
              /* Daily Solvers Leaderboard */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Operative</span>
                  <span>Solve Time</span>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 font-mono text-xs">
                    No operatives have cracked today's cipher yet.<br />
                    <strong className="text-amber-400">Be the first to claim #1!</strong>
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        "p-3 rounded-xl border flex items-center justify-between font-mono text-xs transition-all",
                        idx === 0
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold shadow-md shadow-amber-500/5"
                          : idx === 1
                          ? "bg-zinc-800/40 border-zinc-700 text-zinc-200"
                          : idx === 2
                          ? "bg-orange-950/20 border-orange-800/40 text-orange-300"
                          : "bg-zinc-900/40 border-zinc-800 text-zinc-400"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center font-bold text-[10px]">
                          {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span className="truncate max-w-[150px]">{entry.username}</span>
                      </div>
                      <span className="font-mono text-white font-semibold">
                        {formatStopwatch(entry.timeElapsedSec)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Output Terminal */}
        <div className={clsx(
          "flex-1 flex flex-col bg-zinc-950 overflow-hidden",
          mobileView === 'intel' && "hidden md:flex"
        )}>
          {/* Editor Header Toolbar */}
          <div className="h-12 px-3 sm:px-4 bg-zinc-900/70 border-b border-zinc-850 flex items-center justify-between shrink-0 font-mono text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Terminal size={15} className="text-indigo-400 shrink-0" />
              <span className="font-mono">solution.py</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunSampleTests}
                disabled={isRunning || isSubmitting}
                className="px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40 active:scale-95 shadow-sm"
              >
                {isRunning ? <Loader2 size={13} className="animate-spin text-indigo-400" /> : <Play size={13} />}
                <span>Run</span>
              </button>

              <button
                onClick={handleSubmitDaily}
                disabled={isRunning || isSubmitting}
                className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-40 active:scale-95"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={14} className="fill-current" />
                )}
                <span>Submit</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className={clsx(
            "flex-1 min-h-0",
            mobileView === 'output' && "hidden md:block"
          )}>
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                padding: { top: 12 },
                automaticLayout: true,
              }}
            />
          </div>

          {/* Terminal / Test Case Output Drawer */}
          <div className={clsx(
            "border-t border-zinc-850 bg-zinc-950 p-4 font-mono text-xs overflow-y-auto shrink-0 space-y-2",
            mobileView === 'output' ? "flex-1 block" : terminalOutput ? "h-44 hidden md:block" : "hidden"
          )}>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
              <span className="text-zinc-400 font-bold uppercase flex items-center gap-2">
                <Terminal size={14} /> Output Diagnostics
              </span>
              {terminalOutput && terminalOutput.verdict && (
                <span className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                  terminalOutput.verdict === 'ACCEPTED'
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  {terminalOutput.verdict}
                </span>
              )}
            </div>

            {!terminalOutput ? (
              <div className="text-zinc-500 py-6 text-center text-xs">
                Run or Submit code to see test case diagnostic feedback.
              </div>
            ) : terminalOutput.error ? (
              <div className="text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-500/20">
                {terminalOutput.error}
              </div>
            ) : (
              <div className="space-y-1.5">
                {terminalOutput.results?.map((res, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "p-2 rounded flex items-center justify-between border",
                      res.passed
                        ? "bg-emerald-950/10 border-emerald-500/20 text-emerald-300"
                        : "bg-rose-950/10 border-rose-500/20 text-rose-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {res.passed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>Test #{idx + 1}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase">
                      {res.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quirky Victory Celebration Modal */}
      <AnimatePresence>
        {showCelebration && solveStats && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md bg-zinc-950 border border-amber-500/30 rounded-2xl p-6 text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.2)] font-mono relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
                <Trophy size={32} className="animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  CIPHER CRACKED! ⚡
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  You decrypted today's protocol in <strong className="text-amber-400">{formatStopwatch(solveStats.timeSec)}</strong>!
                </p>
              </div>

              {/* Rewards Box */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/70 rounded-xl border border-zinc-800 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">XP Gained</span>
                  <span className="text-sm font-bold text-emerald-400">+{solveStats.xpEarned}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">CP Awarded</span>
                  <span className="text-sm font-bold text-indigo-400">+{solveStats.cpEarned}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Daily Streak</span>
                  <span className="text-sm font-bold text-orange-400">{streak} Days 🔥</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedShare ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
                  <span>{copiedShare ? 'Copied!' : 'Share Result'}</span>
                </button>

                <button
                  onClick={() => setShowCelebration(false)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  Return to Console
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

