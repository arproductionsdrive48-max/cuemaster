import { useState, useEffect, useCallback } from 'react';

export const useTimer = (startTime: Date | null, isPaused: boolean, pausedDuration: number = 0) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || isPaused) return;

    const calculateElapsed = () => {
      const now = Date.now();
      const start = startTime.getTime();
      return now - start - pausedDuration;
    };

    setElapsed(calculateElapsed());

    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused, pausedDuration]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return { elapsed, formatted: formatTime(elapsed) };
};

export const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
