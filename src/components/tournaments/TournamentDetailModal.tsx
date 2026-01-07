import { useState } from 'react';
import { Tournament, TournamentMatch } from '@/types';
import { mockMatches } from '@/data/tournamentsData';
import PlayerStatsPopup from './PlayerStatsPopup';
import { 
  ArrowLeft, 
  MoreVertical, 
  Calendar, 
  Trophy, 
  Users,
  MapPin,
  Video,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentDetailModalProps {
  tournament: Tournament;
  onClose: () => void;
  onRegister: () => void;
}

type TabType = 'overview' | 'bracket' | 'leaderboard' | 'matches';

const TournamentDetailModal = ({ tournament, onClose, onRegister }: TournamentDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('matches');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  const matches = mockMatches.filter(m => m.tournamentId === tournament.id);
  const liveMatches = matches.filter(m => m.status === 'live');
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'matches', label: 'Matches' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-accent/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Manage Tournament
          </span>
          <button className="p-2 -mr-2 rounded-xl hover:bg-accent/30 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-64px)] pb-24">
        {/* Hero Section */}
        <div className="relative h-48 bg-gradient-to-br from-secondary via-background to-secondary">
          <div className="absolute inset-0 bg-[url('/snooker-table.png')] bg-cover bg-center opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2">
              {tournament.status === 'in_progress' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-live/20 text-live flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                  IN PROGRESS
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]">
                Pro Circuit
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {tournament.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {tournament.prizePool && (
                <span className="flex items-center gap-1 text-[hsl(var(--gold))]">
                  <Trophy className="w-4 h-4" />
                  ₹{tournament.prizePool.toLocaleString()} Prize Pool
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {tournament.registeredPlayers.length} Players
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === tab.id 
                    ? "text-[hsl(var(--gold))]" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--gold))]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground">{tournament.description}</p>
              </div>
              <div className="glass-card p-4">
                <h3 className="font-semibold mb-2">Location</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {tournament.location}
                </div>
              </div>
              <div className="glass-card p-4">
                <h3 className="font-semibold mb-2">Entry Fee</h3>
                <p className="text-2xl font-bold text-[hsl(var(--gold))]">₹{tournament.entryFee.toLocaleString()}</p>
              </div>
            </div>
          )}

          {activeTab === 'bracket' && (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Bracket visualization coming soon</p>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-2">
              {['Ronnie O.', 'Judd T.', 'Ding J.', 'Neil R.'].map((player, index) => (
                <button
                  key={player}
                  onClick={() => setSelectedPlayer(player)}
                  className="w-full glass-card p-3 flex items-center gap-3 hover:bg-accent/30 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                    index === 0 ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" :
                    index === 1 ? "bg-silver/20 text-silver" :
                    index === 2 ? "bg-bronze/20 text-bronze" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    #{index + 1}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{player}</p>
                    <p className="text-xs text-muted-foreground">{4 - index} Wins</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="space-y-4">
              {/* Live Now */}
              {liveMatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                    <span className="font-semibold text-sm">Live Now</span>
                    <span className="text-xs text-muted-foreground ml-auto">View All</span>
                  </div>
                  {liveMatches.map(match => (
                    <MatchCard 
                      key={match.id} 
                      match={match}
                      onPlayerClick={setSelectedPlayer}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming */}
              {scheduledMatches.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Upcoming</p>
                  {scheduledMatches.map(match => (
                    <MatchCard 
                      key={match.id} 
                      match={match}
                      onPlayerClick={setSelectedPlayer}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      {tournament.status !== 'completed' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50">
          <button
            onClick={onRegister}
            className="w-full py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Register Player
          </button>
        </div>
      )}

      {/* Player Stats Popup */}
      {selectedPlayer && (
        <PlayerStatsPopup
          playerName={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};

interface MatchCardProps {
  match: TournamentMatch;
  onPlayerClick: (name: string) => void;
}

const MatchCard = ({ match, onPlayerClick }: MatchCardProps) => {
  const isLive = match.status === 'live';
  
  return (
    <div className="glass-card p-4 mb-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-live font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
              TABLE {match.tableNumber}
            </span>
          ) : (
            `Today, ${match.scheduledTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
          )}
        </span>
        {isLive && <span className="bg-live/20 text-live px-2 py-0.5 rounded text-xs font-semibold">LIVE</span>}
        {!isLive && <span className="text-muted-foreground">TABLE {match.tableNumber}</span>}
      </div>

      <div className="flex items-center justify-between">
        <button 
          onClick={() => onPlayerClick(match.player1)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
            {match.player1.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="font-medium text-sm">{match.player1}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={cn("text-2xl font-bold", isLive && "text-foreground")}>{match.score1}</span>
          <div className="text-center">
            <span className="text-xs text-muted-foreground block">BEST OF {match.bestOf}</span>
          </div>
          <span className={cn("text-2xl font-bold", isLive && "text-foreground")}>{match.score2}</span>
        </div>

        <button 
          onClick={() => onPlayerClick(match.player2)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="font-medium text-sm">{match.player2}</span>
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
            {match.player2.split(' ').map(n => n[0]).join('')}
          </div>
        </button>
      </div>

      {isLive && (
        <div className="mt-4 flex gap-2">
          <button className="flex-1 py-2 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] text-sm font-semibold">
            ✏️ Update Score
          </button>
          <button className="p-2 rounded-xl bg-secondary/50">
            <Video className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isLive && match.status === 'scheduled' && (
        <button className="w-full mt-4 py-2 rounded-xl bg-secondary/50 text-sm font-medium hover:bg-secondary transition-colors">
          ▶ Start Match
        </button>
      )}
    </div>
  );
};

export default TournamentDetailModal;
