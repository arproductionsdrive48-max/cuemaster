import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import { Tournament, TournamentType, Member, TournamentBracketMatch } from '@/types';
import TournamentCard from '@/components/tournaments/TournamentCard';
import TournamentDetailModal from '@/components/tournaments/TournamentDetailModal';
import CreateTournamentModal from '@/components/tournaments/CreateTournamentModal';
import RegisterPlayerModal from '@/components/tournaments/RegisterPlayerModal';
import BracketModal from '@/components/tournaments/BracketModal';
import LiveScoring from '@/components/tournaments/LiveScoring';
import ShareTournamentModal from '@/components/tournaments/ShareTournamentModal';
import { useMembers } from '@/contexts/MembersContext';
import { Search, Plus, Trophy, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCreateTournament as useSupabaseCreateTournament,
  useUpdateTournament as useSupabaseUpdateTournament,
} from '@/hooks/useSupabaseQuery';

type FilterType = 'all' | TournamentType | 'completed';

const EventsScreen = () => {
  const { tournaments, setTournaments, clubId, isOnline, updateMemberPoints, members, updateMember } = useMembers();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);
  const [viewingBracket, setViewingBracket] = useState<Tournament | null>(null);
  const [liveScoringTournament, setLiveScoringTournament] = useState<Tournament | null>(null);
  const [sharingTournament, setSharingTournament] = useState<Tournament | null>(null);

  const { mutate: sbCreate, isPending: isCreating } = useSupabaseCreateTournament(isOnline ? clubId : null);
  const { mutate: sbUpdate } = useSupabaseUpdateTournament(isOnline ? clubId : null);
  // Realtime invalidation handled globally by useRealtimeManager in MembersContext

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All Events' },
    { id: 'Snooker', label: 'Snooker' },
    { id: '8-Ball', label: '8-Ball' },
    { id: '9-Ball', label: '9-Ball' },
    { id: 'completed', label: 'Completed' },
  ];

  const filteredTournaments = tournaments.filter(t => {
    const matchesFilter = activeFilter === 'all'
      ? t.status !== 'completed'
      : activeFilter === 'completed'
        ? t.status === 'completed'
        : t.type === activeFilter && t.status !== 'completed';
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRegisterPlayers = (tournamentId: string, players: (Member | { name: string; phone: string })[]) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    if (tournament.registeredPlayers.length + players.length > tournament.maxPlayers) {
      toast.error(`Cannot register: Tournament has only ${tournament.maxPlayers - tournament.registeredPlayers.length} spots left`);
      return;
    }

    const playerNames = players.map(p => p.name);
    const updated: Tournament = { ...tournament, registeredPlayers: [...tournament.registeredPlayers, ...playerNames] };
    sbUpdate(updated, {
      onSuccess: () => toast.success(`${players.length} player${players.length > 1 ? 's' : ''} registered!`),
      onError: (err: any) => toast.error(err?.message || 'Failed to register players'),
    });
    setTournaments(prev => prev.map(t => t.id === tournamentId ? updated : t));
    setRegisteringTournament(null);
  };

  const handleCreateTournament = (tournament: Omit<Tournament, 'id' | 'registeredPlayers' | 'status'>) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbCreate(tournament, {
      onSuccess: () => toast.success('Tournament created successfully!'),
      onError: (err: any) => toast.error(err?.message || 'Failed to create tournament'),
    });
    setShowCreateModal(false);
  };

  const handleUpdateTournament = (updated: Tournament) => {
    if (!isOnline) { toast.error('Offline – changes will not save'); return; }
    sbUpdate(updated, {
      onError: (err: any) => toast.error(err?.message || 'Failed to update tournament'),
    });
    setTournaments(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (selectedTournament?.id === updated.id) setSelectedTournament(updated);
  };

  const generateBracket = (tournamentId: string) => {
    if (!isOnline) { toast.error('Offline'); return; }
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    const players = [...tournament.registeredPlayers];
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const byesRequired = nextPowerOf2 - players.length;
    
    const matches: TournamentBracketMatch[] = [];
    const numMatches = nextPowerOf2 / 2;
    const activePlayers = [...players];
    for (let i = 0; i < byesRequired; i++) activePlayers.push('Bye');
    
    let matchId = 1;
    for (let i = 0; i < numMatches; i++) {
      const p1 = activePlayers[i * 2];
      const p2 = activePlayers[i * 2 + 1];
      const isByeMatch = p1 === 'Bye' || p2 === 'Bye';
      matches.push({
        id: `${tournamentId}-m${matchId++}`,
        round: 0,
        matchNumber: i + 1,
        player1: p1,
        player2: p2,
        score1: 0,
        score2: 0,
        bestOf: 3,
        status: isByeMatch ? 'completed' : 'pending',
        winner: p1 === 'Bye' ? p2 : p2 === 'Bye' ? p1 : undefined
      });
    }
    
    let prevRoundMatches = numMatches;
    let roundIdx = 1;
    while (prevRoundMatches > 1) {
      const currRoundMatches = prevRoundMatches / 2;
      for (let i = 0; i < currRoundMatches; i++) {
        matches.push({
          id: `${tournamentId}-r${roundIdx}-m${matchId++}`,
          round: roundIdx,
          matchNumber: i + 1,
          player1: null,
          player2: null,
          score1: 0,
          score2: 0,
          bestOf: 3,
          status: 'pending'
        });
      }
      prevRoundMatches = currRoundMatches;
      roundIdx++;
    }
    
    const updated: Tournament = { ...tournament, bracket: { matches } };
    handleUpdateTournament(updated);
    if (viewingBracket?.id === tournament.id) setViewingBracket(updated);
    toast.success('Bracket generated successfully!');
  };

  const handleUpdateMatch = (tournamentId: string, matchId: string, updates: Partial<TournamentBracketMatch>) => {
    if (!isOnline) return;
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament || !tournament.bracket) return;
    
    const matches = [...tournament.bracket.matches];
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;
    
    const match = { ...matches[matchIndex], ...updates };
    matches[matchIndex] = match;
    
    // Auto-advance logic
    if (match.status === 'completed' && match.winner) {
      const nextRound = match.round + 1;
      const nextMatchNumber = Math.ceil(match.matchNumber / 2);
      const nextMatchIndex = matches.findIndex(m => m.round === nextRound && m.matchNumber === nextMatchNumber);
      
      if (nextMatchIndex !== -1) {
        const nextMatch = { ...matches[nextMatchIndex] };
        if (match.matchNumber % 2 !== 0) {
          nextMatch.player1 = match.winner;
        } else {
          nextMatch.player2 = match.winner;
        }
        matches[nextMatchIndex] = nextMatch;
      }
    }
    
    // — AWARD CPP POINTS —
    if (updates.status === 'completed' && updates.winner) {
      // Tournament Match Win: +20 win + 1 play = +21
      updateMemberPoints(updates.winner, 21);
      
      // Tournament Match Loss: +1 play
      const matchBeforeUpdates = tournament.bracket.matches[matchIndex];
      const loser = matchBeforeUpdates.player1 === updates.winner ? matchBeforeUpdates.player2 : matchBeforeUpdates.player1;
      if (loser && loser !== 'Bye') {
        updateMemberPoints(loser, 1);
      }

      const finalHighBreakPlayer = updates.highestBreakPlayer || matchBeforeUpdates.highestBreakPlayer;
      const finalHighBreakValue = updates.highestBreakValue || matchBeforeUpdates.highestBreakValue;
      if (finalHighBreakPlayer) {
        updateMemberPoints(finalHighBreakPlayer, 5);
        
        // Also update personal best if applicable
        const member = members.find(m => m.name === finalHighBreakPlayer);
        if (member && finalHighBreakValue && finalHighBreakValue > (member.highestBreak || 0)) {
          updateMember(member.id, { highestBreak: finalHighBreakValue });
        }
      }
    }
    
    const updated: Tournament = { ...tournament, bracket: { matches } };
    handleUpdateTournament(updated);
    if (viewingBracket?.id === tournament.id) setViewingBracket(updated);
    if (liveScoringTournament?.id === tournament.id) setLiveScoringTournament(updated);
  };

  const handleCardAction = (tournament: Tournament, action: 'edit' | 'delete' | 'view_brackets' | 'live_score' | 'register') => {
    switch (action) {
      case 'edit':
        setSelectedTournament(tournament);
        break;
      case 'delete':
        if (window.confirm('Delete this tournament?')) {
          setTournaments(prev => prev.filter(t => t.id !== tournament.id));
          toast.success('Tournament deleted');
        }
        break;
      case 'view_brackets':
        setViewingBracket(tournament);
        break;
      case 'live_score':
        setLiveScoringTournament(tournament);
        break;
      case 'register':
        setRegisteringTournament(tournament);
        break;
    }
  };

  const handleShare = (tournament: Tournament) => {
    setSharingTournament(tournament);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Tournaments" />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – connect to Supabase to manage tournaments</p>
        </div>
      )}

      <div className="px-4 mb-2 flex gap-2">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {showSearch && (
        <div className="px-4 mb-4 animate-fade-in-up">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournaments..."
            className="w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
            autoFocus
          />
        </div>
      )}

      <div className="px-4 md:px-8 max-w-[1600px] mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filters */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2 pb-2 md:pb-0">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeFilter === filter.id
                    ? "bg-[#1A1A1A] text-[hsl(var(--gold))] shadow-sm border border-[hsl(var(--gold))]/30"
                    : "bg-[#121212] text-gray-500 hover:text-white border border-white/5 hover:bg-[#1A1A1A]"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Create Button */}
        {isOnline && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--gold))] text-black font-extrabold hover:scale-[1.02] transition-transform shadow-lg shadow-[hsl(var(--gold))]/20"
          >
            <Plus className="w-5 h-5 -ml-1 border-2 border-black rounded-full p-0.5" />
            Create Tournament
          </button>
        )}
      </div>

      <div className="px-4 md:px-8 max-w-[1600px] mx-auto">
        {filteredTournaments.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-3">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-semibold text-muted-foreground">No tournaments found</p>
            {isOnline && (
              <p className="text-xs text-muted-foreground block md:hidden">Tap + to create your first tournament</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 stagger-children">
            {filteredTournaments.map((tournament, index) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onClick={() => setSelectedTournament(tournament)}
                onRegister={() => setRegisteringTournament(tournament)}
                onShare={() => handleShare(tournament)}
                onAction={(action) => handleCardAction(tournament, action)}
                style={{ animationDelay: `${index * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => isOnline ? setShowCreateModal(true) : toast.error('Offline – changes will not save')}
        title={!isOnline ? 'Offline – changes will not save' : 'Create tournament'}
        className={cn(
          "md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] shadow-lg shadow-[hsl(var(--gold))]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40",
          !isOnline && "opacity-50"
        )}
      >
        <Plus className="w-6 h-6" />
      </button>

      {selectedTournament && (
        <TournamentDetailModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onRegister={() => {
            setRegisteringTournament(selectedTournament);
            setSelectedTournament(null);
          }}
          onUpdate={handleUpdateTournament}
        />
      )}

      {showCreateModal && (
        <CreateTournamentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTournament}
        />
      )}

      {registeringTournament && (
        <RegisterPlayerModal
          tournament={registeringTournament}
          onClose={() => setRegisteringTournament(null)}
          onRegister={(players) => handleRegisterPlayers(registeringTournament.id, players)}
        />
      )}

      {viewingBracket && (
        <BracketModal
          tournament={viewingBracket}
          onClose={() => setViewingBracket(null)}
          onUpdateMatch={(matchId, updates) => handleUpdateMatch(viewingBracket.id, matchId, updates)}
          onGenerateBracket={() => generateBracket(viewingBracket.id)}
        />
      )}

      {liveScoringTournament && (
        <LiveScoring
          tournament={liveScoringTournament}
          onClose={() => setLiveScoringTournament(null)}
          onUpdateMatch={(matchId, updates) => handleUpdateMatch(liveScoringTournament.id, matchId, updates)}
        />
      )}

      {sharingTournament && (
        <ShareTournamentModal
          tournament={sharingTournament}
          isOpen={!!sharingTournament}
          onClose={() => setSharingTournament(null)}
        />
      )}
    </div>
  );
};

export default EventsScreen;
