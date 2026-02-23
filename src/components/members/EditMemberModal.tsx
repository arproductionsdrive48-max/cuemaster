import { useState } from 'react';
import { X, Save, User } from 'lucide-react';
import { Member, MembershipType } from '@/types';
import { cn } from '@/lib/utils';
import { useMembers } from '@/contexts/MembersContext';
import { toast } from 'sonner';

interface EditMemberModalProps {
  member: Member;
  onClose: () => void;
  onSave?: (updatedMember: Member) => void;
}

const membershipOptions: { type: MembershipType; color: string; description: string }[] = [
  { type: 'Gold', color: 'bg-gold/20 text-gold border-gold/50', description: 'Premium benefits' },
  { type: 'Silver', color: 'bg-silver/20 text-silver border-silver/50', description: 'Standard benefits' },
  { type: 'Bronze', color: 'bg-bronze/20 text-bronze border-bronze/50', description: 'Basic benefits' },
  { type: 'Regular', color: 'bg-secondary text-muted-foreground border-border', description: 'Pay per visit' },
  { type: 'Guest', color: 'bg-accent text-accent-foreground border-border', description: 'Temporary visitor' },
];

const EditMemberModal = ({ member, onClose, onSave }: EditMemberModalProps) => {
  const { updateMember } = useMembers();
  const [name, setName] = useState(member.name);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email);
  const [membershipType, setMembershipType] = useState<MembershipType>(member.membershipType);
  const [creditBalance, setCreditBalance] = useState(member.creditBalance.toString());
  const [highestBreak, setHighestBreak] = useState((member.highestBreak ?? 0).toString());

  const handleSave = () => {
    // Input validation
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (name.trim().length > 100) {
      toast.error('Name must be less than 100 characters');
      return;
    }
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (phone && phone.trim() && !/^[\+\d\s\-()]{7,20}$/.test(phone.trim())) {
      toast.error('Please enter a valid phone number');
      return;
    }
    const parsedBalance = parseFloat(creditBalance);
    if (isNaN(parsedBalance) || !isFinite(parsedBalance)) {
      toast.error('Credit balance must be a valid number');
      return;
    }
    const parsedBreak = parseInt(highestBreak) || 0;
    if (parsedBreak < 0) {
      toast.error('Highest break cannot be negative');
      return;
    }

    const updates: Partial<Member> = {
      name: name.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      membershipType,
      creditBalance: parsedBalance,
      highestBreak: parsedBreak,
      isGuest: membershipType === 'Guest',
    };

    updateMember(member.id, updates);
    toast.success('Member updated successfully');
    
    if (onSave) {
      onSave({ ...member, ...updates });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-md glass-card p-6 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Edit Member</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Display */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
            <span className="text-3xl font-bold">{member.avatar}</span>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Name *</label>
            <input
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-glass"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-glass"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Credit Balance (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={creditBalance}
              onChange={(e) => setCreditBalance(e.target.value)}
              className="input-glass"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Positive = credit, Negative = amount due
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Highest Break</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={highestBreak}
              onChange={(e) => setHighestBreak(e.target.value)}
              className="input-glass"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Player's all-time highest break (tournament only)
            </p>
          </div>

          {/* Membership Type Selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Membership Type</label>
            <div className="grid grid-cols-2 gap-2">
              {membershipOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setMembershipType(option.type)}
                  className={cn(
                    'py-3 px-4 rounded-xl border text-left transition-all',
                    option.color,
                    membershipType === option.type 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : 'opacity-60 hover:opacity-100'
                  )}
                >
                  <span className="text-sm font-semibold block">{option.type}</span>
                  <span className="text-xs opacity-70">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;