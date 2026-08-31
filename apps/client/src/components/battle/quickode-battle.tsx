import React from 'react';
import { Room, Player, User, MatchState } from '@code-duel/types';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  CheckCircle2,
  Terminal,
  Loader2,
  AlertCircle,
  Trophy,
  LogOut,
  Zap,
  Sword,
  Code2,
  Target,
  Activity,
} from 'lucide-react';
import { useRoomStore } from '@/store/room-store';

export interface BattleComponentProps {
  currentRoom: Room;
  currentPlayer: Player | undefined;
  opponent: Player | undefined;
  opponents?: Player[];
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

export const QuickodeBattle: React.FC<BattleComponentProps> = ({
  currentRoom,
  currentPlayer,
  opponent,
  opponents,
  user,
  code,
  setCode,
  isSubmitting,
  latency: _latency,
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

  const activeOpponents = opponents && opponents.length > 0 ? opponents : opponent ? [opponent] : [];
  const isPlaying = currentRoom.state === MatchState.PLAYING;
  const isJudging = currentRoom.state === MatchState.JUDGING || isSubmitting;

  const currentRoundIndex = currentRoom.currentRound || 1;
  const activeRound = React.useMemo(() => {
    return currentRoom.rounds?.find((r) => r.roundIndex === currentRoundIndex) || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds[currentRoom.rounds.length - 1] : null);
  }, [currentRoom, currentRoundIndex]);

  const activeProblem = activeRound?.problem || currentRoom.rounds?.[0]?.problem;

  const [timeLeftStr, setTimeLeftStr] = React.useState('00:00');
  const [timeLeftSecs, setTimeLeftSecs] = React.useState<number>(0);

  React.useEffect(() => {
    if (currentRoom.state !== MatchState.PLAYING && currentRoom.state !== MatchState.SUBMITTED_WAITING) {
      if (currentRoom.state === MatchState.RESULTS) {
        setTimeLeftStr('00:00');
        setTimeLeftSecs(0);
      }
      return;
    }

    const duration = activeRound?.duration || currentRoom.roundTimer?.duration || 120;
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
      setTimeLeftSecs(totalSecs);

      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeRound, currentRoom.state, currentRoom.matchStartAt, currentRoom.roundTimer]);

  const timerColorClass = React.useMemo(() => {
    if (currentRoom.state !== MatchState.PLAYING && currentRoom.state !== MatchState.SUBMITTED_WAITING) {
      return 'text-white border-neutral-900 bg-neutral-950';
    }
    if (timeLeftSecs <= 20) {
      return 'text-rose-500 border-rose-900/40 bg-rose-950/20 animate-pulse';
    }
    if (timeLeftSecs <= 60) {
      return 'text-amber-400 border-amber-900/40 bg-amber-950/20';
    }
    return 'text-white border-neutral-900 bg-neutral-950';
  }, [timeLeftSecs, currentRoom.state]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a] text-neutral-200 relative select-none font-sans">
      {/* Anti-cheat overlay */}
      <AnimatePresence>
        {cheatWarning && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center space-x-3 border border-neutral-800 text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="uppercase tracking-wider">{cheatWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleek Vercel HUD Header */}
      <div className="h-16 flex items-center justify-between px-6 bg-[#000000] border-b border-neutral-900 backdrop-blur-xl relative z-40">
        {/* Left HUD: Current Player Profile */}
        <div className="flex items-center space-x-4 w-1/3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center relative">
              <span className="text-xs font-semibold text-neutral-450 font-mono">
                {user?.username.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[#000000]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white tracking-tight leading-none font-bold">
                {user?.username}
              </span>
              <span className="text-[10px] text-neutral-555 font-mono font-medium mt-1">
                {user?.rating} CP
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-neutral-900" />
          <div className="flex items-center space-x-2 bg-neutral-900/40 px-2 py-1 rounded border border-neutral-900">
            <Sword className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
              QUICKODE
            </span>
          </div>
        </div>

        {/* Center: Live Round Timer */}
        <div className="flex flex-col items-center">
          <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest font-black mb-1">
            SPEED DUEL
          </div>
          <div className={`text-2xl font-black font-mono tracking-wider px-4 py-1 rounded-lg border transition-colors ${timerColorClass}`}>
            {timeLeftStr}
          </div>
        </div>

        {/* Right HUD: Opponents */}
        <div className="flex items-center justify-end space-x-4 w-1/3">
          {activeOpponents.map((opp) => (
            <div key={opp.id} className="flex items-center space-x-3 text-right">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white tracking-tight leading-none font-bold">
                  {opp.username}
                </span>
                <span className="text-[10px] text-neutral-555 font-mono font-medium mt-1">
                  {opp.rating} CP
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center relative">
                <span className="text-xs font-semibold text-neutral-450 font-mono">
                  {opp.username.charAt(0).toUpperCase()}
                </span>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#000000] ${
                  opp.connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />
              </div>
            </div>
          ))}
          <div className="h-6 w-px bg-neutral-900" />
          <button
            onClick={handleLeaveRoom}
            className="p-2 hover:bg-neutral-900 rounded-lg text-neutral-500 hover:text-white transition-colors"
            title="Leave Sector"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Duel Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Mission Details */}
        <div className="w-72 flex flex-col bg-[#050505] border-r border-neutral-900">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide text-xs">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-neutral-500 uppercase tracking-widest text-[9px] font-bold">
                <Target className="w-3.5 h-3.5" />
                <span>TASK DETAILS</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {activeProblem?.title || 'Algorithmic Challenge'}
              </h2>
              <div className="text-neutral-400 leading-relaxed space-y-3 font-medium font-sans">
                {activeProblem?.description ? (
                  <div 
                    className="space-y-3 prose prose-invert max-w-none text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: activeProblem.description }}
                  />
                ) : (
                  <p>Implement the optimal solution for the problem specification.</p>
                )}
                <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg space-y-1.5 font-mono text-[10px]">
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block font-sans">
                    CONSTRAINTS
                  </span>
                  <p className="text-neutral-400">
                    • Time Limit: {activeProblem?.timeLimit || 2000}ms
                  </p>
                  <p className="text-neutral-400">
                    • Memory Limit: {activeProblem?.memoryLimit || 256}MB
                  </p>
                  <p className="text-neutral-500 italic">
                    • Optimal complexity required for full score.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-900 space-y-3">
              <div className="flex items-center justify-between text-neutral-500 uppercase tracking-widest text-[9px] font-bold">
                <span className="flex items-center space-x-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>ARENA STATE</span>
                </span>
                <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>

              <div className="space-y-2">
                {sortedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                      player.id === user?.id
                        ? 'bg-neutral-900/30 border-neutral-800'
                        : 'bg-transparent border-neutral-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded bg-neutral-900 border border-neutral-805 flex items-center justify-center font-mono text-[10px] text-neutral-450 font-bold">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-neutral-205">
                          {player.username}
                        </span>
                        <span className="text-[9px] text-neutral-550">
                          {player.id === user?.id ? 'System Host' : 'Competitor'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.isOwner && (
                        <span className="text-[9px] font-bold text-neutral-600">HOST</span>
                      )}
                      {player.isReady || player.isOwner ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-neutral-800" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-neutral-900">
            <div className="bg-[#000000] border border-neutral-900 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-1">
                  SECTOR
                </span>
                <span className="text-xs font-mono font-medium text-neutral-305">
                  {currentRoom.id.split('-')[0]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Code Terminal Arena */}
        <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
          {/* Editor Header */}
          <div className="h-10 bg-[#000000] border-b border-neutral-900 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-white border-b-2 border-white pb-2.5 pt-2 text-xs font-medium">
                <Code2 className="w-3.5 h-3.5" />
                <span className="font-mono">main.py</span>
              </div>
              <div className="text-[10px] text-neutral-600 font-medium font-mono uppercase tracking-wider">
                PYTHON 3
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunCode}
                disabled={isRunningCode || isJudging || !isPlaying}
                className="flex items-center space-x-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-850 hover:text-white disabled:opacity-30 text-neutral-350 text-[10px] font-bold uppercase rounded border border-neutral-800 transition-all active:scale-95"
              >
                {isRunningCode ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-neutral-450" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current" />
                )}
                <span>Run</span>
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={isRunningCode || isJudging || !isPlaying}
                className="flex items-center space-x-1.5 px-4 py-1 bg-white hover:bg-neutral-100 text-black text-[10px] font-bold uppercase rounded transition-all active:scale-95 disabled:opacity-30 relative overflow-hidden"
              >
                {isJudging ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Zap className="w-2.5 h-2.5 fill-current" />
                )}
                <span>Deploy</span>
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 relative border-b border-neutral-900">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20, bottom: 20 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                fontLigatures: true,
                readOnly: !isPlaying,
              }}
            />
          </div>

