import { Member } from '@/types';
import { cn } from '@/lib/utils';
import { IndianRupee, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMembers } from '@/contexts/MembersContext';

interface MemberCardProps {
  member: Member;
  onClick: () => void;
}

const membershipColors: Record<string, string> = {
  Gold: 'text-gold border-gold/30 bg-gold/10',
  Silver: 'text-silver border-silver/30 bg-silver/10',
  Bronze: 'text-bronze border-bronze/30 bg-bronze/10',
  Regular: 'text-muted-foreground border-border bg-secondary/50',
  Guest: 'text-paused border-paused/30 bg-paused/10',
};

const MemberCard = ({ member, onClick }: MemberCardProps) => {
  const { clubSettings } = useMembers();

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col text-left transition-all duration-300 w-full overflow-hidden hover:shadow-lg shadow-sm group",
        "bg-[#1A1A1A] border-[#333] border rounded-2xl hover:border-[hsl(var(--gold))]/50 active:scale-[0.98]"
      )}
    >
      {/* Top Banner section */}
      <div className="p-4 flex justify-between items-start border-b border-white/5 bg-white/[0.02] w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#2A2A2A] flex items-center justify-center border border-white/10 group-hover:border-[hsl(var(--gold))]/30 transition-colors">
            <span className="text-xl font-bold text-white">{member.avatar}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-100 text-lg leading-tight truncate max-w-[140px]">{member.name}</h3>
            {clubSettings.showMembershipBadge ? (
              <span className={cn(
                'inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                membershipColors[member.membershipType]
              )}>
                {member.membershipType}
              </span>
            ) : (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(member.lastVisit, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        
        {/* CPP Points Badge top right */}
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-400 font-medium">CPP Score</span>
          <span className="text-lg font-bold text-[hsl(var(--gold))]">{member.cpp_points || 0}</span>
        </div>
      </div>

      {/* Body Section */}
      <div className="p-4 w-full bg-[#121212]/50">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1">Win Rate</span>
            <div className="flex gap-2">
              <span className="text-xs font-bold px-2 py-1 rounded bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/20">W {member.wins}</span>
              <span className="text-xs font-bold px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">L {member.losses}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1">Total Games</span>
            <span className="text-sm font-bold text-gray-300">{member.gamesPlayed} matches</span>
          </div>
        </div>

        {/* Balance Footer */}
        <div className={cn(
          "w-full flex items-center justify-between mt-2 pt-3 border-t border-white/5",
          member.creditBalance < 0 ? 'text-red-400' : 'text-emerald-400'
        )}>
           <span className="text-xs font-medium text-gray-400">
            {member.creditBalance < 0 ? 'Outstanding Dues' : member.creditBalance > 0 ? 'Available Credit' : 'Balance Settled'}
          </span>
          {member.creditBalance !== 0 ? (
            <div className="flex items-center gap-0.5 font-bold">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>{Math.abs(member.creditBalance)}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-gray-500">₹0</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default MemberCard;
