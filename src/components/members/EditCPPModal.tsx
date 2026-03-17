import { useState } from 'react';
import { Member } from '@/types';
import { X, Target, Save } from 'lucide-react';
import { useUpdateMemberCPP } from '@/hooks/useSupabaseQuery';
import { useMembers } from '@/contexts/MembersContext';

interface EditCPPModalProps {
  member: Member;
  onClose: () => void;
}

const EditCPPModal = ({ member, onClose }: EditCPPModalProps) => {
  const { clubId, isOnline } = useMembers();
  const [pointsAdjustment, setPointsAdjustment] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const { mutate: updateCPP, isPending } = useUpdateMemberCPP(isOnline ? clubId : null);

  const currentPoints = member.cpp_points || 0;
  const adjustmentNum = parseInt(pointsAdjustment) || 0;
  const newTotal = currentPoints + adjustmentNum;

  const handleSave = () => {
    if (!isOnline) return;
    if (adjustmentNum === 0) {
      onClose();
      return;
    }

    updateCPP(
      { memberId: member.id, newPoints: newTotal, reason: reason || undefined },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up">
      <div 
        className="w-full max-w-sm bg-[#0B0B0B] border border-white/5 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-white">Edit CPP</h3>
            <p className="text-xs text-gray-400 mt-0.5">{member.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#121212] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-[hsl(var(--gold))]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Current CPP</p>
                <p className="text-2xl font-black text-white">{currentPoints}</p>
              </div>
            </div>
            {adjustmentNum !== 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">New Total</p>
                <p className="text-2xl font-black text-[hsl(var(--gold))]">{newTotal}</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Points Adjustment</label>
            <input
              type="number"
              value={pointsAdjustment}
              onChange={(e) => setPointsAdjustment(e.target.value)}
              placeholder="e.g. 5 or -2"
              className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white placeholder:text-gray-600 outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-medium"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">Use positive numbers to add (e.g., 5) or negative numbers to deduct (e.g., -2).</p>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Reason (Optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Tournament Win, High Break"
              className="w-full px-4 py-3.5 rounded-xl bg-[#121212] border border-white/5 text-white placeholder:text-gray-600 outline-none focus:border-[hsl(var(--gold))]/50 transition-colors font-medium"
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/5 bg-[#121212]">
          <button
            onClick={handleSave}
            disabled={!isOnline || isPending || adjustmentNum === 0}
            className="w-full py-4 rounded-xl bg-[hsl(var(--gold))] text-black font-extrabold text-sm uppercase tracking-wide hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-[hsl(var(--gold))]/10 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving...' : 'Update Points'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCPPModal;
