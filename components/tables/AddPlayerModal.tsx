import { useState } from 'react';
import { X, Camera, UserPlus } from 'lucide-react';
import { MembershipType } from '@/types';
import { cn } from '@/lib/utils';

interface AddPlayerModalProps {
  onClose: () => void;
  onAddPlayer: (player: { name: string; phone?: string; isGuest: boolean; membershipType?: MembershipType }) => void;
}

const membershipOptions: { type: MembershipType; color: string }[] = [
  { type: 'Gold', color: 'bg-gold/20 text-gold border-gold/50' },
  { type: 'Silver', color: 'bg-silver/20 text-silver border-silver/50' },
  { type: 'Bronze', color: 'bg-bronze/20 text-bronze border-bronze/50' },
  { type: 'Regular', color: 'bg-secondary text-muted-foreground border-border' },
];

const AddPlayerModal = ({ onClose, onAddPlayer }: AddPlayerModalProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isGuest, setIsGuest] = useState(true);
  const [membershipType, setMembershipType] = useState<MembershipType>('Regular');

  const handleSubmit = () => {
    if (name.trim()) {
      onAddPlayer({ 
        name: name.trim(), 
        phone: phone || undefined, 
        isGuest,
        membershipType: isGuest ? undefined : membershipType
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-sm glass-card p-6 animate-scale-in max-h-[85vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Add New Player</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Placeholder */}
        <div className="flex justify-center mb-6">
          <button className="w-20 h-20 rounded-2xl bg-secondary border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-colors">
            <Camera className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Photo</span>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Name *</label>
            <input
              type="text"
              placeholder="Enter player name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone (optional)</label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-glass"
            />
          </div>

          {/* Guest/Member Toggle */}
          <div className="flex gap-2 p-1 rounded-xl bg-secondary">
            <button
              onClick={() => setIsGuest(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                isGuest ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Temporary Guest
            </button>
            <button
              onClick={() => setIsGuest(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                !isGuest ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Register Member
            </button>
          </div>

          {/* Membership Type Selector - Only show when registering as member */}
          {!isGuest && (
            <div className="animate-fade-in">
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Membership Type</label>
              <div className="grid grid-cols-2 gap-2">
                {membershipOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setMembershipType(option.type)}
                    className={cn(
                      'py-3 px-4 rounded-xl border text-sm font-semibold transition-all',
                      option.color,
                      membershipType === option.type 
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                        : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    {option.type}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Player
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlayerModal;
