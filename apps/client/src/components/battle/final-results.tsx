import { useState, useMemo } from 'react';
import { useRoomStore } from '@/store/room-store';
import { useAuthStore } from '@/store/auth-store';
import { useSocket } from '@/hooks/use-socket';
import { useNavigate } from 'react-router-dom';
import { SocketEvents } from '@code-duel/shared';
import { motion } from 'framer-motion';
import { Trophy, LogOut, RefreshCw, Code2, Award, Zap, Cpu, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { GameMode } from '@code-duel/types';

export const FinalResults = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const socket = useSocket();
  const navigate = useNavigate();
  const [selectedUserCodeId, setSelectedUserCodeId] = useState<string | null>(null);

  const matchResult = currentRoom?.matchResult;

  const currentRound = useMemo(() => {
    if (!currentRoom) return null;
    const currentRoundIndex = currentRoom.currentRound ?? 0;
    return currentRoom.rounds?.find((r) => r.roundIndex === currentRoundIndex) || null;
  }, [currentRoom]);

  const winner = useMemo(() => {
    if (!currentRoom || !matchResult || matchResult.isDraw || !matchResult.winnerId) return null;
    return currentRoom.players.find((p) => p.id === matchResult.winnerId) || null;
  }, [currentRoom, matchResult]);

  const isMeWinner = matchResult?.winnerId === user?.id;

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
    return null;
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
          <p className="text-xs font-mono mt-2 text-indigo-400 tracking-wider">
            {winner ? `WINNER: ${winner.username}` : 'DRAW'}
          </p>
        </div>

        {/* Players results: limited max-width cards to prevent being zoomed-in */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
          {currentRoom.players.map((player) => {
            const playerResult = matchResult.playerResults[player.id];
            if (!playerResult) return null;

            const isPlayerWinner = matchResult.winnerId === player.id;
            const isMe = player.id === user?.id;
            const outcomeText = matchResult.isDraw ? 'DRAW' : (isPlayerWinner ? 'WINNER' : 'LOSER');
            const code = currentRound?.submissions?.[player.id]?.code || '';

            return (
              <div
                key={player.id}
                className={clsx(
                  "p-5 rounded-xl border transition-all duration-300 relative flex flex-col justify-between min-h-[360px]",
                  isPlayerWinner
                    ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                    : "bg-zinc-900/30 border-zinc-900"
                )}
              >
                {isPlayerWinner && (
                  <div className="absolute top-3.5 right-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest font-black flex items-center gap-1">
                    <Trophy className="w-2.5 h-2.5" /> Winner
                  </div>
                )}

                <div className="flex items-center space-x-3 mb-6 mt-2">
                  <div className={clsx(
                    "w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm",
                    isPlayerWinner 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  )}>
                    {player.username.charAt(0).toUpperCase()}
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
                    <p className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                      {player.rating} CP
                    </p>
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
                          Cumulative Score
                        </span>
                        <span className="font-bold text-indigo-400 font-mono">
                          {getCumulativeScore(player.id)?.toLocaleString() || 0} / {(currentRoom.totalRounds || 3) * 1000} PTS
                        </span>
                      </div>
                      
                      {currentRoom.roundResults && currentRoom.roundResults.length > 0 && (
                        <div className="bg-zinc-950/50 rounded-lg p-2.5 my-2 space-y-1.5 border border-zinc-900/60 text-[10px] font-mono">
                          <div className="text-zinc-500 uppercase tracking-widest text-[8px] font-bold pb-1 border-b border-zinc-900">
                            Rounds Score Breakdown
                          </div>
                          {currentRoom.roundResults.map((rr) => (
                            <div key={rr.roundIndex} className="flex justify-between items-center text-zinc-400">
                              <span>Round {rr.roundIndex}</span>
                              <span className="text-zinc-300 font-bold">{rr.scores[player.id] ?? 0} / 1000</span>
                            </div>
                          ))}
                        </div>
                      )}
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
