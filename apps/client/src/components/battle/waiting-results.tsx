import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, RefreshCw, Keyboard } from 'lucide-react';
import { clsx } from 'clsx';

const TYPING_SNIPPETS = [
  'def solve(arr): return [x for x in arr if x > 0]',
  'mid = left + (right - left) // 2',
  'heapq.heappush(pq, (distance, next_node))',
  'dp = [[0] * (m + 1) for _ in range(n + 1)]',
  'queue = collections.deque([(start_node, 0)])',
  'return max(dp[i][0], dp[i][1])',
  'visited.add((curr_x, curr_y))',
  'freq = Counter(nums).most_common(k)',
  'class TreeNode: def __init__(self, val=0, left=None, right=None): self.val = val',
  'while left <= right and target != nums[mid]: pass',
];

export const WaitingResults = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState(180);

  // Speed Typer mini-game states
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [typedInput, setTypedInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSnippet = TYPING_SNIPPETS[snippetIndex % TYPING_SNIPPETS.length];

  const currentRound = useMemo(() => {
    if (!currentRoom) return null;
    const currentRoundIndex = currentRoom.currentRound || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds.length : 1);
    return currentRoom.rounds?.find((r) => r.roundIndex === currentRoundIndex) || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds[currentRoom.rounds.length - 1] : null);
  }, [currentRoom]);

  // Sync remaining round time
  useEffect(() => {
    if (!currentRound) return;

    const duration = currentRound.duration || 180;
    const startedTime = currentRound.roundStartedAt || currentRound.startedAt || currentRoom?.matchStartAt;

    const updateTimer = () => {
      const now = Date.now();
      let end = 0;
      if (currentRound.roundEndsAt) {
        end = new Date(currentRound.roundEndsAt).getTime();
      } else if (startedTime) {
        end = new Date(startedTime).getTime() + duration * 1000;
      } else {
        end = now + duration * 1000;
      }

      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [currentRound, currentRoom?.matchStartAt]);

  const formattedTimeLeft = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  // Speed Typer handlers
  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!startTime) {
      setStartTime(Date.now());
    }

    setTypedInput(val);

    // Calculate live WPM
    if (startTime) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0.05) {
        const words = val.length / 5;
        setWpm(Math.round(words / elapsedMinutes));
      }
    }

    // Completed snippet
    if (val === currentSnippet) {
      setCompletedCount((prev) => prev + 1);
      setTypedInput('');
      setSnippetIndex((prev) => prev + 1);
      setStartTime(null);
    }
  };

  const handleNextSnippet = () => {
    setTypedInput('');
    setStartTime(null);
    setSnippetIndex((prev) => (prev + 1) % TYPING_SNIPPETS.length);
    inputRef.current?.focus();
  };

  if (!currentRoom || !currentRound) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-white min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs block font-mono">
            Awaiting Round Data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 bg-black text-neutral-200 min-h-screen relative overflow-y-auto select-none py-8 sm:py-12">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl p-4 sm:p-6 md:p-8 bg-zinc-950/95 border border-zinc-900 rounded-2xl shadow-2xl relative z-10 text-center backdrop-blur-xl"
      >
        {/* Header Icon & Status */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-widest">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Solution Submitted & Secured</span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-2">
          Waiting for Opponent
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed mb-6 font-medium">
          Your code has been compiled and evaluated. Stand by while your opponent completes their directive.
        </p>

        {/* Timer & Stats Banner */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <div className="bg-black/60 border border-zinc-900 rounded-xl p-2.5 sm:p-3 text-center">
            <span className="text-[8.5px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
              Remaining
            </span>
            <span className="font-mono font-black text-sm sm:text-xl text-indigo-400 flex items-center justify-center gap-1 sm:gap-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
              <span>{formattedTimeLeft}</span>
            </span>
          </div>
          <div className="bg-black/60 border border-zinc-900 rounded-xl p-2.5 sm:p-3 text-center">
            <span className="text-[8.5px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
              Submitted
            </span>
            <span className="font-mono font-black text-sm sm:text-xl text-emerald-400">
              {stats.finishedCount} / {stats.totalCount}
            </span>
          </div>
          <div className="bg-black/60 border border-zinc-900 rounded-xl p-2.5 sm:p-3 text-center">
            <span className="text-[8.5px] sm:text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
              Coding
            </span>
            <span className="font-mono font-black text-sm sm:text-xl text-amber-500">
              {stats.stillCodingCount}
            </span>
          </div>
        </div>

        {/* Combatants Live Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
          {currentRoom.players.map((player) => {
            const hasSubmitted = !!currentRound.submissions?.[player.id]?.submittedAt;
            const isMe = player.id === user?.id;

            return (
              <div
                key={player.id}
                className={clsx(
                  'p-3.5 rounded-xl border flex items-center justify-between transition-all',
                  hasSubmitted
                    ? 'bg-emerald-950/15 border-emerald-500/25 text-neutral-200'
                    : 'bg-zinc-900/40 border-zinc-800/90 text-neutral-400'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border',
                      hasSubmitted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    )}
                  >
                    {(player.username?.charAt(0) || 'P').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[110px]">
                        {player.username}
                      </span>
                      {isMe && (
                        <span className="bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded text-[7.5px] font-mono font-bold uppercase border border-indigo-500/20">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">
                      {player.rating} CP
                    </span>
                  </div>
                </div>

                <div>
                  {hasSubmitted ? (
                    <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-[8.5px] font-mono font-bold border border-emerald-500/20 uppercase">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Submitted</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded text-[8.5px] font-mono font-bold border border-amber-500/20 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span>Coding...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SPEED TYPER PASS-TIME MINI-GAME */}
        <div className="mt-6 border border-zinc-800/80 bg-black/60 rounded-xl p-3.5 sm:p-5 text-left relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-900">
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs font-bold">
              <Keyboard className="w-4 h-4" />
              <span>WARMUP: CODE SYNTAX SPEED TYPER</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <span className="text-zinc-500">
                Drills: <strong className="text-white">{completedCount}</strong>
              </span>
              {wpm > 0 && (
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {wpm} WPM
                </span>
              )}
              <button
                onClick={handleNextSnippet}
                className="text-zinc-500 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
                title="Skip Snippet"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="font-mono text-xs p-3.5 bg-zinc-950 rounded-lg border border-zinc-900 mb-3 overflow-x-auto select-none">
            {currentSnippet.split('').map((char, idx) => {
              let colorClass = 'text-zinc-600';
              if (idx < typedInput.length) {
                colorClass = typedInput[idx] === char ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/20';
              }
              const isCursor = idx === typedInput.length;

              return (
                <span key={idx} className={clsx(colorClass, isCursor && 'border-b-2 border-indigo-400 animate-pulse')}>
                  {char}
                </span>
              );
            })}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={typedInput}
            onChange={handleTypingChange}
            placeholder="Type the Python snippet above to test your speed..."
            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-600 outline-none transition-all"
            autoFocus
          />

          <p className="text-[9px] text-zinc-500 font-mono mt-2.5 flex items-center justify-between">
            <span>Pass the time sharpening your typing reflexes.</span>
            <span className="text-zinc-400">Press Esc or Tab to focus</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
