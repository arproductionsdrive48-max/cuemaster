import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitlistButtonProps {
  onJoinWaitlist: () => void;
  disabled?: boolean;
}

const WaitlistButton: React.FC<WaitlistButtonProps> = ({ onJoinWaitlist, disabled }) => {
  return (
    <button
      onClick={onJoinWaitlist}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all",
        "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30",
        disabled && "opacity-50 cursor-not-allowed grayscale"
      )}
    >
      <Clock className="w-5 h-5" />
      Join Waitlist (Slot Full)
    </button>
  );
};

export default WaitlistButton;
