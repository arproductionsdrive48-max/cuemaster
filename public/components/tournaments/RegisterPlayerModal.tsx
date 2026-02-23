import { useState } from 'react';
import { Tournament, Member } from '@/types';
import { useMembers } from '@/contexts/MembersContext';
import { X, Search, UserPlus, Check, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RegisterPlayerModalProps {
  tournament: Tournament;
  onClose: () => void;
  onRegister: (players: (Member | { name: string; phone: string })[]) => void;
}

const RegisterPlayerModal = ({ tournament, onClose, onRegister }: RegisterPlayerModalProps) => {
  const { members, addMember } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', phone: '' });

  // Filter out already registered players
  const availableMembers = members.filter(m => 
    !tournament.registeredPlayers.includes(m.name) &&
    !selectedMembers.some(s => s.id === m.id)
  );

  const filteredMembers = availableMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone.includes(searchQuery)
  );

  const handleToggleMember = (member: Member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  const handleAddGuest = () => {
    if (!newPlayer.name.trim()) {
      toast.error('Please enter player name');
      return;
    }
    
    // Add as guest member in Supabase
    addMember({
      name: newPlayer.name,
      phone: newPlayer.phone,
      email: '',
      membershipType: 'Guest',
      isGuest: true,
    });

    // Create a local placeholder so we can register them immediately
    const guestPlaceholder: Member = {
      id: `guest-${Date.now()}`,
      name: newPlayer.name,
      phone: newPlayer.phone,
      email: '',
      avatar: newPlayer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      membershipType: 'Guest',
      creditBalance: 0,
      lastVisit: new Date(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      isGuest: true,
    };
    
    setSelectedMembers(prev => [...prev, guestPlaceholder]);
    setNewPlayer({ name: '', phone: '' });
    setShowNewPlayer(false);
    toast.success(`Guest "${newPlayer.name}" added!`);
  };

  const handleRegister = () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one player');
      return;
    }
    onRegister(selectedMembers);
  };

  const totalFee = tournament.entryFee * selectedMembers.length;

  const getMembershipBadge = (type: string) => {
    switch (type) {
      case 'Gold':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]">GOLD</span>;
      case 'Silver':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-silver/20 text-silver">SILVER</span>;
      case 'Bronze':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bronze/20 text-bronze">BRONZE</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-background rounded-t-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Register Player</h2>
                <p className="text-sm text-muted-foreground">{tournament.name}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-accent/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
            />
          </div>
        </div>

        {/* Selected Players Badge */}
        {selectedMembers.length > 0 && (
          <div className="px-4 py-3 bg-[hsl(var(--gold))]/10 border-b border-[hsl(var(--gold))]/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[hsl(var(--gold))]">
                {selectedMembers.length} player{selectedMembers.length > 1 ? 's' : ''} selected
              </span>
              <button 
                onClick={() => setSelectedMembers([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedMembers.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-sm"
                >
                  <span className="font-medium">{member.name}</span>
                  <button 
                    onClick={() => handleToggleMember(member)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[45vh] p-4">
          {!showNewPlayer ? (
            <>
              {/* Add New Player Button */}
              <button
                onClick={() => setShowNewPlayer(true)}
                className="w-full p-4 mb-4 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center gap-2 text-muted-foreground hover:border-[hsl(var(--gold))]/50 hover:text-[hsl(var(--gold))] transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                + Add New Player (Guest)
              </button>

              {/* Members List */}
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Registered Members
              </p>
              <div className="space-y-2">
                {filteredMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No members found</p>
                ) : (
                  filteredMembers.map(member => {
                    const isSelected = selectedMembers.some(m => m.id === member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => handleToggleMember(member)}
                        className={cn(
                          "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                          isSelected 
                            ? "bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/50" 
                            : "bg-secondary/30 hover:bg-secondary/50"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm",
                          member.membershipType === 'Gold' ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' :
                          member.membershipType === 'Silver' ? 'bg-silver/20 text-silver' :
                          member.membershipType === 'Bronze' ? 'bg-bronze/20 text-bronze' :
                          'bg-secondary text-foreground'
                        )}>
                          {member.avatar}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.name}</p>
                            {getMembershipBadge(member.membershipType)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {member.gamesPlayed} games played • {Math.round((member.wins / (member.gamesPlayed || 1)) * 100)}% win rate
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[hsl(var(--gold))] flex items-center justify-center">
                            <Check className="w-4 h-4 text-[hsl(var(--gold-foreground))]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* New Player Form */
            <div className="space-y-4">
              <button
                onClick={() => setShowNewPlayer(false)}
                className="text-sm text-[hsl(var(--gold))] mb-2"
              >
                ← Back to member list
              </button>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Player Name *
                </label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter player name"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
                />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={newPlayer.phone}
                  onChange={(e) => setNewPlayer(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50"
                />
              </div>

              <button
                onClick={handleAddGuest}
                className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Add Guest Player
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border/50 p-4 pb-24">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm text-muted-foreground">Entry Fee</span>
              {selectedMembers.length > 1 && (
                <span className="text-xs text-muted-foreground ml-1">
                  (₹{tournament.entryFee} × {selectedMembers.length})
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-[hsl(var(--gold))]">₹{totalFee.toLocaleString()}</span>
          </div>
          <button
            onClick={handleRegister}
            disabled={selectedMembers.length === 0}
            className={cn(
              "w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
              selectedMembers.length > 0
                ? "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <UserPlus className="w-5 h-5" />
            Confirm Registration ({selectedMembers.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPlayerModal;
