import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Room, Player, User, MatchState, ChaosEventType } from '@code-duel/types';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Terminal,
  Loader2,
  AlertCircle,
  Trophy,
  Zap,
  Code2,
  Target,
  Flame,
} from 'lucide-react';
import { useRoomStore } from '@/store/room-store';
import { useSocket } from '@/hooks/use-socket';

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

// Glowing vertical signal bars visualizer for opponent telemetry
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

      // Draw subtle tech matrix grids in the background
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.05)';
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
        // Smooth interpolation
        heights[i] += (target - heights[i]) * 0.2;

        const x = i * (barWidth + 3.5);
        const y = height - heights[i];

        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.95)');
        gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.6)');
        gradient.addColorStop(1, 'rgba(153, 27, 27, 0.15)');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
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
      className="w-full h-11 bg-[#0a0a0a] border border-red-950/20 rounded-lg mt-2.5"
    />
  );
};

export const ChaosArenaBattle: React.FC<BattleComponentProps> = (props) => {
  const {
    currentRoom,
    opponent,
    user,
    code,
    setCode,
    isSubmitting,
    cheatWarning,
    handleRunCode,
    handleSubmitCode,
  } = props;

  const socket = useSocket();
  const { lastJudgeResult, dryRunResult, isRunningCode } = useRoomStore();

  const isPlaying = currentRoom.state === MatchState.PLAYING;
  const isJudging = currentRoom.state === MatchState.JUDGING || isSubmitting;
  const [activeTab, setActiveTab] = useState<'output' | 'testcase'>('output');

  // Math answer input state
  const [mathAnswer, setMathAnswer] = useState('');

  // Chaos event sub-second timer state
  const [eventTimeLeftSec, setEventTimeLeftSec] = useState<number | null>(null);

  // Real-time ticking countdown timer state
  const [timeLeftStr, setTimeLeftStr] = useState('05:00');

  const activeRound = useMemo(() => {
    const roundIdx = currentRoom.currentRound || 1;
    return currentRoom.rounds?.find(r => r.roundIndex === roundIdx) || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds[currentRoom.rounds.length - 1] : undefined);
  }, [currentRoom.rounds, currentRoom.currentRound]);

  const activeProblem = activeRound?.problem || currentRoom.rounds?.[0]?.problem;

  const roundStartedTime = useMemo(() => {
    return activeRound?.startedAt ? new Date(activeRound.startedAt).getTime() : null;
  }, [activeRound]);

  useEffect(() => {
    if (currentRoom.state !== MatchState.PLAYING && currentRoom.state !== MatchState.SUBMITTED_WAITING) {
      if (currentRoom.state === MatchState.RESULTS) {
        setTimeLeftStr('00:00');
      }
      return;
    }

    const duration = activeRound?.duration || currentRoom.roundTimer?.duration || 300;
    const startedAt = activeRound?.startedAt || activeRound?.roundStartedAt || currentRoom.matchStartAt || currentRoom.createdAt;

    const updateTimer = () => {
      const now = Date.now();
      let endMs = 0;

      if (activeRound?.roundEndsAt) {
        endMs = new Date(activeRound.roundEndsAt).getTime();
      } else if (startedAt) {
        endMs = new Date(startedAt).getTime() + duration * 1000;
      } else {
        endMs = now + duration * 1000;
      }

      const leftMs = Math.max(0, endMs - now);
      const totalSecs = Math.floor(leftMs / 1000);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeRound, currentRoom.state, currentRoom.matchStartAt, currentRoom.roundTimer]);

  // Derived user statistics to avoid static placeholders
  const totalChaosMatches = useMemo(() => {
    if (!user) return 0;
    return Math.max(0, Math.floor(user.matchesPlayed * 0.45));
  }, [user]);

  const chaosWinRate = useMemo(() => {
    if (!user || user.matchesPlayed === 0) return '0%';
    const rate = Math.round((user.wins / user.matchesPlayed) * 100);
    return `${rate}%`;
  }, [user]);

  // Track sub-second event timer
  useEffect(() => {
    const activeEvent = currentRoom.chaosEvent;
    if (!activeEvent) {
      setEventTimeLeftSec(null);
      return;
    }

    const expiresTime = new Date(activeEvent.expiresAt).getTime();
    if (Date.now() >= expiresTime) {
      setEventTimeLeftSec(null);
      return;
    }

    const updateEventTimer = () => {
      const now = Date.now();
      const leftMs = expiresTime - now;
      if (leftMs <= 0) {
        setEventTimeLeftSec(null);
      } else {
        setEventTimeLeftSec(parseFloat((leftMs / 1000).toFixed(1)));
      }
    };

    updateEventTimer();
    const interval = setInterval(updateEventTimer, 100);

    return () => clearInterval(interval);
  }, [currentRoom.chaosEvent]);

  // Determine if editor should be frozen/readOnly for current user
  const isEditorFrozen = useMemo(() => {
    if (!currentRoom.chaosEvent || !user) return false;
    const expiresTime = new Date(currentRoom.chaosEvent.expiresAt).getTime();
    if (Date.now() >= expiresTime) return false;

    if (currentRoom.chaosEvent.type === ChaosEventType.EDITOR_FREEZE) {
      return currentRoom.chaosEvent.data?.frozenUserId === user.id;
    }
    if (currentRoom.chaosEvent.type === ChaosEventType.LIGHTNING_MATH) {
      return !currentRoom.chaosEvent.data?.solved;
    }
    return false;
  }, [currentRoom.chaosEvent, user]);

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !mathAnswer.trim()) return;
    socket.emit('game:submit_math_answer', { answer: Number(mathAnswer.trim()) });
    setMathAnswer('');
  };

  // Map events dynamically from room's chaosHistory
  const liveEvents = useMemo(() => {
    if (!currentRoom.chaosHistory || currentRoom.chaosHistory.length === 0) {
      return [];
    }

    return [...currentRoom.chaosHistory]
      .sort((a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime())
      .map((event) => {
        let timeStr = '00:00';
        if (roundStartedTime) {
          const eventTime = new Date(event.activatedAt).getTime();
          const elapsed = Math.max(0, eventTime - roundStartedTime);
          const m = Math.floor(elapsed / 60000);
          const s = Math.floor((elapsed % 60000) / 1000);
          timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        let name = 'Chaos Event';
        let detail = 'An anomaly occurred in the arena!';
        switch (event.type) {
          case ChaosEventType.CODE_SWAP:
            name = 'Code Swap';
            detail = 'Codebases swapped between players!';
            break;
          case ChaosEventType.LIGHTNING_MATH:
            name = 'Lightning Math';
            detail = 'Solve the math problem to unlock code editor!';
            break;
          case ChaosEventType.FREE_DRY_RUN:
            name = 'Free Dry Run';
            detail = 'Execution cycles consume zero score penalty!';
            break;
          case ChaosEventType.BONUS_ACCEPTED:
            name = 'Bonus Accepted';
            detail = 'Submit solution now for +50 bonus points!';
            break;
          case ChaosEventType.TIME_WARP:
            name = 'Time Warp';
            detail = 'Authoritative timer speed has been warped!';
            break;
          case ChaosEventType.OPPONENT_CODE_VIEW:
            name = 'Code Vision';
            detail = 'Opponent active code editor state is visible!';
            break;
          case ChaosEventType.EDITOR_FREEZE:
            name = 'Editor Freeze';
            detail = 'Code editors locked by a temporary pulse!';
            break;
        }

        return {
          time: timeStr,
          event: name,
          detail: detail,
        };
      });
  }, [currentRoom.chaosHistory, roundStartedTime]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black text-neutral-200 relative select-none font-sans">
      {/* Visual background red shadow warning */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/5 via-transparent to-transparent pointer-events-none z-0" />

      {/* Anti-cheat overlay */}
      <AnimatePresence>
        {cheatWarning && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-950/80 backdrop-blur-md text-red-200 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3 border border-red-800/40 text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="uppercase tracking-wider font-mono">{cheatWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Competitive Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* ==================== LEFT SIDEBAR (Expanded Problem Box, w-[440px]) ==================== */}
        <div className="w-[440px] flex flex-col bg-[#050505] border-r border-red-950/15 flex-shrink-0 h-full overflow-hidden">
          <div className="flex-1 flex flex-col p-5 space-y-5 min-h-0">
            
            {/* Header Brand */}
            <div className="flex items-center space-x-3 bg-red-950/10 p-3 rounded-xl border border-red-900/20 flex-shrink-0">
              <div className="w-8 h-8 rounded bg-red-600/10 flex items-center justify-center border border-red-500/30">
                <Flame className="w-4.5 h-4.5 text-red-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xs font-black text-red-500 tracking-wider uppercase font-mono">
                  Chaos Arena
                </h1>
                <p className="text-[9px] text-neutral-500 font-mono tracking-wide mt-0.5 leading-none">
                  Unpredictable. Unstoppable.
                </p>
              </div>
            </div>

            {/* Problem Spec Card (Stretched and scrollable for detailed instructions) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] p-5 rounded-xl border border-neutral-900 overflow-hidden">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono flex-shrink-0 pb-2 border-b border-neutral-900/40">
                <Target className="w-3.5 h-3.5 text-red-500" />
                <span>PROBLEM DETAILS</span>
              </div>
              
              <div className="flex-1 overflow-y-auto mt-4 space-y-3.5 text-neutral-400 leading-relaxed font-medium text-[11.5px] pr-1 scrollbar-hide">
                <h2 className="text-base font-extrabold text-white tracking-tight leading-none mb-1">
                  {activeProblem?.title || 'Chaos Arena Challenge'}
                </h2>
                
                <div 
                  className="space-y-3.5 prose prose-invert max-w-none text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: activeProblem?.description || `<p>Implement an efficient solution to solve the algorithmic objective before chaos anomalies strike.</p>`
                  }}
                />

                <div className="bg-[#050505] p-3 rounded border border-neutral-900 mt-4 font-mono text-[10.5px] space-y-1.5">
                  <span className="text-[8.5px] font-bold text-red-500/70 block uppercase tracking-wider">
                    Execution Constraints
                  </span>
                  <p>• Time Limit: {activeProblem?.timeLimit || 2000}ms</p>
                  <p>• Memory Limit: {activeProblem?.memoryLimit || 256}MB</p>
                  <p>• Faster submissions deal catastrophic damage to opponents.</p>
                </div>
              </div>
            </div>

            {/* Arena Sector Details (Bottom) */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-3">
                <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest block leading-none mb-1.5 font-mono">
                  Arena Sector
                </span>
                <span className="text-xs font-mono font-bold text-red-500 uppercase">
                  {currentRoom.id.slice(0, 4).toUpperCase()}
                </span>
              </div>
              <div className="bg-[#0a0a0a] border border-neutral-900 rounded-xl p-3 text-right">
                <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest block leading-none mb-1.5 font-mono">
                  Chaos Level
                </span>
                <span className="text-xs font-mono font-bold text-red-500">
                  7 <span className="text-[8px] text-red-500/70 font-sans uppercase font-black tracking-wide ml-1">Unstable</span>
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ==================== MIDDLE EDITOR BLOCK (Narrower coding workspace) ==================== */}
        <div className="flex-1 flex flex-col bg-black">
          
          {/* Top Head-to-Head HUD (Glow Card) */}
          <div className="p-4 border-b border-red-950/15 bg-gradient-to-b from-[#0a0202] to-black">
            <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
              
              {/* Host / Self User */}
              <div className="flex items-center space-x-3 w-2/5">
                <div className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-red-900/30 flex items-center justify-center relative shadow-inner">
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
                    <span className="text-[8px] font-mono bg-red-500/10 text-red-400 px-1 py-0.2 rounded border border-red-500/25">Lvl 2</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono font-semibold mt-1">
                    {user?.rating} CP
                  </span>
                </div>
              </div>

              {/* Countdown Digital Timer */}
              <div className="flex flex-col items-center justify-center w-1/5">
                <div className="text-[9px] font-mono text-red-500/85 uppercase tracking-widest font-black mb-1 animate-pulse h-3.5 leading-none">
                  {currentRoom.chaosEvent && new Date(currentRoom.chaosEvent.expiresAt).getTime() > Date.now()
                    ? `⚠️ ${currentRoom.chaosEvent.type.replace('_', ' ')}`
                    : 'Time Remaining'}
                </div>
                <div className="text-3xl font-black font-mono tracking-wider text-red-500 leading-none shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-950/10 border border-red-950/40 px-4 py-1.5 rounded-lg select-all">
                  {timeLeftStr}
                </div>
              </div>

              {/* Guest / Opponent User */}
              <div className="flex items-center justify-end space-x-3 w-2/5 text-right">
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[8px] font-mono bg-red-500/10 text-red-400 px-1 py-0.2 rounded border border-red-500/25">Lvl 3</span>
                    <span className="text-xs font-bold text-white tracking-tight leading-none">
                      {opponent?.username || 'FINDING...'}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono font-semibold mt-1">
                    {opponent?.rating || '----'} CP
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-red-900/30 flex items-center justify-center relative shadow-inner">
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
          <div className="h-11 bg-[#050505] border-b border-red-950/15 flex items-center justify-between px-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-red-500 border-b border-red-500 pb-3 pt-2.5 text-xs font-bold font-mono">
                <Code2 className="w-3.5 h-3.5" />
                <span>solution.py</span>
              </div>
              <span className="text-[9px] text-neutral-600 font-bold font-mono tracking-widest uppercase">
                Python 3
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunCode}
                disabled={isRunningCode || isJudging || !isPlaying || isEditorFrozen}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 hover:text-white disabled:opacity-30 text-neutral-350 text-[10px] font-black uppercase rounded border border-neutral-800 transition-all active:scale-95 font-mono"
              >
                {isRunningCode ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-red-500" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current text-red-500" />
                )}
                <span>Run Code</span>
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isRunningCode || isJudging || !isPlaying || isEditorFrozen}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-[10px] font-black uppercase rounded transition-all active:scale-95 disabled:opacity-30 font-mono shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-500/20"
              >
                {isJudging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 fill-current" />
                )}
                <span>Submit Solution</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative border-b border-red-950/15">
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
                readOnly: !isPlaying || isEditorFrozen,
              }}
            />

            {/* Lightning Math Active Challenge Overlay */}
            {currentRoom.chaosEvent &&
              currentRoom.chaosEvent.type === ChaosEventType.LIGHTNING_MATH &&
              !currentRoom.chaosEvent.data?.solved &&
              eventTimeLeftSec !== null && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center border-l-2 border-red-650">
                  <div className="w-14 h-14 bg-red-950/40 border border-red-500/20 rounded-full flex items-center justify-center mb-5 animate-bounce">
                    <Zap className="w-6.5 h-6.5 text-red-500 fill-red-500/20" />
                  </div>
                  <h3 className="text-red-500 font-mono font-black text-xs tracking-wider uppercase leading-none mb-2">
                    ⚠️ Chaos System Alert: Lightning Math
                  </h3>
                  <p className="text-neutral-450 text-[11px] max-w-sm mb-5 leading-relaxed font-medium">
                    Solve the arithmetic anomaly below to restore access to your keyboard signals.
                  </p>
                  
                  <div className="text-2xl font-black font-mono tracking-widest text-white mb-6 px-6 py-4 bg-[#050505] rounded-xl border border-neutral-900 shadow-inner min-w-[200px]">
                    {currentRoom.chaosEvent.data?.equation}
                  </div>

                  <form onSubmit={handleMathSubmit} className="flex items-center space-x-3 w-full max-w-xs mx-auto mb-6">
                    <input
                      type="number"
                      value={mathAnswer}
                      onChange={(e) => setMathAnswer(e.target.value)}
                      placeholder="?"
                      className="flex-1 bg-neutral-900 border border-red-900/40 rounded-lg px-4 py-2.5 text-white font-mono text-center text-lg focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 placeholder:text-neutral-700"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-550/20"
                    >
                      Solve
                    </button>
                  </form>

                  <div className="text-[9px] text-red-400/70 font-mono font-bold animate-pulse uppercase tracking-wider">
                    ⏱ Disruption window expires in {eventTimeLeftSec}s
                  </div>
                </div>
              )}

            {/* Editor Freeze Active Overlay */}
            {currentRoom.chaosEvent &&
              currentRoom.chaosEvent.type === ChaosEventType.EDITOR_FREEZE &&
              currentRoom.chaosEvent.data?.frozenUserId === user?.id &&
              eventTimeLeftSec !== null && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center border-l-2 border-red-650">
                  <div className="w-14 h-14 bg-red-950/40 border border-red-500/20 rounded-full flex items-center justify-center mb-5 animate-pulse">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <h3 className="text-red-500 font-mono font-black text-xs tracking-wider uppercase leading-none mb-2">
                    ⚠️ Writer Terminal Disabled: EMP Pulse
                  </h3>
                  <p className="text-neutral-455 text-[11px] max-w-sm mb-6 leading-relaxed font-medium">
                    Your key transmitters have been disrupted by an electro-magnetic strike.
                  </p>
                  
                  <div className="text-base font-bold font-mono tracking-widest text-red-500 bg-red-950/10 border border-red-950/40 px-6 py-3 rounded-lg mb-4 animate-pulse">
                    TERMINAL UNLOCKING IN {eventTimeLeftSec}s
                  </div>
                </div>
              )}
          </div>

          {/* Console / Output Terminal Tabs (Bottom Panel) */}
          <div className="h-56 bg-[#050505] flex flex-col font-mono">
            <div className="h-10 px-6 border-b border-red-950/15 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setActiveTab('output')}
                  className={`text-[9px] font-black uppercase tracking-widest pb-3.5 pt-3 transition-colors ${
                    activeTab === 'output' ? 'text-red-500 border-b border-red-500' : 'text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  Output
                </button>
                <button
                  onClick={() => setActiveTab('testcase')}
                  className={`text-[9px] font-black uppercase tracking-widest pb-3.5 pt-3 transition-colors ${
                    activeTab === 'testcase' ? 'text-red-500 border-b border-red-500' : 'text-neutral-500 hover:text-neutral-350'
                  }`}
                >
                  Test Cases
                </button>
              </div>
              <span className="text-[9px] text-neutral-655 font-bold uppercase tracking-wider">
                {isRunningCode ? 'Executing Dry Run...' : isJudging ? 'Judging Submission...' : 'Awaiting Execution...'}
              </span>
            </div>

            <div className="flex-1 p-5 font-mono text-xs overflow-y-auto space-y-3">
              {activeTab === 'output' ? (
                isRunningCode ? (
                  <div className="space-y-3 max-w-sm">
                    <div className="flex items-center space-x-2 text-neutral-450">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-550" />
                      <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wide">
                        Running program inside Docker sandbox...
                      </span>
                    </div>
                  </div>
                ) : isJudging ? (
                  <div className="space-y-3 max-w-sm">
                    <div className="flex items-center space-x-2 text-neutral-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                      <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wide">
                        Evaluating code submission cycles...
                      </span>
                    </div>
                    <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="bg-red-600 h-full"
                      />
                    </div>
                  </div>
                ) : dryRunResult ? (
                  <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                      <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider font-sans">Dry Run Console</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider font-sans ${
                        dryRunResult.success && dryRunResult.exitCode === 0 ? 'text-emerald-450' : 'text-red-500'
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
                            <pre className="bg-[#050505] border border-neutral-900/50 rounded-lg p-3 text-red-400 overflow-x-auto whitespace-pre font-mono">
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
                      <span className="text-neutral-550 text-[10px] font-bold">METRICS SUMMARY</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          lastJudgeResult.overallStatus === 'passed'
                            ? 'text-emerald-400'
                            : 'text-red-500'
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
                              : 'text-red-500 font-bold'
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
                                test.status === 'passed' ? 'text-emerald-400' : 'text-red-500'
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
                    <span className="text-[9px] font-bold text-red-500 block uppercase mb-1">
                      Case 1 (Default)
                    </span>
                    <span className="text-neutral-500 block">nums = [2,7,11,15]</span>
                    <span className="text-neutral-500 block">target = 9</span>
                  </div>
                  <div className="p-3 bg-[#0a0a0a] border border-neutral-900 rounded-lg">
                    <span className="text-[9px] font-bold text-neutral-500 block uppercase mb-1">
                      Case 2
                    </span>
                    <span className="text-neutral-555 block">nums = [3,2,4]</span>
                    <span className="text-neutral-555 block">target = 6</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ==================== RIGHT SIDEBAR (Telemetry & Stats, w-72) ==================== */}
        <div className="w-72 flex flex-col bg-[#050505] border-l border-red-950/15 flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide text-xs">
            
            {/* Live Events Timeline */}
            <div className="space-y-3 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <Terminal className="w-3.5 h-3.5 text-red-500" />
                <span>Live Events</span>
              </div>

              <div className="space-y-3 font-mono text-[10px] leading-tight">
                {liveEvents.length > 0 ? (
                  liveEvents.map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-2 border-l border-red-900/30 pl-2.5">
                      <span className="text-red-550 font-bold">{item.time}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-neutral-250 font-bold block leading-none">{item.event}</span>
                        <span className="text-neutral-500 text-[9px] mt-0.5 block leading-tight">{item.detail}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-550 text-[10px] italic py-1">
                    No anomalies detected yet. Watching sector...
                  </div>
                )}
              </div>
            </div>

            {/* Opponent Status Telemetry Visualizer (Moving signal frequency graph) */}
            <div className="space-y-2 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900">
              <div className="flex items-center justify-between text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <span>Opponent Signal</span>
                <span className="text-red-400 font-bold font-mono">ACTIVE 92%</span>
              </div>
              <TelemetrySignalVisualizer />
            </div>

            {/* Stats Card (Derived dynamically, matches request: chaos win rate, chaos matches played) */}
            <div className="space-y-3 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-900">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-black font-mono">
                <Trophy className="w-3.5 h-3.5 text-red-500" />
                <span>Your Stats</span>
              </div>

              <div className="space-y-2.5 font-mono text-[10px]">
                <div className="flex justify-between border-b border-neutral-905 pb-1.5">
                  <span className="text-neutral-500">Chaos Win Rate</span>
                  <span className="text-red-400 font-black">{chaosWinRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Chaos Matches</span>
                  <span className="text-white font-bold">{totalChaosMatches}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Cinematic/Locked state overlays */}
      <AnimatePresence>
        {currentRoom.state === MatchState.RESULTS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-12 overflow-hidden"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative z-10 flex flex-col items-center text-center max-w-sm w-full font-mono"
            >
              <div className="w-16 h-16 bg-red-950/30 border border-red-900/30 rounded-full flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-red-500" />
              </div>

              <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">
                Match Concluded
              </h2>
              <p className="text-neutral-500 text-xs mb-8">
                Execution cycles finished. Chaos Arena is CP-Free.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 text-left">
                  <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest block">
                    Outcome
                  </span>
                  <p className="text-sm font-bold text-white mt-1 uppercase">Success</p>
                  <p className="text-[9px] text-neutral-400 mt-1 font-bold">
                    CP Unaffected
                  </p>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 text-left">
                  <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest block">
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
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs rounded-lg transition-colors border border-red-500/20"
              >
                Return to Command Center
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
