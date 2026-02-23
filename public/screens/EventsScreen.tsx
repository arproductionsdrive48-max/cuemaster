import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Tournament, TournamentType, Member } from '@/types';
import TournamentCard from '@/components/tournaments/TournamentCard';
import TournamentDetailModal from '@/components/tournaments/TournamentDetailModal';
import CreateTournamentModal from '@/components/tournaments/CreateTournamentModal';
import RegisterPlayerModal from '@/components/tournaments/RegisterPlayerModal';
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
  const { tournaments, setTournaments, clubId, isOnline } = useMembers();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);

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
    setSelectedTournament(updated);
  };

  const handleShare = (tournament: Tournament) => {
    const text = `🎱 ${tournament.name}\n📅 ${tournament.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}\n📍 ${tournament.location}\n💰 Entry: ₹${tournament.entryFee}\n\nRegister now at Snook OS!`;
    if (navigator.share) {
      navigator.share({ title: tournament.name, text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Tournament details copied to clipboard!');
    }
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

      <div className="px-4 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-2">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeFilter === filter.id
                  ? "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {filteredTournaments.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-3">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-semibold text-muted-foreground">No tournaments found</p>
            {isOnline && (
              <p className="text-xs text-muted-foreground">Tap + to create your first tournament</p>
            )}
          </div>
        ) : (
          filteredTournaments.map((tournament, index) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onClick={() => setSelectedTournament(tournament)}
              onRegister={() => setRegisteringTournament(tournament)}
              onShare={() => handleShare(tournament)}
              style={{ animationDelay: `${index * 0.05}s` }}
            />
          ))
        )}
      </div>

      <button
        onClick={() => isOnline ? setShowCreateModal(true) : toast.error('Offline – changes will not save')}
        title={!isOnline ? 'Offline – changes will not save' : 'Create tournament'}
        className={cn(
          "fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] shadow-lg shadow-[hsl(var(--gold))]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40",
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
    </div>
  );
};

export default EventsScreen;
