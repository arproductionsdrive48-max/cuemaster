import { Member } from '@/types';
import { X, Trophy, Target, TrendingUp, Calendar, IndianRupee, Star, MessageCircle, Edit3, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

interface PlayerDetailModalProps {
  member: Member & { winRate: number };
  rank: number;
  onClose: () => void;
}

const PlayerDetailModal = ({ member, rank, onClose }: PlayerDetailModalProps) => {
  const { clubSettings } = useMembers();
  
  const handleWhatsAppReminder = () => {
    sendWhatsAppReminder(
      clubSettings.reminderTemplate,
      member.name,
      Math.abs(member.creditBalance)
    );
  };
  // Generate fake recent matches
  const recentMatches = [
    { opponent: 'Rahul S.', result: 'won', score: '4-2', date: 'Today' },
    { opponent: 'Vikram S.', result: 'lost', score: '3-4', date: 'Yesterday' },
    { opponent: 'Arjun R.', result: 'won', score: '4-1', date: 'Dec 22' },
    { opponent: 'Karan K.', result: 'won', score: '4-3', date: 'Dec 21' },
    { opponent: 'Mohit S.', result: 'lost', score: '2-4', date: 'Dec 20' },
  ];

  const getRankBadge = () => {
    if (rank === 1) return <div className="px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-bold">🏆 #1</div>;
    if (rank === 2) return <div className="px-3 py-1 rounded-full bg-silver/20 text-silver text-xs font-bold">🥈 #2</div>;
    if (rank === 3) return <div className="px-3 py-1 rounded-full bg-bronze/20 text-bronze text-xs font-bold">🥉 #3</div>;
    return <div className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-bold">#{rank}</div>;
  };

  const getMembershipColor = () => {
    switch (member.membershipType) {
      case 'Gold': return 'text-gold';
      case 'Silver': return 'text-silver';
      case 'Bronze': return 'text-bronze';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-md max-h-[85vh] overflow-hidden glass-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Avatar */}
        <div className="relative p-6 pb-4 border-b border-border/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold">{member.avatar}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold truncate">{member.name}</h2>
                {getRankBadge()}
              </div>
              <div className="flex items-center gap-2">
                <Star className={cn('w-4 h-4', getMembershipColor())} />
                <span className={cn('text-sm font-medium', getMembershipColor())}>
                  {member.membershipType} Member
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{member.phone}</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-200px)] no-scrollbar">
          {/* Stats Grid */}
          <div className="p-4 border-b border-border/50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-3 text-center">
                <p className="text-2xl font-bold">{member.gamesPlayed}</p>
                <p className="text-xs text-muted-foreground">Games</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-2xl font-bold text-available">{member.wins}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-2xl font-bold text-primary">{member.losses}</p>
                <p className="text-xs text-muted-foreground">Losses</p>
              </div>
            </div>
            
            {/* Win Rate Bar */}
            <div className="mt-4 p-3 glass-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-available" />
                  Win Rate
                </span>
                <span className="text-lg font-bold text-available">{member.winRate}%</span>
              </div>
              <div className="progress-glass h-3">
                <div 
                  className="progress-fill h-full"
                  style={{ width: `${member.winRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="p-4 border-b border-border/50">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-3">
                <p className="text-xs text-muted-foreground mb-1">Favorite Table</p>
                <p className="font-semibold">Table 3</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                <p className="font-semibold flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  {(member.gamesPlayed * 180 + Math.floor(Math.random() * 5000)).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Credit Balance */}
            <div className={cn(
              'mt-3 p-3 rounded-xl',
              member.creditBalance < 0 ? 'bg-primary/10 border border-primary/30' : 'bg-available/10 border border-available/30'
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm">Credit Balance</span>
                <span className={cn(
                  'font-bold flex items-center gap-1',
                  member.creditBalance < 0 ? 'text-primary' : 'text-available'
                )}>
                  <IndianRupee className="w-4 h-4" />
                  {Math.abs(member.creditBalance)}
                  {member.creditBalance < 0 && ' due'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Matches */}
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Recent Matches
            </h3>
            <div className="space-y-2">
              {recentMatches.map((match, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      match.result === 'won' ? 'bg-available' : 'bg-primary'
                    )} />
                    <span className="text-sm">vs {match.opponent}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-sm font-medium',
                      match.result === 'won' ? 'text-available' : 'text-primary'
                    )}>
                      {match.score}
                    </span>
                    <span className="text-xs text-muted-foreground">{match.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-border/50 flex gap-3">
          <button className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2">
            <History className="w-4 h-4" />
            View History
          </button>
          <button className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
          {member.creditBalance < 0 && (
            <button 
              onClick={handleWhatsAppReminder}
              className="py-3 px-4 rounded-xl bg-[#25D366] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Remind
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDetailModal;
