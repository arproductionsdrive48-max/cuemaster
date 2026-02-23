import { X, Trophy, Target, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';

interface PlayerStatsPopupProps {
  playerName: string;
  tournamentTrophies?: string[];
  onClose: () => void;
}

const PlayerStatsPopup = ({ playerName, tournamentTrophies = [], onClose }: PlayerStatsPopupProps) => {
  const { matchHistory, tournaments } = useMembers();

  // Get real stats from match history
  const playerMatches = matchHistory.filter(m => m.players.some(p => p.name === playerName));
  const wins = playerMatches.filter(m => m.players.find(p => p.name === playerName)?.result === 'win').length;
  const total = playerMatches.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Collect trophies from all completed tournaments
  const allTournamentTrophies: { name: string; tournamentName: string }[] = [];
  tournaments.forEach(t => {
    if (t.trophies && t.trophies[playerName]) {
      t.trophies[playerName].forEach(trophy => {
        allTournamentTrophies.push({ name: trophy, tournamentName: t.name });
      });
    }
  });

  // Merge with passed trophies (for current tournament not yet saved)
  const allTrophies = [
    ...allTournamentTrophies,
    ...tournamentTrophies
      .filter(t => !allTournamentTrophies.some(at => at.name === t))
      .map(t => ({ name: t, tournamentName: 'Current Tournament' }))
  ];

  const visibleTrophies = allTrophies.slice(0, 3);
  const remainingCount = allTrophies.length - visibleTrophies.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-background rounded-3xl overflow-hidden animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent/30 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Player Avatar & Info */}
        <div className="pt-8 pb-6 px-6 text-center bg-gradient-to-b from-[hsl(var(--gold))]/10 to-transparent">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary to-background flex items-center justify-center text-3xl font-bold border-4 border-[hsl(var(--gold))]/30">
              {playerName.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] text-xs font-bold">
              PRO
            </span>
          </div>

          <h2 className="text-xl font-bold mb-1">{playerName}</h2>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-[hsl(var(--gold))]" />
              {allTrophies.length} Trophies
            </span>
            <span>•</span>
            <span>{total} Matches</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Target className="w-3.5 h-3.5" />
                TOTAL GAMES
              </div>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-available mb-1">
                <Zap className="w-3.5 h-3.5" />
                WIN RATE
              </div>
              <p className="text-2xl font-bold text-available">{winRate}%</p>
            </div>
          </div>

          <div className="glass-card p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="text-[hsl(var(--gold))]">★</span>
                WINS / LOSSES
              </div>
              <p className="text-2xl font-bold">{wins} <span className="text-primary text-lg">/ {total - wins}</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[hsl(var(--gold))]" />
            </div>
          </div>
        </div>

        {/* Trophies */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Tournament Trophies</span>
            {remainingCount > 0 && (
              <span className="text-xs text-muted-foreground">+{remainingCount} more</span>
            )}
          </div>
          {allTrophies.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No trophies yet</p>
          ) : (
            <div className="space-y-2">
              {visibleTrophies.map((trophy, index) => (
                <div key={index} className="glass-card p-3 flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    index === 0 ? "bg-[hsl(var(--gold))]/20" :
                    index === 1 ? "bg-secondary" :
                    "bg-secondary"
                  )}>
                    <Trophy className={cn(
                      "w-5 h-5",
                      index === 0 ? "text-[hsl(var(--gold))]" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{trophy.name}</p>
                    <p className="text-xs text-muted-foreground">{trophy.tournamentName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPopup;
