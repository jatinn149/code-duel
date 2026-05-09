import { create } from 'zustand';
import { Room, MatchState } from '@code-duel/types';

interface RoomState {
  currentRoom: Room | null;
  isLoading: boolean;
  error: string | null;
  latency: number;

  setRoom: (room: Room | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setLatency: (latency: number) => void;
  updateMatchState: (state: MatchState) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  isLoading: false,
  error: null,
  latency: 0,

  setRoom: (room) => set({ currentRoom: room }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setLatency: (latency) => set({ latency }),
  updateMatchState: (state) =>
    set((prev) => ({
      currentRoom: prev.currentRoom ? { ...prev.currentRoom, state } : null,
    })),
}));
