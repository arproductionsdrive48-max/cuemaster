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
      className="glass-card-hover p-4 text-left w-full flex items-center gap-4"
    >
      {/* Avatar */}
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold">{member.avatar}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{member.name}</h3>
          {clubSettings.showMembershipBadge && (
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              membershipColors[member.membershipType]
            )}>
              {member.membershipType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDistanceToNow(member.lastVisit, { addSuffix: true })}</span>
          </div>
          {/* W/L display */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]">W {member.wins}</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">L {member.losses}</span>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className={cn(
        'text-right',
        member.creditBalance < 0 && 'text-primary',
        member.creditBalance > 0 && 'text-available'
      )}>
        <div className="flex items-center gap-0.5 justify-end">
          <IndianRupee className="w-4 h-4" />
          <span className="font-bold">{Math.abs(member.creditBalance)}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {member.creditBalance < 0 ? 'Due' : 'Credit'}
        </span>
      </div>
    </button>
  );
};

export default MemberCard;
