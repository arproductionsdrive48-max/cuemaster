import { useState } from 'react';
import { TableSession } from '@/types';
import { X, Trophy, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';
import { toast } from 'sonner';

interface WinnerSelectionModalProps {
  table: TableSession;
  onClose: () => void;
  onConfirm: (winnersMap: Record<string, 'win' | 'loss' | 'draw'>) => void;
  onAddPlayer: () => void;
}

const WinnerSelectionModal = ({ table, onClose, onConfirm, onAddPlayer }: WinnerSelectionModalProps) => {
  const { members } = useMembers();
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);

  const noPlayers = table.players.length === 0;

  const handleConfirm = () => {
    if (noPlayers) return;
    if (!isDraw && !selectedWinner) {
      toast.error('Please select a winner or mark as draw');
      return;
    }

    const resultsMap: Record<string, 'win' | 'loss' | 'draw'> = {};
    table.players.forEach(player => {
      if (isDraw) {
        resultsMap[player] = 'draw';
      } else {
        resultsMap[player] = player === selectedWinner ? 'win' : 'loss';
      }
    });

    onConfirm(resultsMap);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-card rounded-t-3xl sm:rounded-3xl animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Select Winner</h2>
              <p className="text-xs text-muted-foreground">Table {table.tableNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {noPlayers ? (
            /* No players state */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold mb-1">No Players in Session</p>
              <p className="text-sm text-muted-foreground mb-5">Add at least one player to select a winner before ending the session.</p>
              <button
                onClick={onAddPlayer}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Add Player
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">Who won this session?</p>

              {/* Player selection */}
              <div className="space-y-2 mb-4">
                {table.players.map(player => {
                  const member = members.find(m => m.name === player);
                  const initials = member?.avatar ?? player.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={player}
                      onClick={() => { setSelectedWinner(player); setIsDraw(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left',
                        !isDraw && selectedWinner === player
                          ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10'
                          : 'border-transparent bg-secondary/50 hover:bg-secondary'
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <span className="font-medium flex-1">{player}</span>
                      {!isDraw && selectedWinner === player && (
                        <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Draw option */}
              <button
                onClick={() => { setIsDraw(!isDraw); setSelectedWinner(null); }}
                className={cn(
                  'w-full py-3 rounded-xl border-2 text-sm font-medium transition-all mb-5',
                  isDraw
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                🤝 Mark as Draw / No Winner
              </button>

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                disabled={!isDraw && !selectedWinner}
                className="w-full py-3.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Trophy className="w-4 h-4" />
                Confirm & Proceed to Payment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WinnerSelectionModal;
