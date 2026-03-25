import { useState } from 'react';
import { useMembers } from '@/contexts/MembersContext';
import { Member } from '@/types';
import Header from '@/components/layout/Header';
import { Users, CreditCard, Award, TrendingUp, Search, MoreVertical, Crown, Wallet, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateMember } from '@/hooks/useSupabaseQuery';

const MembershipsScreen = () => {
  const { members, isOnline, clubId } = useMembers();
  const { mutate: updateMember } = useUpdateMember(isOnline ? clubId : null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeModal, setActiveModal] = useState<'type' | 'points' | 'credit' | null>(null);
  
  // Input states
  const [pointsInput, setPointsInput] = useState('');
  const [creditInput, setCreditInput] = useState('');

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery)
  );

  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0);
  const totalCredits = members.reduce((sum, m) => sum + (m.creditBalance || 0), 0);
  const activeMembers = members.filter(m => {
    const lastVisit = new Date(m.lastVisit).getTime();
    return Date.now() - lastVisit < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const KPIs = [
    { label: 'Total Members', value: members.length, icon: Users, color: 'text-blue-400' },
    { label: 'Active (30D)', value: activeMembers, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Total Credits', value: `₹${totalCredits.toLocaleString()}`, icon: Wallet, color: 'text-[hsl(var(--gold))]' },
    { label: 'CPP Awarded', value: totalPoints.toLocaleString(), icon: Award, color: 'text-purple-400' },
  ];

  const getTierColors = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'gold': return 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/20';
      case 'silver': return 'bg-slate-300/10 text-slate-300 border-slate-300/20';
      case 'bronze': return 'bg-amber-700/10 text-amber-500 border-amber-700/20';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  const handleAction = (member: Member) => {
    setSelectedMember(member);
    setActiveModal('type'); // Open action sheet/modal defaulted to type
  };

  const executeUpdate = (updates: Partial<Member>) => {
    if (!selectedMember || !isOnline) {
      if (!isOnline) toast.error('Offline - cannot save changes');
      return;
    }
    updateMember({ id: selectedMember.id, updates }, {
      onSuccess: () => {
        toast.success('Member updated successfully!');
        setActiveModal(null);
        setPointsInput('');
        setCreditInput('');
      }
    });
  };

  const handleNotify = (member: Member) => {
    const text = `Hi ${member.name},\nHere is a quick update regarding your membership at our club. You currently have ${member.points} CPP and ₹${member.creditBalance} in your wallet!`;
    const url = `https://wa.me/${member.phone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Memberships" />

      <div className="px-4 mt-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {KPIs.map((kpi, idx) => (
            <div key={idx} className="glass-card p-4 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-xl bg-secondary/50", kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-400">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              <div className={cn("absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity", kpi.color.replace('text-', 'bg-'))} />
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search members by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-secondary/50 border border-border/50 text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 transition-all"
            />
          </div>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(member => (
            <div key={member.id} className="glass-card p-5 rounded-3xl hover:border-white/10 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{member.name}</h3>
                    <p className="text-xs text-gray-400">{member.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", getTierColors(member.membershipType))}>
                  {member.membershipType === 'Gold' && <Crown className="w-3.5 h-3.5" />}
                  {member.membershipType === 'Silver' && <Shield className="w-3.5 h-3.5" />}
                  {member.membershipType}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-gray-400">CPP</span>
                  </div>
                  <span className="font-bold">{member.points?.toLocaleString() || 0}</span>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[hsl(var(--gold))]" />
                    <span className="text-sm font-medium text-gray-400">Wallet</span>
                  </div>
                  <span className="font-bold">₹{member.creditBalance}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
                <span>Last visit: {format(new Date(member.lastVisit), 'MMM do, yyyy')}</span>
                <button 
                  onClick={() => handleAction(member)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No members found</p>
          </div>
        )}
      </div>

      {/* Action Modal Map */}
      {activeModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1c23] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                <p className="text-sm text-gray-400">Manage Membership</p>
              </div>
            </div>

            <div className="p-2 bg-secondary/30 flex p-2 border-b border-white/5">
              <button 
                onClick={() => setActiveModal('type')} 
                className={cn("flex-1 text-sm font-bold py-2 rounded-xl transition-all", activeModal === 'type' ? "bg-white/10 text-white" : "text-gray-400")}
              >
                Type
              </button>
              <button 
                onClick={() => setActiveModal('points')} 
                className={cn("flex-1 text-sm font-bold py-2 rounded-xl transition-all", activeModal === 'points' ? "bg-purple-500/20 text-purple-400" : "text-gray-400")}
              >
                CPP
              </button>
              <button 
                onClick={() => setActiveModal('credit')} 
                className={cn("flex-1 text-sm font-bold py-2 rounded-xl transition-all", activeModal === 'credit' ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" : "text-gray-400")}
              >
                Wallet
              </button>
            </div>

            <div className="p-6">
              {activeModal === 'type' && (
                <div className="space-y-3">
                  {['Gold', 'Silver', 'Bronze', 'Regular', 'Guest'].map(t => (
                    <button 
                      key={t}
                      onClick={() => executeUpdate({ membershipType: t as any })}
                      className={cn("w-full py-4 rounded-xl border flex items-center justify-between px-4 transition-all", selectedMember.membershipType === t ? getTierColors(t) : "border-white/5 text-gray-400 hover:bg-white/5")}
                    >
                      <span className="font-bold">{t} Membership</span>
                      {selectedMember.membershipType === t && <div className="w-2 h-2 rounded-full bg-current" />}
                    </button>
                  ))}
                </div>
              )}

              {activeModal === 'points' && (
                <div className="space-y-4">
                  <div className="text-center py-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
                    <p className="text-sm text-purple-400 font-medium mb-1">Current Balance</p>
                    <p className="text-3xl font-bold">{selectedMember.points}</p>
                  </div>
                  <input 
                    type="number"
                    placeholder="CPP to add..."
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => executeUpdate({ points: (selectedMember.points || 0) + parseInt(pointsInput || '0') })} className="flex-1 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50">Add</button>
                    <button onClick={() => executeUpdate({ points: Math.max(0, (selectedMember.points || 0) - parseInt(pointsInput || '0')) })} className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50">Deduct</button>
                  </div>
                </div>
              )}

              {activeModal === 'credit' && (
                <div className="space-y-4">
                  <div className="text-center py-4 rounded-2xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 mb-4">
                    <p className="text-sm text-[hsl(var(--gold))] font-medium mb-1">Wallet Balance</p>
                    <p className="text-3xl font-bold">₹{selectedMember.creditBalance}</p>
                  </div>
                  <input 
                    type="number"
                    placeholder="Amount to add (₹)..."
                    value={creditInput}
                    onChange={(e) => setCreditInput(e.target.value)}
                    className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[hsl(var(--gold))] transition-colors"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => executeUpdate({ creditBalance: (selectedMember.creditBalance || 0) + parseFloat(creditInput || '0') })} className="flex-1 py-3 bg-[hsl(var(--gold))] text-black font-bold rounded-xl hover:bg-[hsl(var(--gold))]/90 transition-colors disabled:opacity-50">Load</button>
                    <button onClick={() => executeUpdate({ creditBalance: Math.max(0, (selectedMember.creditBalance || 0) - parseFloat(creditInput || '0')) })} className="flex-1 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50">Deduct</button>
                  </div>
                </div>
              )}

              <button 
                onClick={() => handleNotify(selectedMember)}
                className="w-full mt-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-colors"
              >
                Send Notification via WhatsApp
              </button>
              
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full mt-3 py-3 rounded-xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipsScreen;
