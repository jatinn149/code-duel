import { useEffect } from 'react';
import { useRoomStore } from '@/store/room-store';

export const useCountdown = (targetTime: string | undefined) => {
  const { setCountdown } = useRoomStore();

  useEffect(() => {
    if (!targetTime) {
      setCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetTime).getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000));

      setCountdown(diff);

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, setCountdown]);
};
