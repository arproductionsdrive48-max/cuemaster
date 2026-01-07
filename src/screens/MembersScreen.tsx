import { useState } from 'react';
import { useMembers } from '@/contexts/MembersContext';
import Header from '@/components/layout/Header';
import MemberCard from '@/components/members/MemberCard';
import MemberDetailModal from '@/components/members/MemberDetailModal';
import AddPlayerModal from '@/components/tables/AddPlayerModal';
import { Member } from '@/types';
import { Search, UserPlus, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'due' | 'credit' | 'guests';

const MembersScreen = () => {
  const { members, addMember } = useMembers();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);

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
    addMember({
      name: player.name,
      phone: player.phone || '',
      email: '',
      membershipType: player.isGuest ? 'Guest' : 'Regular',
      isGuest: player.isGuest,
    });
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Members" />

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
      <div className="px-4 space-y-3 stagger-children">
        {filteredMembers.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            onClick={() => setSelectedMember(member)}
          />
        ))}
      </div>

      {/* FAB */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fab bottom-24 right-4"
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
