import { useState } from 'react';
import { Member } from '@/types';
import { X, Phone, Mail, Trophy, Target, IndianRupee, MessageCircle, Edit } from 'lucide-react';
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
  const { clubSettings } = useMembers();

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
      Math.abs(currentMember.creditBalance)
    );
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
              <span className={cn(
                'inline-block px-4 py-1.5 rounded-full text-sm font-semibold border',
                membershipColors[currentMember.membershipType]
              )}>
                {currentMember.membershipType} Member
              </span>
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

            {/* Actions */}
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
