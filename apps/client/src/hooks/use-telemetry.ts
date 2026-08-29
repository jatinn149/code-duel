import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SocketEvents } from '@code-duel/shared';
import { TelemetryEvent } from '@code-duel/types';

export const useTelemetry = (socket: Socket | null, roomId: string | undefined) => {
  const eventsRef = useRef<TelemetryEvent[]>([]);
  const lastSyncRef = useRef<number>(Date.now());
  const totalKeystrokesRef = useRef<number>(0);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleKeyDown = () => {
      totalKeystrokesRef.current += 1;
      eventsRef.current.push({
        type: 'keystroke',
        timestamp: new Date().toISOString(),
      });
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      eventsRef.current.push({
        type: 'paste',
        timestamp: new Date().toISOString(),
        data: { length: text.length },
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        eventsRef.current.push({
          type: 'tab_switch',
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleBlur = () => {
      eventsRef.current.push({
        type: 'focus_loss',
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    const syncInterval = setInterval(() => {
      if (eventsRef.current.length > 0) {
        socket.emit(SocketEvents.TELEMETRY_SYNC, {
          roomId,
          events: eventsRef.current,
        });
        eventsRef.current = [];
        lastSyncRef.current = Date.now();
      }
    }, 5000); // Sync every 5 seconds

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      clearInterval(syncInterval);
    };
  }, [socket, roomId]);

  return {
    getKeystrokeCount: () => totalKeystrokesRef.current,
  };
};
