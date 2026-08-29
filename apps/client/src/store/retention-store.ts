import { create } from 'zustand';
import { DailyMission } from '@code-duel/types';

interface RetentionState {
  missions: DailyMission[];
  setMissions: (missions: DailyMission[]) => void;
  updateMission: (mission: DailyMission) => void;
}

export const useRetentionStore = create<RetentionState>((set) => ({
  missions: [],
  setMissions: (missions) => set({ missions }),
  updateMission: (updatedMission) =>
    set((state) => ({
      missions: state.missions.map((m) => (m.id === updatedMission.id ? updatedMission : m)),
    })),
}));
