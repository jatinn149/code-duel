import { create } from 'zustand';
import { Room, MatchState, JudgeResult, MatchSummary } from '@code-duel/types';

interface RoomState {
  currentRoom: Room | null;
  isLoading: boolean;
  error: string | null;
  transientError: string | null;
  latency: number;
  lastJudgeResult: JudgeResult | null;
  countdown: number | null;
  matchSummary: MatchSummary | null;
  hasExitedResults: boolean;
  dryRunResult: any | null;
  isRunningCode: boolean;

  setRoom: (room: Room | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTransientError: (error: string | null) => void;
  setLatency: (latency: number) => void;
  updateMatchState: (state: MatchState) => void;
  setJudgeResult: (result: JudgeResult | null) => void;
  setCountdown: (seconds: number | null) => void;
  setMatchSummary: (summary: MatchSummary | null) => void;
  setHasExitedResults: (val: boolean) => void;
  setDryRunResult: (result: any | null) => void;
  setIsRunningCode: (val: boolean) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  isLoading: false,
  error: null,
  transientError: null,
  latency: 0,
  lastJudgeResult: null,
  countdown: null,
  matchSummary: null,
  hasExitedResults: true,
  dryRunResult: null,
  isRunningCode: false,

  setRoom: (room) =>
    set((prev) => {
      let nextHasExited = prev.hasExitedResults;
      if (!room) {
        nextHasExited = true;
      } else if (room.id !== prev.currentRoom?.id) {
        nextHasExited = true;
      } else if (room.state === MatchState.PLAYING) {
        nextHasExited = false;
      }
      return {
        currentRoom: room,
        hasExitedResults: nextHasExited,
      };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setTransientError: (transientError) => set({ transientError }),
  setLatency: (latency) => set({ latency }),
  updateMatchState: (state) =>
    set((prev) => {
      const nextHasExited = state === MatchState.PLAYING ? false : prev.hasExitedResults;
      return {
        currentRoom: prev.currentRoom ? { ...prev.currentRoom, state } : null,
        hasExitedResults: nextHasExited,
      };
    }),
  setJudgeResult: (lastJudgeResult) => set({ lastJudgeResult }),
  setCountdown: (countdown) => set({ countdown }),
  setMatchSummary: (matchSummary) => set({ matchSummary }),
  setHasExitedResults: (hasExitedResults) => set({ hasExitedResults }),
  setDryRunResult: (dryRunResult) => set({ dryRunResult }),
  setIsRunningCode: (isRunningCode) => set({ isRunningCode }),
}));
