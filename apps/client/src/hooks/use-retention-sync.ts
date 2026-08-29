import { useEffect } from 'react';
import { useSocket } from './use-socket';
import { SocketEvents } from '@code-duel/shared';
import { useAuthStore } from '@/store/auth-store';
import { useRetentionStore } from '@/store/retention-store';
import { User, DailyMission } from '@code-duel/types';

export const useRetentionSync = () => {
  const socket = useSocket();
  const { setUser } = useAuthStore();
  const { setMissions, updateMission } = useRetentionStore();

  useEffect(() => {
    if (!socket) return;

    const handleDailySync = (data: { user: User; missions: DailyMission[] }) => {
      setUser(data.user);
      setMissions(data.missions);
    };

    const handleMissionUpdate = (data: { mission: DailyMission }) => {
      updateMission(data.mission);
    };

    socket.on(SocketEvents.DAILY_STATE_SYNC, handleDailySync);
    socket.on(SocketEvents.MISSION_UPDATE, handleMissionUpdate);

    return () => {
      socket.off(SocketEvents.DAILY_STATE_SYNC, handleDailySync);
      socket.off(SocketEvents.MISSION_UPDATE, handleMissionUpdate);
    };
  }, [socket, setUser, setMissions, updateMission]);
};
