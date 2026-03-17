import { Tournament } from '@/types';
import { MapPin, MoreVertical, Share2, UserPlus, Calendar, Clock, Trophy, PlayCircle, Eye, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Import default tournament images
import tournamentBg1 from '@/assets/tournament-bg-1.jpg';
import tournamentBg2 from '@/assets/tournament-bg-2.jpg';
import tournamentBg3 from '@/assets/tournament-bg-3.jpg';

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
  onRegister: () => void;
  onShare: () => void;
  onAction?: (action: 'edit' | 'delete' | 'view_brackets' | 'live_score' | 'register', e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

const defaultImages = [tournamentBg1, tournamentBg2, tournamentBg3];

const TournamentCard = ({ tournament, onClick, onRegister, onShare, onAction, style }: TournamentCardProps) => {
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

  const handleAction = (action: 'edit' | 'delete' | 'view_brackets' | 'live_score' | 'register', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) onAction(action, e);
  };

  return (
    <>
      {/* Mobile View */}
      <div 
        className="md:hidden flex flex-col rounded-2xl bg-[#121212] border border-white/5 overflow-hidden animate-fade-in-up"
        style={style}
      >
        {/* Header Image with Overlay */}
        <div 
          className="relative h-40 cursor-pointer overflow-hidden"
          onClick={onClick}
        >
          <img 
            src={getImage()} 
            alt={tournament.name}
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
          
          <button 
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors border border-white/10"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
            <span className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border backdrop-blur-md",
              "bg-black/50 border-white/10 text-white"
            )}>
              <Calendar className="w-3.5 h-3.5" />
              {tournament.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </span>
            <span className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold",
              typeColors[tournament.type]
            )}>
              {tournament.type}
            </span>
            {tournament.status === 'in_progress' && (
              <span className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5", statusColors.in_progress)}>
                <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3" onClick={onClick}>
          <div>
            <h3 className="font-extrabold text-xl mb-1 cursor-pointer text-white">{tournament.name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
              <MapPin className="w-4 h-4 text-[hsl(var(--gold))]" />
              {tournament.location}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-y border-white/5">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Entry Fee</span>
            <span className="text-xl font-extrabold text-[hsl(var(--gold))]">₹{tournament.entryFee.toLocaleString()}</span>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-500 font-bold uppercase tracking-wider">Registration Status</span>
              <span className={cn(
                "font-extrabold tracking-wide",
                spotsLeft === 0 ? "text-red-500" : spotsLeft <= 5 ? "text-[hsl(var(--gold))]" : "text-white"
              )}>
                {spotsLeft === 0 
                  ? 'FULL' 
                  : `${tournament.registeredPlayers.length}/${tournament.maxPlayers} SPOTS`
                }
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  progressPercent >= 100 ? "bg-red-500" : 
                  progressPercent >= 75 ? "bg-[hsl(var(--gold))]" : 
                  "bg-blue-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRegister(); }}
              disabled={spotsLeft === 0}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]",
                spotsLeft === 0
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-[hsl(var(--gold))] text-black shadow-lg shadow-[hsl(var(--gold))]/20 hover:scale-[1.02]"
              )}
            >
              <UserPlus className="w-4 h-4" />
              Register Player
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="p-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222] transition-colors border border-white/5 text-gray-300"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Professional CuePal Lineup Card */}
      <div 
        className={cn(
          "hidden md:flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden hover:scale-[1.01] hover:shadow-xl shadow-sm cursor-pointer group animate-fade-in-up",
          tournament.status === 'in_progress' ? 'bg-[#121212] border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/50' : 
          'bg-[#121212] border-white/5 hover:border-white/20'
        )}
        style={style}
        onClick={onClick}
      >
        {/* Dynamic Image Header */}
        <div className="relative h-56 w-full overflow-hidden">
          <img 
            src={getImage()} 
            alt={tournament.name}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-30 mix-blend-luminosity",
              tournament.status === 'completed' && "grayscale opacity-10"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
          
          <div className="absolute top-4 right-4 flex gap-2">
             <button 
                onClick={(e) => handleAction('edit', e)}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10"
                title="Edit Tournament"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => handleAction('delete', e)}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                title="Delete Tournament"
              >
                <Trash2 className="w-4 h-4" />
              </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
             <div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block",
                  typeColors[tournament.type]
                )}>
                  {tournament.type}
                </span>
                <h3 className="text-2xl font-black text-white drop-shadow-md tracking-tight leading-tight">{tournament.name}</h3>
             </div>
             
             {/* Status Badge */}
             {tournament.status === 'in_progress' ? (
                <div className="flex flex-row items-center justify-center px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span> LIVE NOW
                </div>
              ) : tournament.status === 'upcoming' ? (
                <div className="flex flex-row items-center justify-center px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" /> UPCOMING
                </div>
              ) : (
                <div className="flex flex-row items-center justify-center px-3 py-1.5 rounded-full bg-gray-500/20 border border-gray-500/40 text-gray-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  COMPLETED
                </div>
              )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
             <div>
               <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wide">Date</p>
               <div className="text-white font-semibold flex items-center gap-1.5">
                 <Calendar className="w-4 h-4 text-gray-400" />
                 {format(tournament.date, 'MMM d, yyyy')} {tournament.endDate && `- ${format(tournament.endDate, 'MMM d')}`}
               </div>
             </div>
             <div>
               <p className="text-gray-500 font-medium mb-1 text-xs uppercase tracking-wide">Entry Fee</p>
               <div className="text-[hsl(var(--gold))] font-bold text-lg flex items-center drop-shadow-[0_0_10px_rgba(255,215,0,0.1)]">
                 ₹{tournament.entryFee.toLocaleString()}
               </div>
             </div>
          </div>

          {/* Registrations Progress */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Registrations</span>
              <span className={cn(
                "font-bold",
                spotsLeft === 0 ? "text-red-400" : "text-white"
              )}>
                {spotsLeft === 0 
                  ? 'FULL MATCH' 
                  : `${tournament.registeredPlayers.length} / ${tournament.maxPlayers} PLAYERS`
                }
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  progressPercent >= 100 ? "bg-red-500" : 
                  progressPercent >= 75 ? "bg-[hsl(var(--gold))]" : 
                  "bg-blue-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Footer Matrix */}
        <div className="grid grid-cols-4 gap-px bg-white/5 border-t border-white/5 group relative overflow-hidden mt-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] duration-1000 transition-transform pointer-events-none" />
          
          <button onClick={(e) => handleAction('view_brackets', e)} title="View Brackets" className="p-3.5 flex items-center justify-center text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10 transition-colors bg-[#0B0B0B]">
            <Trophy className="w-5 h-5 mb-0.5" />
          </button>
          
          <button onClick={(e) => handleAction('live_score', e)} title="Live Scoring Overlay" className="p-3.5 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors border-l border-white/5 bg-[#0B0B0B]">
            <PlayCircle className="w-5 h-5 mb-0.5" />
          </button>
          
          <button onClick={(e) => handleAction('register', e)} title="Quick Register" disabled={spotsLeft === 0} className="p-3.5 flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors border-l border-white/5 bg-[#0B0B0B] disabled:opacity-30 disabled:hover:bg-transparent">
            <UserPlus className="w-5 h-5 mb-0.5" />
          </button>

          <button onClick={(e) => { e.stopPropagation(); onShare(); }} title="Share Link" className="p-3.5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors border-l border-white/5 bg-[#0B0B0B]">
            <Share2 className="w-5 h-5 mb-0.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default TournamentCard;
