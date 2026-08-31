import { useEffect, useState, useMemo } from 'react';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Terminal } from 'lucide-react';

export const WaitingResults = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState(180);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const currentRound = useMemo(() => {
    if (!currentRoom) return null;
    const currentRoundIndex = currentRoom.currentRound || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds.length : 1);
    return currentRoom.rounds?.find((r) => r.roundIndex === currentRoundIndex) || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds[currentRoom.rounds.length - 1] : null);
  }, [currentRoom]);

  // Sync remaining time
  useEffect(() => {
    if (!currentRound?.startedAt) return;

    const duration = currentRound.duration || 120;
    const updateTimer = () => {
      const start = new Date(currentRound.startedAt!).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setTimeLeft(Math.max(0, duration - elapsed));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [currentRound]);

  const formattedTimeLeft = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, [timeLeft]);

  const stats = useMemo(() => {
    if (!currentRoom || !currentRound) {
      return { finishedCount: 0, totalCount: 0, stillCodingCount: 0 };
    }

    const totalCount = currentRoom.players.length;
    let finishedCount = 0;

    if (currentRound.submissions) {
      finishedCount = Object.values(currentRound.submissions).filter(
        (sub) => sub.submittedAt
      ).length;
    }

    const stillCodingCount = Math.max(0, totalCount - finishedCount);

    return { finishedCount, totalCount, stillCodingCount };
  }, [currentRoom, currentRound]);

  const logSteps = useMemo(() => [
    'CONNECTING TO CENTRAL JUDGING NODE...',
    'TRANSMITTING SOURCE FILE (PYTHON 3.10)...',
    'PARSING ABSTRACT SYNTAX TREE...',
    'INITIATING SANDBOX CONTAINER ENVIRONMENT...',
    'RUNNING PRE-COMPILATION SAFETY CHECKS...',
    'COMPILATION COMPLETED. ZERO SYNTAX ERRORS DETECTED.',
    'EXECUTING TEST CASE MATRIX...',
    'TEST CASE 1/5: ACCEPTED (45ms)',
    'TEST CASE 2/5: ACCEPTED (32ms)',
    'TEST CASE 3/5: ACCEPTED (60ms)',
    'TEST CASE 4/5: ACCEPTED (38ms)',
    'TEST CASE 5/5: ACCEPTED (51ms)',
    'TELEMETRY TRANSMITTED SUCCESSFULLY. OUTCOME: SUCCESS.',
    'AWAITING OTHER COMBATANTS TO FINISH DIRECTIVES...'
  ], []);

  useEffect(() => {
    let currentStep = 0;
    setTerminalLogs([logSteps[0]]);
    
    const interval = setInterval(() => {
      if (currentStep < logSteps.length - 1) {
        currentStep++;
        setTerminalLogs(prev => [...prev, logSteps[currentStep]].slice(-6)); // Show last 6 lines
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [logSteps]);

  if (!currentRoom || !currentRound) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-white min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs block">
            Awaiting Round Data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 bg-black text-neutral-200 min-h-screen relative overflow-hidden select-none">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl p-8 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl relative z-10 text-center"
      >
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center relative shadow-lg">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
          Awaiting Combatants
        </h2>
        <p className="text-xs text-neutral-500 mb-8 max-w-md mx-auto leading-relaxed">
          Your solution has been securely compiled. Maintain position while remaining operatives conclude their directives.
        </p>

        {/* Terminal Simulation */}
        <div className="w-full bg-black border border-zinc-900 rounded-xl overflow-hidden mb-6 text-left shadow-inner">
          <div className="bg-zinc-900/50 border-b border-zinc-900/80 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[9px] font-mono text-zinc-650 uppercase tracking-widest font-bold flex items-center gap-1">
              <Terminal className="w-3 h-3" /> judge@code-duel: ~
            </span>
          </div>
          <div className="p-4 font-mono text-[10px] text-zinc-400 space-y-1.5 min-h-[140px] leading-relaxed">
            {terminalLogs.map((log, index) => {
              const isSuccess = log.includes('SUCCESS') || log.includes('ACCEPTED') || log.includes('COMPLETED');
              const isHeader = log.includes('CONNECTING') || log.includes('TRANSMITTING');
              return (
                <div key={index} className="flex items-start">
                  <span className="text-zinc-600 mr-2 select-none">$</span>
                  <span className={isSuccess ? 'text-emerald-400' : isHeader ? 'text-indigo-400' : 'text-zinc-400'}>
                    {log}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center">
              <span className="text-zinc-600 mr-2 select-none">$</span>
              <span className="w-2 h-3.5 bg-indigo-500 animate-pulse ml-0.5" />
            </div>
          </div>
        </div>

        {/* Timer & Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-black border border-zinc-900 rounded-xl p-3.5 text-center">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Time Left
            </span>
            <span className="font-mono font-bold text-lg text-white">
              {formattedTimeLeft}
            </span>
          </div>
          <div className="bg-black border border-zinc-900 rounded-xl p-3.5 text-center">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              Submitted
            </span>
            <span className="font-mono font-bold text-lg text-emerald-400">
              {stats.finishedCount} / {stats.totalCount}
            </span>
          </div>
          <div className="bg-black border border-zinc-900 rounded-xl p-3.5 text-center">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
              In Progress
            </span>
            <span className="font-mono font-bold text-lg text-amber-500">
              {stats.stillCodingCount}
            </span>
          </div>
        </div>

        {/* Telemetry List */}
        <div className="border-t border-zinc-900 pt-5 text-left">
          <span className="text-[9px] font-bold tracking-widest text-zinc-550 uppercase block mb-3.5 font-mono">
            Submission Telemetry
          </span>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {currentRoom.players.map((player) => {
              const hasPlayerSubmitted = !!currentRound.submissions?.[player.id]?.submittedAt;
              const isMe = player.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    hasPlayerSubmitted
                      ? 'bg-zinc-950/40 border-emerald-950/40 text-neutral-300'
                      : 'bg-zinc-950/20 border-zinc-900 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border font-mono font-bold text-xs ${
                      hasPlayerSubmitted
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}>
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">
                          {player.username}
                        </span>
                        {isMe && (
                          <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-mono font-bold border border-indigo-500/20">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-555 block mt-0.5">
                        {player.rating} CP
                      </span>
                    </div>
                  </div>

                  <div>
                    {hasPlayerSubmitted ? (
                      <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-[9px] font-mono font-bold border border-emerald-500/20 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Secured</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-neutral-400 bg-zinc-900 px-2 py-1 rounded text-[9px] font-mono font-bold border border-zinc-800 uppercase">
                        <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
                        <span>Compiling</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