          {/* Console Output Terminal */}
          <div className="h-52 bg-[#000000] border-t border-neutral-900 flex flex-col font-mono">
            <div className="h-9 px-6 border-b border-neutral-900 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-neutral-400">
                <Terminal className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-widest font-black">
                  CONSOLE OUTPUT
                </span>
              </div>
              <span className="text-[9px] text-neutral-600 uppercase font-bold tracking-wider">
                {isRunningCode ? 'Executing Dry Run...' : isJudging ? 'Judging Submission...' : 'STDOUT STREAMS'}
              </span>
            </div>

            <div className="flex-1 p-5 font-mono text-xs overflow-y-auto space-y-3">
              {isRunningCode ? (
                <div className="space-y-3 max-w-sm">
                  <div className="flex items-center space-x-2 text-neutral-450">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                    <span className="text-[10px] font-semibold animate-pulse uppercase tracking-wide">
                      Running program in evaluation sandbox...
                    </span>
                  </div>
                </div>
              ) : isJudging ? (
                <div className="space-y-3 max-w-sm">
                  <div className="flex items-center space-x-2 text-neutral-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[10px] font-semibold animate-pulse uppercase">
                      JUDGING SUBMISSION INSTANCE...
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="bg-neutral-400 h-full"
                    />
                  </div>
                </div>
              ) : dryRunResult ? (
                <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                    <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider font-sans">Dry Run Console</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider font-sans ${
                      dryRunResult.success && dryRunResult.exitCode === 0 ? 'text-emerald-500' : 'text-rose-500'
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
                          <pre className="bg-[#050505] border border-neutral-900/50 rounded-lg p-3 text-rose-500 overflow-x-auto whitespace-pre font-mono">
                            {dryRunResult.stderr}
                          </pre>
                        </div>
                      )}
                      {!dryRunResult.stdout && !dryRunResult.stderr && (
                        <div className="text-neutral-500 italic">No output produced.</div>
                      )}
                      <div className="text-[9px] text-neutral-500 flex items-center gap-3 mt-1.5 pt-1.5 border-t border-neutral-950 font-sans">
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
                    <span className="text-neutral-505 text-[10px] font-bold">METRICS SUMMARY</span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        lastJudgeResult.overallStatus === 'passed'
                          ? 'text-emerald-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {lastJudgeResult.overallStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] text-neutral-450 bg-neutral-950 p-2.5 rounded border border-neutral-900">
                    <div>
                      Score:{' '}
                      <span className="text-neutral-200 font-bold">
                        {lastJudgeResult.totalScore}/{lastJudgeResult.maxScore}
                      </span>
                    </div>
                    <div className="text-right">
                      Status:{' '}
                      <span
                        className={
                          lastJudgeResult.overallStatus === 'passed'
                            ? 'text-emerald-500 font-bold'
                            : 'text-rose-500 font-bold'
                        }
                      >
                        {lastJudgeResult.overallStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="space-y-1">
                      {lastJudgeResult.testResults.map((test: any, index: number) => (
                        <div
                          key={test.testCaseId}
                          className="flex items-center justify-between bg-neutral-950/40 px-2 py-1 rounded border border-neutral-900 text-[11px]"
                        >
                          <span className="text-neutral-500">Test Case #{index + 1}</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-[10px] text-neutral-600">
                              {test.executionTimeMs}ms
                            </span>
                            <span
                              className={`font-semibold uppercase text-[10px] ${
                                test.status === 'passed' ? 'text-emerald-500' : 'text-rose-500'
                              }`}
                            >
                              {test.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-neutral-600 text-xs">
                  <p>{'>'} System ready. Awaiting local code deployment protocol...</p>
                </div>
              )}
            </div>
          </div>

          {/* Overlays */}

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
                    className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-800"
                  >
                    <Sword className="w-6 h-6 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white tracking-tight uppercase mb-2">
                    QUICK DUEL READY
                  </h2>
                  <p className="text-neutral-500 text-xs mb-8">
                    Ready up for speed compilation. Duel will start once both participants signal
                    readiness.
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
                        <span>{allReady ? 'Start Duel' : 'Awaiting Opponent'}</span>
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
                  <span className="text-xs font-semibold text-neutral-505 uppercase tracking-[0.3em] mt-2">
                    STARTING DUEL
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
                className="absolute inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-12 overflow-hidden"
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
                >
                  <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-800">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>

                  <h2 className="text-2xl font-bold text-white uppercase mb-2">DUEL CONCLUDED</h2>

                  <p className="text-neutral-500 text-xs mb-8">
                    Results processed. Match configuration finalized.
                  </p>

                  <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    <div className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-850 text-left">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">
                        OUTCOME
                      </span>
                      <p className="text-lg font-bold text-white mt-1">SUCCESS</p>
                      <p className="text-[10px] text-emerald-500 mt-1 font-semibold">
                        {currentRoom.ruleSet === 'CASUAL' ? 'CP UNAFFECTED' : '+24 CP ACCRUED'}
                      </p>
                    </div>
                    <div className="bg-neutral-900/30 p-4 rounded-xl border border-neutral-850 text-left">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">
                        ACCURACY
                      </span>
                      <p className="text-lg font-bold text-white mt-1">100% OK</p>
                      <p className="text-[10px] text-neutral-450 mt-1 font-semibold">
                        VERIFICATION PASSED
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => (window.location.href = '/')}
                    className="w-full py-3 bg-white text-black font-semibold uppercase tracking-wider text-xs rounded-lg transition-all border border-transparent hover:bg-neutral-100"
                  >
                    Return to Center
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
