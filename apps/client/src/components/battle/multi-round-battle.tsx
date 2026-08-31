import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Room, Player, User, MatchState } from '@code-duel/types';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CheckCircle2,
  Terminal,
  Loader2,
  AlertCircle,
  Wifi,
  Trophy,
  LogOut,
  Zap,
  Sword,
  Code2,
  Target,
  Activity,
  Award,
} from 'lucide-react';
import { useRoomStore } from '@/store/room-store';

export interface BattleComponentProps {
  currentRoom: Room;
  currentPlayer: Player | undefined;
  opponent: Player | undefined;
  user: Omit<User, 'passwordHash'> | null;
  code: string;
  setCode: (code: string) => void;
  isSubmitting: boolean;
  latency: number;
  countdown: number | null;
  sortedPlayers: Player[];
  allReady: boolean;
  isHost: boolean;
  cheatWarning: string | null;
  handleRunCode: () => Promise<void>;
  handleSubmitCode: () => Promise<void>;
  handleLeaveRoom: () => void;
  handleToggleReady: () => void;
  handleStartDuel: () => void;
}

// Glowing vertical signal bars visualizer for opponent telemetry (cool blue theme)
export const TelemetrySignalVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const width = canvas.width;
    const height = canvas.height;
    const numBars = 12;
    const barWidth = (width - (numBars - 1) * 3.5) / numBars;
    const heights = Array(numBars).fill(height / 2);

    const draw = () => {
      ctx.fillStyle = 'rgb(10, 10, 10)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle tech matrix grids in the background (electric blue)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw glowing signal bars boping up and down
      for (let i = 0; i < numBars; i++) {
        const target = Math.random() * (height - 6) + 3;
        heights[i] += (target - heights[i]) * 0.2;

        const x = i * (barWidth + 3.5);
        const y = height - heights[i];

        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.95)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
        gradient.addColorStop(1, 'rgba(30, 58, 138, 0.15)');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
        ctx.fillRect(x, y, barWidth, heights[i]);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={48}
      className="w-full h-11 bg-[#0a0a0a] border border-indigo-950/20 rounded-lg mt-2.5"
    />
  );
};

