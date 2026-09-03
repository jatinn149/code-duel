import { useState, useMemo, useEffect } from 'react';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { useSocket } from '@/hooks/use-socket';
import { useNavigate } from 'react-router-dom';
import { SocketEvents, calculateCpRank } from '@code-duel/shared';
import { motion } from 'framer-motion';
import { Trophy, LogOut, RefreshCw, Code2, Award, Zap, Cpu, Terminal, AlertTriangle, ShieldAlert, TrendingUp, TrendingDown, Flame, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { GameMode } from '@code-duel/types';

function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const startTime = Date.now();
    const startVal = 0;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + (target - startVal) * ease));
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return count;
}

export const FinalResults = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const socket = useSocket();
  const navigate = useNavigate();
  const [selectedUserCodeId, setSelectedUserCodeId] = useState<string | null>(null);

  const matchResult = currentRoom?.matchResult;

  const currentRound = useMemo(() => {
    if (!currentRoom) return null;
    const currentRoundIndex = currentRoom.currentRound || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds.length : 1);
    return currentRoom.rounds?.find((r) => r.roundIndex === currentRoundIndex) || (currentRoom.rounds && currentRoom.rounds.length > 0 ? currentRoom.rounds[currentRoom.rounds.length - 1] : null);
  }, [currentRoom]);

  const winner = useMemo(() => {
    if (!currentRoom || !matchResult || matchResult.isDraw || !matchResult.winnerId) return null;
    return currentRoom.players.find((p) => p.id === matchResult.winnerId) || null;
  }, [currentRoom, matchResult]);

  const isMeWinner = matchResult?.winnerId === user?.id;

  const myResult = useMemo(() => {
    if (!matchResult || !user) return null;
    return matchResult.playerResults[user.id] || null;
  }, [matchResult, user]);

  const cpChange = myResult?.ratingChange ?? 0;
  const currentCp = myResult?.newRating ?? (user?.rating ? user.rating + cpChange : 0);
  const xpGained = myResult?.xpGain ?? (isMeWinner ? 100 : (matchResult?.isDraw ? 50 : 30));
  const newLevel = myResult?.newLevel ?? user?.level ?? 1;
  const newXp = myResult?.newXp ?? user?.xp ?? 0;
  const isLevelUp = newLevel > (user?.level ?? 1);

  const displayCpChange = useAnimatedCounter(cpChange, 1200);
  const displayXp = useAnimatedCounter(xpGained, 1200);

  useEffect(() => {
    if (!matchResult || !user || !myResult) return;
    if (myResult.newRating !== undefined || myResult.newXp !== undefined) {
      useAuthStore.getState().setUser({
        ...user,
        rating: myResult.newRating ?? user.rating,
        xp: myResult.newXp ?? user.xp,
        level: myResult.newLevel ?? user.level,
        streak: user.streak ? Math.max(1, user.streak) : 1,
      });
    }
  }, [matchResult, user, myResult]);

  const getCumulativeScore = (playerId: string) => {
    return currentRoom?.roundResults?.reduce((sum, res) => sum + (res.scores[playerId] || 0), 0) || 0;
  };

  const handleReturnToLobby = () => {
    if (!socket || !currentRoom) return;
    useRoomStore.getState().setHasExitedResults(true);
    socket.emit(SocketEvents.RETURN_TO_LOBBY);
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit(SocketEvents.LEAVE_ROOM);
    useRoomStore.getState().setRoom(null);
    useRoomStore.getState().setMatchSummary(null);
    navigate('/');
  };

  if (!currentRoom || !currentRound || !matchResult) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] text-white min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs block">
            Calculating Duel Results...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 bg-black text-neutral-200 min-h-screen relative overflow-y-auto select-none py-12">
      {/* Subtle top background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Results Container (Aligned with dashboard max-width) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl p-8 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mb-4 relative shadow-md">
            {isMeWinner ? (
              <>
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-2xl scale-125 animate-pulse" />
                <Trophy className="w-10 h-10 text-amber-500 relative z-10 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
              </>
            ) : (
              <Award className="w-10 h-10 text-zinc-400 relative z-10" />
            )}
          </div>

          <h2 className="text-3xl font-black tracking-widest text-white uppercase drop-shadow-md">
            {isMeWinner ? 'VICTORY ACHIEVED' : 'MATCH CONCLUDED'}
          </h2>

          <p className="text-zinc-400 text-sm max-w-md mx-auto font-medium">
            {matchResult?.isDraw
              ? 'Both players demonstrated equal proficiency in this challenge.'
              : isMeWinner
              ? 'Outstanding performance. Your solution and strategy surpassed your opponent.'
              : 'A competitive duel. Review performance analytics and refine your approach.'}
          </p>
        </div>

        {/* Animated Game Progression & Rating HUD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-8 p-5 bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/90 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-2xl"
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              Combat Rewards & Rating Delta
            </span>
            {isLevelUp && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider animate-pulse">
                🎉 LEVEL UP! LVL {newLevel}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CP Delta Card */}
            <div className={clsx(
              "p-4 rounded-xl border flex flex-col justify-between transition-all",
              cpChange > 0
                ? "bg-emerald-950/25 border-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                : cpChange < 0
                ? "bg-rose-950/25 border-rose-500/35 shadow-[0_0_20px_rgba(244,63,94,0.12)]"
                : "bg-zinc-900/50 border-zinc-800"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-semibold">Rating (CP)</span>
                {cpChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : cpChange < 0 ? (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                ) : (
                  <Zap className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className={clsx(
                  "text-3xl font-black font-mono tracking-tight",
                  cpChange > 0 ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                  cpChange < 0 ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                  "text-zinc-300"
                )}>
                  {displayCpChange > 0 ? `+${displayCpChange}` : displayCpChange} CP
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{currentCp} CP Total</span>
                <span className="text-amber-400/90 font-bold">{calculateCpRank(currentCp)}</span>
              </div>
            </div>

            {/* XP Progression Card */}
            <div className="p-4 rounded-xl border bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-semibold">Experience (XP)</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="my-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-cyan-400 tracking-tight drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  +{displayXp}
                </span>
                <span className="text-xs font-mono text-cyan-400/70 font-semibold">XP</span>
              </div>
              {/* Animated Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                  <span>Level {newLevel}</span>
                  <span>{newXp} / 100 XP</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(5, (newXp % 100)))}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Daily Streak Card */}
            <div className="p-4 rounded-xl border bg-amber-950/20 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-semibold">Daily Streak</span>
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div className="my-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-amber-400 tracking-tight drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                  {user?.streak ? Math.max(1, user.streak) : 1}
                </span>
                <span className="text-xs font-mono text-amber-400/70 font-semibold">Days</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                Active Streak Extended!
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 my-auto max-w-4xl mx-auto w-full">
          {currentRoom?.players.map((player) => {
            const isPlayerWinner = winner?.id === player.id;
            const isMe = player.id === user?.id;
            const playerResult = matchResult?.playerResults[player.id];
            const isDisqualified = playerResult?.outcome === 'DISQUALIFIED' || playerResult?.verdict === 'DISQUALIFIED';

            if (!playerResult) return null;

            const outcomeText = isDisqualified
              ? 'DISQUALIFIED'
              : matchResult?.isDraw
              ? 'DRAW'
              : isPlayerWinner
              ? 'WINNER'
              : 'LOSER';
            const code = currentRound?.submissions?.[player.id]?.code || '';

            return (
              <div
                key={player.id}
                className={clsx(
                  "relative rounded-2xl border p-5 md:p-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300",
                  isDisqualified
                    ? "bg-rose-950/20 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
                    : isPlayerWinner
                    ? "bg-zinc-950/80 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                    : "bg-zinc-950/40 border-zinc-800/80"
                )}
              >
                {isDisqualified ? (
                  <div className="absolute -top-3 right-6 bg-rose-600 text-white text-[9px] font-mono font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-rose-400/30 shadow-lg flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    ANTI-CHEAT FLAGGED
                  </div>
                ) : isPlayerWinner ? (
                  <div className="absolute -top-3 right-6 bg-amber-500 text-black text-[9px] font-mono font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-amber-300 shadow-lg">
                    Winner
                  </div>
                ) : null}

                <div className="flex items-center space-x-3 mb-6">
                  <div className={clsx(
                    "w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm",
                    isDisqualified
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : isPlayerWinner 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  )}>
                    {(player.username?.charAt(0) || 'P').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{player.username}</span>
                      {isMe && (
                        <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-mono font-bold border border-indigo-500/20">
                          YOU
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {playerResult.newRating ?? player.rating} CP
                      </span>
                      {playerResult.ratingChange !== undefined && playerResult.ratingChange !== 0 && (
                        <span className={clsx(
                          "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border",
                          playerResult.ratingChange > 0
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                        )}>
                          {playerResult.ratingChange > 0 ? `+${playerResult.ratingChange}` : playerResult.ratingChange} CP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6 flex-1 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Outcome
                    </span>
                    <span className={clsx(
                      "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase font-mono",
                      outcomeText === 'WINNER'
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : outcomeText === 'DRAW'
                        ? "bg-zinc-900 border-zinc-800 text-zinc-400"
                        : outcomeText === 'DISQUALIFIED'
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-550"
                    )}>
                      {outcomeText}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Verdict
                    </span>
                    <span className={clsx(
                      "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border uppercase font-mono",
                      playerResult.verdict === 'ACCEPTED'
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-550"
                    )}>
                      {playerResult.verdict}
                    </span>
                  </div>

                  {playerResult.disqualificationReason && (
                    <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-2.5 my-2 text-rose-300 font-mono text-[10px] space-y-1">
                      <div className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Disqualified for Anomaly
                      </div>
                      <div className="text-zinc-400 text-[9px] leading-relaxed">
                        {playerResult.disqualificationReason}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Test Cases
                    </span>
                    <span className="font-bold text-white font-mono">
                      {playerResult.passedCount} <span className="text-zinc-700">/</span> {playerResult.totalCount}
                    </span>
                  </div>

                  {currentRoom.gameMode === GameMode.MULTI_ROUND ? (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                          Total Tournament Score
                        </span>
                        <span className="font-bold text-indigo-400 font-mono text-sm">
                          {getCumulativeScore(player.id)?.toLocaleString() || 0} / {(currentRoom.totalRounds || 3) * 1000} PTS
                        </span>
                      </div>
                      
                      <div className="space-y-2 my-2.5">
                        <div className="text-zinc-500 uppercase tracking-widest text-[8.5px] font-bold font-mono">
                          Round-by-Round Breakdown
                        </div>
                        {((currentRoom.rounds && currentRoom.rounds.length > 0) ? currentRoom.rounds : (currentRoom.roundResults || []).map(rr => ({ roundIndex: rr.roundIndex, problem: { title: `Round ${rr.roundIndex}` }, submissions: {} } as any))).map((rnd: any) => {
                          const sub = rnd.submissions?.[player.id];
                          const rr = currentRoom.roundResults?.find(res => res.roundIndex === rnd.roundIndex);
                          const roundWinner = rr?.winner === player.id;
                          const roundScore = sub?.score ?? rr?.scores?.[player.id] ?? 0;
                          const testCasesPassed = sub?.testResults?.filter((t: any) => t.status === 'passed').length ?? (sub?.status === 'ACCEPTED' ? (rnd.problem?.testCases?.length || 1) : 0);
                          const totalTestCases = sub?.testResults?.length || (rnd.problem?.testCases?.length || 1);

                          return (
                            <div key={rnd.roundIndex} className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-900/80 space-y-2 text-[10px] font-mono">
                              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white uppercase">Round {rnd.roundIndex}</span>
                                  {roundWinner && (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded text-[8px] font-bold">
                                      WON
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-indigo-400">{roundScore} / 1000 PTS</span>
                              </div>
                              <div className="text-[9px] text-zinc-400 font-sans truncate font-medium">
                                {rnd.problem?.title || `Problem ${rnd.roundIndex}`}
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[9px] text-zinc-400">
                                <div className="bg-zinc-900/50 p-1.5 rounded border border-zinc-900 flex flex-col items-center">
                                  <span className="text-zinc-500 text-[8px]">Correct</span>
                                  <span className="text-zinc-200 font-bold">{sub?.correctnessScore ?? (sub?.status === 'ACCEPTED' ? 800 : 0)}/800</span>
                                </div>
                                <div className="bg-zinc-900/50 p-1.5 rounded border border-zinc-900 flex flex-col items-center">
                                  <span className="text-zinc-500 text-[8px]">Efficiency</span>
                                  <span className="text-zinc-200 font-bold">{sub?.efficiencyScore ?? 0}/120</span>
                                </div>
                                <div className="bg-zinc-900/50 p-1.5 rounded border border-zinc-900 flex flex-col items-center">
                                  <span className="text-zinc-500 text-[8px]">Speed</span>
                                  <span className="text-zinc-200 font-bold">{sub?.speedScore ?? 0}/80</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-0.5">
                                <span>Tests: <strong className="text-zinc-300 font-mono">{testCasesPassed}/{totalTestCases}</strong></span>
                                <span>Runtime: <strong className="text-zinc-300 font-mono">{sub?.executionTimeMs ? `${sub.executionTimeMs}ms` : '--'}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                          Score
                        </span>
                        <span className="font-bold text-indigo-400 font-mono">
                          {playerResult.score?.toLocaleString() || 0} PTS
                        </span>
                      </div>

                      {playerResult.correctnessScore !== undefined && (
                        <div className="bg-zinc-950/50 rounded-lg p-2.5 my-2 space-y-1.5 border border-zinc-900/60 text-[10px] font-mono">
                          <div className="flex justify-between items-center text-zinc-500">
                            <span>Correctness</span>
                            <span className="text-zinc-300 font-bold">{playerResult.correctnessScore} / 800</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-500">
                            <span>Efficiency</span>
                            <span className="text-zinc-300 font-bold">{playerResult.efficiencyScore || 0} / 120</span>
                          </div>
                          <div className="flex justify-between items-center text-zinc-500">
                            <span>Solve Speed</span>
                            <span className="text-zinc-300 font-bold">{playerResult.speedScore || 0} / 80</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Runtime</span>
                    </span>
                    <span className="font-bold text-white font-mono">
                      {playerResult.executionTimeMs ? `${playerResult.executionTimeMs} ms` : '--'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Memory</span>
                    </span>
                    <span className="font-bold text-white font-mono">
                      {playerResult.memoryBytes ? `${(playerResult.memoryBytes / 1024).toFixed(1)} KB` : '--'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      Language
                    </span>
                    <span className="font-bold text-indigo-400 font-mono uppercase">
                      {playerResult.language || 'PYTHON'}
                    </span>
                  </div>
                </div>

                {code && (
                  <button
                    onClick={() => setSelectedUserCodeId(selectedUserCodeId === player.id ? null : player.id)}
                    className="w-full py-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 text-neutral-300 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-colors flex items-center justify-center space-x-1.5 mt-auto"
                  >
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedUserCodeId === player.id ? 'Hide Source' : 'View Source'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedUserCodeId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 overflow-hidden border border-zinc-900 bg-black rounded-xl"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 bg-zinc-950">
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider flex items-center space-x-2 uppercase font-mono">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  SOURCE CODE // {currentRoom.players.find(p => p.id === selectedUserCodeId)?.username}
                </span>
              </span>
            </div>
            <pre className="p-5 overflow-x-auto font-mono text-xs text-indigo-300 select-text max-h-[300px] custom-scrollbar bg-black leading-relaxed">
              <code>
                {currentRound.submissions?.[selectedUserCodeId]?.code || '# No code submitted'}
              </code>
            </pre>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 border-t border-zinc-900 pt-6">
          <button
            onClick={handleReturnToLobby}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-xs rounded-lg shadow-lg shadow-indigo-500/10 flex items-center justify-center space-x-2 transition-all"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>RETURN TO LOBBY</span>
          </button>
          <button
            onClick={handleLeaveRoom}
            className="sm:w-48 py-3 bg-zinc-900 hover:bg-red-950/20 text-neutral-450 hover:text-red-400 border border-zinc-800 hover:border-red-950/30 font-bold uppercase tracking-wider text-xs rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            <span>LEAVE ROOM</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
