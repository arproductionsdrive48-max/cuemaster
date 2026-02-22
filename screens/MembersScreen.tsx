import { useState } from 'react';
import { useMembers } from '@/contexts/MembersContext';
import Header from '@/components/layout/Header';
import MemberCard from '@/components/members/MemberCard';
import MemberDetailModal from '@/components/members/MemberDetailModal';
import AddPlayerModal from '@/components/tables/AddPlayerModal';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import { Member } from '@/types';
import { Search, UserPlus, Filter, Trophy, Users, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FilterType = 'all' | 'due' | 'credit' | 'guests';

const MembersScreen = () => {
  const { members, addMember, isOnline } = useMembers();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRankings, setShowRankings] = useState(false);

  const filteredMembers = members
    .filter(m => {
      if (filter === 'due') return m.creditBalance < 0;
      if (filter === 'credit') return m.creditBalance > 0;
      if (filter === 'guests') return m.isGuest === true;
      return true;
    })
    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalDue = members.filter(m => m.creditBalance < 0).reduce((sum, m) => sum + Math.abs(m.creditBalance), 0);
  const guestCount = members.filter(m => m.isGuest).length;

  const handleAddPlayer = (player: { name: string; phone?: string; isGuest: boolean }) => {
    if (!isOnline) {
      toast.error('Offline – changes will not save');
      return;
    }
    addMember({
      name: player.name,
      phone: player.phone || '',
      email: '',
      membershipType: player.isGuest ? 'Guest' : 'Regular',
      isGuest: player.isGuest,
    });
    setShowAddModal(false);
  };

  if (showRankings) {
    return <LeaderboardScreen onBack={() => setShowRankings(false)} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <Header title="Players" />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – player data unavailable</p>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 glass-card p-3 text-center">
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="flex-1 glass-card p-3 text-center">
            <p className="text-2xl font-bold text-paused">{guestCount}</p>
            <p className="text-xs text-muted-foreground">Guests</p>
          </div>
          <div className="flex-1 glass-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">₹{totalDue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Due</p>
          </div>
        </div>
      </div>

      {/* Rankings Button */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowRankings(true)}
          className="w-full glass-card p-3 flex items-center justify-center gap-2 hover:bg-accent/30 transition-all"
        >
          <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
          <span className="font-medium text-sm">Player Rankings</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass pl-12 w-full"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { id: 'all', label: 'All' },
            { id: 'guests', label: 'Guests' },
            { id: 'due', label: 'With Dues' },
            { id: 'credit', label: 'With Credit' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {f.id === 'all' && <Filter className="w-4 h-4" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members List */}
      {members.length === 0 && isOnline ? (
        <div className="px-4">
          <div className="glass-card p-10 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-semibold text-muted-foreground">No players yet</p>
            <p className="text-xs text-muted-foreground">Tap + to add your first player</p>
          </div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="px-4">
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground text-sm">No players match your search</p>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-3 stagger-children">
          {filteredMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() => setSelectedMember(member)}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => isOnline ? setShowAddModal(true) : toast.error('Offline – changes will not save')}
        title={!isOnline ? 'Offline – changes will not save' : 'Add player'}
        className={cn("fab bottom-24 right-4", !isOnline && "opacity-50")}
      >
        <UserPlus className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* Modals */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onAddPlayer={handleAddPlayer}
        />
      )}
    </div>
  );
};

export default MembersScreen;
