import { useTimer } from '@/hooks/useTimer';

interface LiveTimerProps {
  startTime: Date | null;
  isPaused: boolean;
  pausedDuration: number;
  className?: string;
}

const LiveTimer = ({ startTime, isPaused, pausedDuration, className }: LiveTimerProps) => {
  const { formatted } = useTimer(startTime, isPaused, pausedDuration);
  return <span className={className}>{formatted}</span>;
};

export default LiveTimer;
