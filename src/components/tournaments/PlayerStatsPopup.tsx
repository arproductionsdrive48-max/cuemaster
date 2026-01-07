import { X, Trophy, Target, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerStatsPopupProps {
  playerName: string;
  onClose: () => void;
}

// Mock player stats
const getPlayerStats = (name: string) => ({
  name,
  rank: Math.floor(Math.random() * 100) + 1,
  id: Math.floor(Math.random() * 900) + 100,
  tier: 'PRO',
  totalGames: Math.floor(Math.random() * 200) + 50,
  winRate: Math.floor(Math.random() * 30) + 60,
  highestBreak: Math.floor(Math.random() * 100) + 80,
  trophies: [
    { name: 'Winter Championship', date: 'December 2023' },
    { name: 'Club Masters Open', date: 'August 2023' },
    { name: 'Regional Qualifiers', date: 'June 2023' }
  ]
});

const PlayerStatsPopup = ({ playerName, onClose }: PlayerStatsPopupProps) => {
  const stats = getPlayerStats(playerName);

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
              {stats.tier}
            </span>
          </div>
          
          <h2 className="text-xl font-bold mb-1">{stats.name}</h2>
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-[hsl(var(--gold))]" />
              Rank #{stats.rank}
            </span>
            <span>•</span>
            <span>ID: {stats.id}</span>
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
              <p className="text-2xl font-bold">{stats.totalGames}</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-xs text-available mb-1">
                <Zap className="w-3.5 h-3.5" />
                WIN RATE
              </div>
              <p className="text-2xl font-bold text-available">{stats.winRate}%</p>
            </div>
          </div>

          <div className="glass-card p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="text-[hsl(var(--gold))]">★</span>
                HIGHEST BREAK
              </div>
              <p className="text-2xl font-bold">{stats.highestBreak}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[hsl(var(--gold))]" />
            </div>
          </div>
        </div>

        {/* Recent Trophies */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Recent Trophies</span>
            <button className="text-xs text-muted-foreground">View All</button>
          </div>
          <div className="space-y-2">
            {stats.trophies.map((trophy, index) => (
              <div key={index} className="glass-card p-3 flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  index === 0 ? "bg-[hsl(var(--gold))]/20" :
                  index === 1 ? "bg-silver/20" :
                  "bg-bronze/20"
                )}>
                  <Trophy className={cn(
                    "w-5 h-5",
                    index === 0 ? "text-[hsl(var(--gold))]" :
                    index === 1 ? "text-silver" :
                    "text-bronze"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{trophy.name}</p>
                  <p className="text-xs text-muted-foreground">{trophy.date}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPopup;
