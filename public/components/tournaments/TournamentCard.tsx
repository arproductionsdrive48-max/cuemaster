import { Tournament } from '@/types';
import { MapPin, MoreVertical, Share2, UserPlus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import default tournament images
import tournamentBg1 from '@/assets/tournament-bg-1.jpg';
import tournamentBg2 from '@/assets/tournament-bg-2.jpg';
import tournamentBg3 from '@/assets/tournament-bg-3.jpg';

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
  onRegister: () => void;
  onShare: () => void;
  style?: React.CSSProperties;
}

const defaultImages = [tournamentBg1, tournamentBg2, tournamentBg3];

const TournamentCard = ({ tournament, onClick, onRegister, onShare, style }: TournamentCardProps) => {
  const progressPercent = (tournament.registeredPlayers.length / tournament.maxPlayers) * 100;
  const spotsLeft = tournament.maxPlayers - tournament.registeredPlayers.length;
  
  // Get image - use tournament image or cycle through defaults based on ID
  const getImage = () => {
    if (tournament.image) return tournament.image;
    const index = parseInt(tournament.id) % defaultImages.length;
    return defaultImages[index];
  };

  const typeColors = {
    'Snooker': 'bg-emerald-500/80 text-white',
    '8-Ball': 'bg-blue-500/80 text-white',
    '9-Ball': 'bg-yellow-500/80 text-black'
  };

  const statusColors = {
    'upcoming': 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]',
    'in_progress': 'bg-live/20 text-live',
    'completed': 'bg-muted text-muted-foreground'
  };

  return (
    <div 
      className="glass-card overflow-hidden animate-fade-in-up"
      style={style}
    >
      {/* Header Image with Overlay */}
      <div 
        className="relative h-32 cursor-pointer overflow-hidden"
        onClick={onClick}
      >
        {/* Moody Table Background */}
        <img 
          src={getImage()} 
          alt={tournament.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* More Button */}
        <button 
          className="absolute top-3 right-3 p-2 rounded-full bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Badges */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1",
            "bg-background/80 backdrop-blur-sm"
          )}>
            <Calendar className="w-3 h-3" />
            {tournament.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          </span>
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-semibold",
            typeColors[tournament.type]
          )}>
            {tournament.type}
          </span>
          {tournament.status === 'in_progress' && (
            <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1", statusColors.in_progress)}>
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4" onClick={onClick}>
        <h3 className="font-bold text-lg mb-1 cursor-pointer">{tournament.name}</h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {tournament.location}
        </div>

        {/* Entry Fee */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Entry Fee</span>
          <span className="text-xl font-bold text-[hsl(var(--gold))]">₹{tournament.entryFee.toLocaleString()}</span>
        </div>

        {/* Registration Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Registration Status</span>
            <span className={cn(
              "font-medium",
              spotsLeft === 0 ? "text-paused" : spotsLeft <= 5 ? "text-[hsl(var(--gold))]" : "text-foreground"
            )}>
              {spotsLeft === 0 
                ? 'Full' 
                : `${tournament.registeredPlayers.length}/${tournament.maxPlayers} Spots`
              }
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressPercent >= 90 ? "bg-paused" : 
                progressPercent >= 70 ? "bg-[hsl(var(--gold))]" : 
                "bg-available"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onRegister(); }}
            disabled={spotsLeft === 0}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
              spotsLeft === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] hover:opacity-90 active:scale-[0.98]"
            )}
          >
            <UserPlus className="w-4 h-4" />
            Register Player
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentCard;
