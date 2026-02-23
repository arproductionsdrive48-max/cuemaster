import { useState } from 'react';
import { Member } from '@/types';
import { X, Phone, Mail, Trophy, Target, IndianRupee, MessageCircle, Edit, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import EditMemberModal from './EditMemberModal';
import { useMembers } from '@/contexts/MembersContext';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

interface MemberDetailModalProps {
  member: Member;
  onClose: () => void;
}

const membershipColors = {
  Gold: 'bg-gold/20 text-gold border-gold/30',
  Silver: 'bg-silver/20 text-silver border-silver/30',
  Bronze: 'bg-bronze/20 text-bronze border-bronze/30',
  Regular: 'bg-secondary text-muted-foreground border-border',
  Guest: 'bg-accent text-accent-foreground border-border',
};

const MemberDetailModal = ({ member, onClose }: MemberDetailModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMember, setCurrentMember] = useState(member);
  const { clubSettings, matchHistory, tournaments } = useMembers();

  // Get trophies from tournaments
  const memberTrophies: { name: string; tournamentName: string }[] = [];
  tournaments.forEach(t => {
    if (t.trophies && t.trophies[currentMember.name]) {
      t.trophies[currentMember.name].forEach(trophy => {
        memberTrophies.push({ name: trophy, tournamentName: t.name });
      });
    }
  });

  const winRate = currentMember.gamesPlayed > 0 
    ? Math.round((currentMember.wins / currentMember.gamesPlayed) * 100) 
    : 0;

  const handleEditSave = (updatedMember: Member) => {
    setCurrentMember(updatedMember);
  };

  const handleWhatsAppReminder = () => {
    sendWhatsAppReminder(
      clubSettings.reminderTemplate,
      currentMember.name,
      Math.abs(currentMember.creditBalance),
      currentMember.phone
    );
  };

  // Get player's match history
  const playerMatches = matchHistory.filter(mh =>
    mh.players.some(p => p.name === currentMember.name)
  ).slice(0, 10);

  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <>
      <div className="modal-overlay animate-fade-in-up" onClick={onClose}>
        <div
          className="absolute inset-x-4 top-16 bottom-24 overflow-hidden rounded-3xl glass-card animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-xl font-bold">Member Profile</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-80px)] no-scrollbar p-4 space-y-4">
            {/* Profile Header */}
            <div className="glass-card p-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">{currentMember.avatar}</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{currentMember.name}</h3>
              {clubSettings.showMembershipBadge && (
                <span className={cn(
                  'inline-block px-4 py-1.5 rounded-full text-sm font-semibold border',
                  membershipColors[currentMember.membershipType]
                )}>
                  {currentMember.membershipType} Member
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{currentMember.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{currentMember.email || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{currentMember.gamesPlayed}</p>
                <p className="text-xs text-muted-foreground">Games</p>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-4 h-4 text-available" />
                </div>
                <p className="text-2xl font-bold text-available">{currentMember.wins}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-2xl font-bold">{winRate}%</p>
                <div className="progress-glass mt-2">
                  <div className="progress-fill" style={{ width: `${winRate}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
              </div>
            </div>

            {/* Balance */}
            <div className={cn(
              'glass-card p-4',
              currentMember.creditBalance < 0 && 'border-primary/30'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <div className={cn(
                    'flex items-center gap-1 text-2xl font-bold',
                    currentMember.creditBalance < 0 && 'text-primary',
                    currentMember.creditBalance > 0 && 'text-available'
                  )}>
                    <IndianRupee className="w-6 h-6" />
                    <span>{Math.abs(currentMember.creditBalance)}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {currentMember.creditBalance < 0 ? 'Due' : 'Credit'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="btn-glass flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>

            {/* Last Visit */}
            <div className="glass-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Last Visit</p>
              <p className="font-semibold">{format(currentMember.lastVisit, 'PPp')}</p>
            </div>

            {/* Tournament Trophies */}
            {memberTrophies.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[hsl(var(--gold))]" />
                  Tournament Trophies
                </h4>
                <div className="space-y-2">
                  {memberTrophies.map((trophy, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[hsl(var(--gold))]/5 border border-[hsl(var(--gold))]/20">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-[hsl(var(--gold))]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{trophy.name}</p>
                        <p className="text-xs text-muted-foreground">{trophy.tournamentName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match History */}
            {playerMatches.length > 0 && (
              <div className="glass-card p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[hsl(var(--gold))]" />
                  Match History
                </h4>
                <div className="space-y-3">
                  {playerMatches.map(match => {
                    const playerInfo = match.players.find(p => p.name === currentMember.name);
                    const opponents = match.players.filter(p => p.name !== currentMember.name);
                    const isWin = playerInfo?.result === 'win';

                    return (
                      <div key={match.id} className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-xs font-bold px-2 py-0.5 rounded',
                              isWin ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' : 'bg-primary/20 text-primary'
                            )}>
                              {isWin ? 'W' : 'L'}
                            </span>
                            <span className="text-sm font-medium">Table {match.tableNumber}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(match.date, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            vs {opponents.map(o => o.name).join(', ')}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDuration(match.duration)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => setShowEditModal(true)}
                className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            </div>

            {currentMember.creditBalance < 0 && (
              <button 
                onClick={handleWhatsAppReminder}
                className="w-full btn-premium flex items-center justify-center gap-2 py-4 bg-[#25D366] hover:bg-[#20BD5A]"
              >
                <MessageCircle className="w-5 h-5" />
                Send WhatsApp Reminder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Member Modal */}
      {showEditModal && (
        <EditMemberModal 
          member={currentMember} 
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}
    </>
  );
};

export default MemberDetailModal;
