'use client';

import { useEffect, useState } from 'react';

interface RunningTimerProps {
  startISO: string;
  onRefresh?: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export default function RunningTimer({ startISO, onRefresh }: RunningTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const startTime = new Date(startISO).getTime();

    const tick = () => {
      setElapsed(Date.now() - startTime);
    };

    tick(); // immediate
    const interval = setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
        onRefresh?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [startISO, onRefresh]);

  return (
    <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
      {formatElapsed(elapsed)}
    </span>
  );
}