export const MultiRoundBattle: React.FC<BattleComponentProps> = ({
  currentRoom,
  currentPlayer,
  opponent,
  user,
  code,
  setCode,
  isSubmitting,
  latency,
  countdown,
  sortedPlayers,
  allReady,
  isHost,
  cheatWarning,
  handleRunCode,
  handleSubmitCode,
  handleLeaveRoom,
  handleToggleReady,
  handleStartDuel,
}) => {
  const { lastJudgeResult, dryRunResult, isRunningCode } = useRoomStore();
  const [activeTab, setActiveTab] = useState<'output' | 'testcase'>('output');

  const currentRoundIndex = currentRoom.currentRound || 1;
  const currentRoundObj = currentRoom.rounds?.find(r => r.roundIndex === currentRoundIndex) || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds[currentRoom.rounds.length - 1] : undefined);
  const problem = currentRoundObj?.problem || (currentRoom as any).problem;

  const problemTitle = problem?.title || 'Loading Problem...';
  const problemDescription = problem?.description || '';

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'SIGNATURE_FUNCTION': return 'SIGNATURE FUNCTION';
      case 'COMPLETE_CODE': return 'COMPLETE THE CODE';
      case 'CLIENT_REQUEST': return 'CLIENT REQUEST';
      case 'PREDICT_OUTPUT': return 'PREDICT THE OUTPUT';
      default: return category.replace(/_/g, ' ');
    }
  };

  const getCumulativeScore = (playerId: string) => {
    return currentRoom.roundResults?.reduce((sum, res) => sum + (res.scores[playerId] || 0), 0) || 0;
  };

  const getRoundsWon = (playerId: string) => {
    return currentRoom.roundResults?.filter(res => res.winner === playerId).length || 0;
  };

  const isPlaying = currentRoom.state === MatchState.PLAYING;
  const isJudging = currentRoom.state === MatchState.JUDGING || isSubmitting;

  // Real-time ticking countdown timer state
  const [timeLeftStr, setTimeLeftStr] = useState('05:00');
  const [timeLeftSecs, setTimeLeftSecs] = useState<number>(300);

  useEffect(() => {
    if (currentRoom.state !== MatchState.PLAYING && currentRoom.state !== MatchState.SUBMITTED_WAITING) {
      setTimeLeftStr('00:00');
      setTimeLeftSecs(0);
      return;
    }

    const duration = currentRoundObj?.duration || currentRoom.roundTimer?.duration || 300;
    const startedTime = currentRoundObj?.roundStartedAt || currentRoundObj?.startedAt || currentRoom.matchStartAt || currentRoom.createdAt;

    const updateTimer = () => {
      const now = Date.now();
      let end = 0;
      if (currentRoundObj?.roundEndsAt) {
        end = new Date(currentRoundObj.roundEndsAt).getTime();
      } else if (startedTime) {
        end = new Date(startedTime).getTime() + duration * 1000;
      } else {
        end = now + duration * 1000;
      }
      
      const left = Math.max(0, end - now);
      const leftSecs = Math.floor(left / 1000);
      setTimeLeftSecs(leftSecs);

      const m = Math.floor(leftSecs / 60);
      const s = leftSecs % 60;
      setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentRoundObj, currentRoom.state, currentRoom.matchStartAt, currentRoom.roundTimer]);

  const timerColorClass = useMemo(() => {
    if (currentRoom.state !== MatchState.PLAYING && currentRoom.state !== MatchState.SUBMITTED_WAITING) {
      return 'text-indigo-400 border-indigo-950/45 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-indigo-950/10';
    }
    if (timeLeftSecs <= 20) {
      // Critical (rose/red)
      return 'text-rose-500 border-rose-950/45 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-950/10';
    }
    if (timeLeftSecs <= 60) {
      // Warning (amber/orange)
      return 'text-amber-500 border-amber-950/45 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-950/10';
    }
    // Safe (electric blue/indigo)
    return 'text-indigo-400 border-indigo-950/45 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-indigo-950/10';
  }, [timeLeftSecs, currentRoom.state]);

  // Derived user statistics for right sidebar
  const totalMultiRoundMatches = useMemo(() => {
    if (!user) return 0;
    return Math.max(0, Math.floor(user.matchesPlayed * 0.35));
  }, [user]);

  const multiRoundWinRate = useMemo(() => {
    if (!user || user.matchesPlayed === 0) return '0%';
    const rate = Math.round((user.wins / user.matchesPlayed) * 100);
    return `${rate}%`;
  }, [user]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-neutral-200 relative select-none font-sans">
      {/* Visual background blue shadow warning */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/5 via-transparent to-transparent pointer-events-none z-0" />

      {/* Anti-cheat overlay */}
      <AnimatePresence>
        {cheatWarning && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-indigo-950/80 backdrop-blur-md text-indigo-200 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3 border border-indigo-800/40 text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 text-indigo-455 animate-pulse" />
            <span className="uppercase tracking-wider font-mono">{cheatWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Competitive Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* ==================== LEFT SIDEBAR (Expanded Problem Box, w-[440px]) ==================== */}
        <div className="w-[440px] flex flex-col bg-[#050505] border-r border-indigo-950/15 flex-shrink-0 h-full overflow-hidden">
          <div className="flex-1 flex flex-col p-5 space-y-5 min-h-0">
            
            {/* Header Brand */}
            <div className="flex items-center space-x-3 bg-indigo-950/10 p-3 rounded-xl border border-indigo-900/20 flex-shrink-0">
              <div className="w-8 h-8 rounded bg-indigo-600/10 flex items-center justify-center border border-indigo-500/30">
                <Sword className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xs font-black text-indigo-400 tracking-wider uppercase font-mono">
                  Multi-Round Arena
                </h1>
                <p className="text-[9px] text-neutral-550 font-mono tracking-wide mt-0.5 leading-none">
                  Algorithmic Battle. Series Mode.
                </p>
              </div>
            </div>

            {/* Problem Spec Card */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] p-5 rounded-xl border border-neutral-900 overflow-hidden">
              <div className="flex items-center justify-between text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono flex-shrink-0 pb-2 border-b border-neutral-900/40">
                <span className="flex items-center space-x-2">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PROBLEM DETAILS</span>
                </span>
                {currentRoundObj?.roundType && (
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                    {getCategoryLabel(currentRoundObj.roundType)}
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto mt-4 space-y-3.5 text-neutral-400 leading-relaxed font-medium text-[11.5px] pr-1 scrollbar-hide">
                <h2 className="text-base font-extrabold text-white tracking-tight leading-none mb-1">
                  {problemTitle}
                </h2>
                
                <div 
                  className="space-y-3.5"
                  dangerouslySetInnerHTML={{
                    __html: problemDescription || `<p>Awaiting problem allocation matrix from the central match seed engine...</p>`
                  }}
                />

                <div className="bg-[#050505] p-3 rounded border border-neutral-900 mt-4 font-mono text-[10.5px] space-y-1.5">
                  <span className="text-[8.5px] font-bold text-indigo-400/70 block uppercase tracking-wider">
                    Execution Constraints
                  </span>
                  <p>• Only one final evaluation submission allowed.</p>
                  <p>• Scoring based on Correctness, Efficiency, and Speed.</p>
                  <p>• Submissions verified against dynamic hidden cases.</p>
                  <p>• Time Limit: 2000ms</p>
                  <p>• Memory Limit: 256MB</p>
                </div>
              </div>
            </div>

            {/* Arena Sector Details (Bottom) */}
            <div className="grid grid-cols-3 gap-2 flex-shrink-0">
              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-2.5">
                <span className="text-[8px] font-bold text-neutral-550 uppercase tracking-widest block leading-none mb-1 font-mono">
                  Sector
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                  {currentRoom.id.slice(0, 4).toUpperCase()}
                </span>
              </div>
              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-2.5">
                <span className="text-[8px] font-bold text-neutral-550 uppercase tracking-widest block leading-none mb-1 font-mono">
                  Latency
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  <span>{Math.round(latency)}ms</span>
                </span>
              </div>
              <button
                onClick={handleLeaveRoom}
                className="bg-[#0a0a0a] hover:bg-red-950/20 hover:text-red-400 border border-neutral-900 hover:border-red-900/30 rounded-xl p-2.5 flex flex-col items-center justify-center transition-colors active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400 mb-1" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Leave</span>
              </button>
            </div>

          </div>
        </div>

        {/* ==================== MIDDLE EDITOR BLOCK (Narrower coding workspace) ==================== */}
        <div className="flex-1 flex flex-col bg-black">
          
          {/* Top Head-to-Head HUD (Glow Card) */}
          <div className="p-4 border-b border-indigo-950/15 bg-gradient-to-b from-[#02020a] to-black">
            <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
              
              {/* Host / Self User */}
              <div className="flex items-center space-x-3 w-2/5">
                <div className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-indigo-900/30 flex items-center justify-center relative shadow-inner">
                  <span className="text-sm font-black text-white font-mono">
                    {user?.username.charAt(0).toUpperCase()}
                  </span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-black" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white tracking-tight leading-none">
                      {user?.username}
                    </span>
                    <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded border border-indigo-500/25">YOU</span>
                  </div>
                  <span className="text-[10px] text-neutral-550 font-mono font-semibold mt-1">
                    {user?.rating} CP • Score: {currentPlayer ? getCumulativeScore(currentPlayer.id) : 0} ({currentPlayer ? getRoundsWon(currentPlayer.id) : 0} Wins)
                  </span>
                </div>
              </div>

              {/* Countdown Digital Timer & Round info */}
              <div className="flex flex-col items-center justify-center w-1/5">
                <div className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest font-black mb-1 animate-pulse h-3.5 leading-none">
                  ROUND {currentRoundIndex} / {currentRoom.totalRounds || 3}
                </div>
                <div className={`text-3xl font-black font-mono tracking-wider leading-none px-4 py-1.5 rounded-lg select-all border transition-all duration-300 ${timerColorClass}`}>
                  {timeLeftStr}
                </div>
              </div>

              {/* Guest / Opponent User */}
              <div className="flex items-center justify-end space-x-3 w-2/5 text-right">
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded border border-indigo-500/25">OPPONENT</span>
                    <span className="text-xs font-bold text-white tracking-tight leading-none">
                      {opponent?.username || 'FINDING...'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-555 font-mono font-semibold mt-1">
                    {opponent?.rating || '----'} CP • Score: {opponent ? getCumulativeScore(opponent.id) : 0} ({opponent ? getRoundsWon(opponent.id) : 0} Wins)
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-indigo-900/30 flex items-center justify-center relative shadow-inner">
                  <span className="text-sm font-black text-white font-mono">
                    {opponent?.username?.charAt(0).toUpperCase() || '?'}
                  </span>
                  <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border border-black ${
                    opponent?.connected ? 'bg-emerald-500' : 'bg-neutral-800'
                  }`} />
                </div>
              </div>

            </div>
          </div>

          {/* Monaco Editor Header Toolbar */}
          <div className="h-11 bg-[#050505] border-b border-indigo-950/15 flex items-center justify-between px-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-indigo-400 border-b border-indigo-500 pb-3 pt-2.5 text-xs font-bold font-mono">
                <Code2 className="w-3.5 h-3.5" />
                <span>solution.py</span>
              </div>
              <span className="text-[9px] text-neutral-650 font-bold font-mono tracking-widest uppercase">
                Python 3
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunCode}
                disabled={isRunningCode || isJudging || !isPlaying}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 hover:text-white disabled:opacity-30 text-neutral-350 text-[10px] font-black uppercase rounded border border-neutral-800 transition-all active:scale-95 font-mono"
              >
                {isRunningCode ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-500" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current text-indigo-500" />
                )}
                <span>Run Dry-Run</span>
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isRunningCode || isJudging || !isPlaying}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-700 to-indigo-650 hover:from-indigo-650 hover:to-indigo-550 text-white text-[10px] font-black uppercase rounded transition-all active:scale-95 disabled:opacity-30 font-mono shadow-[0_0_15px_rgba(99,102,241,0.2)] border border-indigo-500/20"
              >
                {isJudging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 fill-current" />
                )}
                <span>Final Submission</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative border-b border-indigo-950/15">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13.5,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                fontLigatures: true,
                readOnly: !isPlaying,
              }}
            />
          </div>

          {/* Console / Output Terminal Tabs (Bottom Panel) */}
          <div className="h-56 bg-[#050505] flex flex-col font-mono">
            <div className="h-10 px-6 border-b border-indigo-950/15 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <span className="text-neutral-550 mr-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Terminal
                </span>
                <button
                  onClick={() => setActiveTab('output')}
                  className={`text-[9px] font-black uppercase tracking-widest pb-3.5 pt-3 transition-colors ${
                    activeTab === 'output' ? 'text-indigo-400 border-b border-indigo-500' : 'text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  Output
                </button>
                <button
                  onClick={() => setActiveTab('testcase')}
                  className={`text-[9px] font-black uppercase tracking-widest pb-3.5 pt-3 transition-colors ${
                    activeTab === 'testcase' ? 'text-indigo-400 border-b border-indigo-500' : 'text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  Test Cases
                </button>
              </div>
              <span className="text-[9px] text-neutral-650 font-bold uppercase tracking-wider">
                {isRunningCode ? 'Executing Dry Run...' : isJudging ? 'Judging Submission...' : 'Awaiting Execution...'}
              </span>
            </div>

            <div className="flex-1 p-5 font-mono text-xs overflow-y-auto space-y-3">
              {activeTab === 'output' ? (
                isRunningCode ? (
                  <div className="space-y-3 max-w-sm">
                    <div className="flex items-center space-x-2 text-neutral-450">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-550" />
                      <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wide">
                        Running program inside Docker sandbox...
                      </span>
                    </div>
                  </div>
                ) : isJudging ? (
                  <div className="space-y-3 max-w-sm">
                    <div className="flex items-center space-x-2 text-neutral-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wide">
                        Evaluating submission code vectors...
                      </span>
                    </div>
                    <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="bg-indigo-600 h-full"
                      />
                    </div>
                  </div>
                ) : dryRunResult ? (
                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                      <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider font-sans">Dry Run Console</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider font-sans ${
                        dryRunResult.success && dryRunResult.exitCode === 0 ? 'text-emerald-400' : 'text-rose-500'
                      }`}>
                        {dryRunResult.success && dryRunResult.exitCode === 0 ? 'SUCCESS' : 'ERROR'}
                      </span>
                    </div>

                    {dryRunResult.success ? (
                      <div className="space-y-2">
                        {dryRunResult.stdout && (
                          <div>
                            <div className="text-neutral-500 text-[9px] uppercase tracking-wider font-bold mb-1 font-sans">Standard Output:</div>
                            <pre className="bg-[#050505] border border-neutral-900/50 rounded-lg p-3 text-neutral-300 overflow-x-auto whitespace-pre font-mono">
                              {dryRunResult.stdout}
                            </pre>
                          </div>
                        )}
                        {dryRunResult.stderr && (
                          <div>
                            <div className="text-neutral-500 text-[9px] uppercase tracking-wider font-bold mb-1 font-sans">Standard Error:</div>
                            <pre className="bg-[#050505] border border-neutral-900/50 rounded-lg p-3 text-rose-400 overflow-x-auto whitespace-pre font-mono">
                              {dryRunResult.stderr}
                            </pre>
                          </div>
                        )}
                        {!dryRunResult.stdout && !dryRunResult.stderr && (
                          <div className="text-neutral-500 italic">No output produced.</div>
                        )}
                        <div className="text-[9px] text-neutral-550 flex items-center gap-3 mt-1.5 pt-1.5 border-t border-neutral-950 font-sans">
                          <span>Exit Code: {dryRunResult.exitCode}</span>
                          <span>Time: {dryRunResult.executionTimeMs}ms</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-rose-500 bg-rose-950/10 border border-rose-900/30 rounded-lg p-3 text-[10px] font-sans">
                        {dryRunResult.error || 'Execution failed due to server error.'}
                      </div>
                    )}
                  </div>
                ) : lastJudgeResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                      <span className="text-neutral-500 text-[10px] font-bold">METRICS SUMMARY</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          lastJudgeResult.overallStatus === 'passed'
                            ? 'text-emerald-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {lastJudgeResult.overallStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] text-neutral-400 bg-neutral-950 p-2.5 rounded border border-neutral-900">
                      <div>
                        Score:{' '}
                        <span className="text-neutral-250 font-bold">
                          {lastJudgeResult.totalScore}/{lastJudgeResult.maxScore}
                        </span>
                      </div>
                      <div className="text-right">
                        Verdict:{' '}
                        <span
                          className={
                            lastJudgeResult.overallStatus === 'passed'
                              ? 'text-emerald-400 font-bold'
                              : 'text-indigo-455 font-bold'
                          }
                        >
                          {lastJudgeResult.overallStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {lastJudgeResult.testResults.map((test: any, index: number) => (
                        <div
                          key={test.testCaseId}
                          className="flex items-center justify-between bg-[#0a0a0a] px-3 py-1.5 rounded border border-neutral-900 text-[10px]"
                        >
                          <span className="text-neutral-500">Test Case #{index + 1}</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-[9px] text-neutral-600">
                              {test.executionTimeMs}ms
                            </span>
                            <span
                              className={`font-bold uppercase text-[9px] ${
                                test.status === 'passed' ? 'text-emerald-400' : 'text-indigo-455'
                              }`}
                            >
                              {test.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-neutral-600 text-[11px] font-bold">
                    <p>{'>'} Awaiting submission execution. Outputs will compile here.</p>
                  </div>
                )
              ) : (
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="p-3 bg-[#0a0a0a] border border-neutral-900 rounded-lg">
                    <span className="text-[9px] font-bold text-indigo-400 block uppercase mb-1">
                      Case 1 (Default Input)
                    </span>
                    <span className="text-neutral-500 block">Check parameters under problem spec.</span>
                  </div>
                  <div className="p-3 bg-[#0a0a0a] border border-neutral-900 rounded-lg">
                    <span className="text-[9px] font-bold text-neutral-500 block uppercase mb-1">
                      Case 2 (Boundary Case)
                    </span>
                    <span className="text-neutral-500 block">System validates dynamic values.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ==================== RIGHT SIDEBAR (Telemetry & Stats, w-72) ==================== */}
        <div className="w-72 flex flex-col bg-[#050505] border-l border-indigo-950/15 flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide text-xs">
            
            {/* Round info and settled scores breakdown */}
            <div className="space-y-3 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Round Standings</span>
              </div>

              <div className="space-y-3 font-mono text-[10px] leading-tight">
                {currentRoom.roundResults && currentRoom.roundResults.length > 0 ? (
                  currentRoom.roundResults.map((rr, idx) => {
                    const myScore = rr.scores[currentPlayer?.id || ''] ?? 0;
                    const oppScore = rr.scores[opponent?.id || ''] ?? 0;
                    return (
                      <div key={idx} className="flex flex-col space-y-1 pl-2 border-l border-indigo-500/20">
                        <div className="flex justify-between items-center text-neutral-300 font-bold">
                          <span>ROUND {rr.roundIndex}</span>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1 rounded border border-indigo-500/20">
                            {(!rr.winner || rr.winner === 'DRAW') ? 'DRAW' : (rr.winner === currentPlayer?.id ? 'YOU WON' : 'OPPONENT WON')}
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-500 text-[9px]">
                          <span>You: {myScore} pts</span>
                          <span>Opponent: {oppScore} pts</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-neutral-500 text-[10px] italic py-1 leading-normal">
                    No rounds settled yet. Match has just initialized.
                  </div>
                )}
              </div>
            </div>

            {/* Live Competitors Status */}
            <div className="space-y-3 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Competitors State</span>
              </div>
              <div className="space-y-2">
                {sortedPlayers.map((player) => (
                  <div key={player.id} className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-neutral-350">{player.username}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase ${
                      player.isReady || player.isOwner
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}>
                      {player.isReady || player.isOwner ? 'READY' : 'WAITING'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Opponent Status Telemetry Visualizer */}
            <div className="space-y-2 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-905">
              <div className="flex items-center justify-between text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <span>Opponent Signal</span>
                <span className="text-indigo-400 font-bold font-mono">ACTIVE 98%</span>
              </div>
              <TelemetrySignalVisualizer />
            </div>

            {/* Stats Card */}
            <div className="space-y-3 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                <span>Your Stats</span>
              </div>

              <div className="space-y-2.5 font-mono text-[10px]">
                <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                  <span className="text-neutral-500">Series Win Rate</span>
                  <span className="text-indigo-400 font-black">{multiRoundWinRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Series Matches</span>
                  <span className="text-white font-bold">{totalMultiRoundMatches}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Overlays */}

      {/* SUBMITTED WAITING OVERLAY */}
      <AnimatePresence>
        {currentRoom.state === MatchState.SUBMITTED_WAITING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-[#000000]/80 backdrop-blur-sm flex flex-col items-center justify-center p-12"
          >
            <div className="flex flex-col items-center text-center max-w-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-2 border-neutral-800 border-t-indigo-500 rounded-full mb-6"
              />
              <h2 className="text-xl font-bold text-white tracking-tight uppercase mb-2">
                SUBMISSION RECEIVED
              </h2>
              <p className="text-neutral-550 text-xs mb-4 uppercase tracking-wider">
                Waiting for opponent to complete their submission...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROUND COMPLETE & INTER-ROUND COUNTDOWN OVERLAY */}
      <AnimatePresence>
        {(currentRoom.state === MatchState.ROUND_SUMMARY || currentRoom.state === MatchState.ROUND_INITIALIZING) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[#000000]/95 backdrop-blur-sm flex flex-col items-center justify-center p-12"
          >
            <div className="flex flex-col items-center text-center max-w-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-805"
              >
                <Trophy className="w-6 h-6 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white tracking-tight uppercase mb-2">
                ROUND {currentRoundIndex} COMPLETE
              </h2>
              <p className="text-neutral-550 text-xs mb-8 uppercase tracking-widest font-semibold text-indigo-405">
                {currentRoom.state === MatchState.ROUND_SUMMARY ? 'Calculating Scores...' : 'Preparing Next Arena...'}
              </p>
              
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-[0.2em] mb-2">
                  NEXT ROUND IN
                </span>
                <span className="text-6xl font-bold text-white font-mono animate-pulse">
                  {countdown !== null && countdown >= 0 ? countdown : 0}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WAITING OVERLAY */}
      <AnimatePresence>
        {currentRoom.state === MatchState.WAITING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-[#000000]/95 backdrop-blur-sm flex flex-col items-center justify-center p-12"
          >
            <div className="flex flex-col items-center text-center max-w-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-805"
              >
                <Sword className="w-6 h-6 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white tracking-tight uppercase mb-2">
                MULTI-ROUND READY
              </h2>
              <p className="text-neutral-555 text-xs mb-8">
                Confirm your readiness. This is a multi-round series. Highest score wins MMR.
              </p>

              <div className="flex flex-col items-center space-y-4 w-full">
                {isHost ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleStartDuel}
                    disabled={!allReady}
                    className="w-full py-3 bg-white hover:bg-neutral-100 disabled:opacity-20 text-black font-semibold uppercase tracking-wider text-xs rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{allReady ? 'Start Match Series' : 'Awaiting Signals'}</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleToggleReady}
                    className={`w-full py-3 font-semibold uppercase tracking-wider text-xs rounded-lg transition-all flex items-center justify-center space-x-2 border ${
                      currentPlayer?.isReady
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-transparent border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {currentPlayer?.isReady ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                    <span>
                      {currentPlayer?.isReady ? 'READY CONFIRMED' : 'CONFIRM READINESS'}
                    </span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CINEMATIC COUNTDOWN */}
      <AnimatePresence>
        {currentRoom.state === MatchState.COUNTDOWN && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[50] bg-neutral-950 flex items-center justify-center overflow-hidden"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 flex flex-col items-center"
            >
              <span className="text-[120px] font-bold text-white italic tracking-tighter leading-none font-mono">
                {countdown || 0}
              </span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-[0.3em] mt-2">
                STARTING SERIES
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULTS REVEAL */}
      <AnimatePresence>
        {currentRoom.state === MatchState.RESULTS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-neutral-955 flex flex-col items-center justify-center p-12 overflow-hidden"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative z-10 flex flex-col items-center text-center max-w-sm w-full font-mono"
            >
              <div className="w-16 h-16 bg-indigo-955/30 border border-indigo-900/30 rounded-full flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-indigo-400" />
              </div>

              <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">
                Series Concluded
              </h2>
              <p className="text-neutral-555 text-xs mb-8">
                Results processed. Series scores updated.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 text-left">
                  <span className="text-[8px] font-bold text-neutral-550 uppercase tracking-widest block">
                    Outcome
                  </span>
                  <p className="text-sm font-bold text-white mt-1 uppercase">Success</p>
                  <p className="text-[9px] text-indigo-400 mt-1 font-bold">
                    CP Allocated
                  </p>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 text-left">
                  <span className="text-[8px] font-bold text-neutral-550 uppercase tracking-widest block">
                    Computed
                  </span>
                  <p className="text-sm font-bold text-white mt-1">100% OK</p>
                  <p className="text-[9px] text-neutral-500 mt-1">Pass validation</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => (window.location.href = '/')}
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition-colors border border-indigo-500/20"
              >
                Return to Center
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
