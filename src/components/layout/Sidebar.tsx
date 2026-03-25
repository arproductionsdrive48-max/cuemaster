import { Home, Table2, Trophy, Users, Settings, PieChart, Calendar, Wallet, Tags, Zap, Shield, Smartphone, Store } from 'lucide-react';
import { TabType } from '@/types';
import { cn } from '@/lib/utils';
import { triggerInstall } from '@/components/pwa/InstallPrompt';
import { useMembers } from '@/contexts/MembersContext';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeMoreScreen: string | null;
  onMoreChange: (screen: string | null) => void;
  brandLogo?: string | null;
  brandName?: string | null;
}

export default function Sidebar({ activeTab, onTabChange, activeMoreScreen, onMoreChange, brandLogo, brandName }: SidebarProps) {
  const { clubSettings, updateClubSettings } = useMembers();

  const navigateMain = (tab: TabType) => {
    onMoreChange(null);
    onTabChange(tab);
  };
  
  const navigateMore = (screen: string) => {
    onMoreChange(screen);
  };

  const primaryTabs = [
    { id: 'home', icon: Home, label: 'Dashboard' },
    { id: 'tables', icon: Table2, label: 'Tables' },
    { id: 'events', icon: Trophy, label: 'Tournaments' },
    { id: 'members', icon: Users, label: 'Players' },
  ];

  const secondaryTabs = [
    { id: 'reports', icon: PieChart, label: 'Reports & Analytics' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'memberships', icon: Wallet, label: 'Memberships' },
    { id: 'promotions', icon: Tags, label: 'Promotions' },
    { id: 'settings', icon: Settings, label: 'Club Settings' },
  ];

  const systemTabs = [
    { id: 'help', icon: Zap, label: 'Help & Support' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy' },
  ];

  const NavItem = ({ id, icon: Icon, label, isActive, onClick }: {
    id: string; icon: any; label: string; isActive: boolean; onClick: () => void;
  }) => (
    <button
      key={id}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium relative",
        isActive
          ? "bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] font-bold shadow-[inset_0_0_0_1px_hsl(var(--gold)/0.3)]"
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[hsl(var(--gold))] rounded-r-full" />
      )}
      <Icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "scale-110" : "group-hover:scale-105")} />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <aside className="w-64 h-screen bg-[#0d0d0d] border-r border-white/5 flex flex-col hidden md:flex shrink-0">
      
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {brandLogo ? (
            <img src={brandLogo} alt="Logo" className="w-9 h-9 rounded-xl object-cover ring-1 ring-[hsl(var(--gold))]/20" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))]/30 to-[hsl(var(--gold))]/10 flex items-center justify-center border border-[hsl(var(--gold))]/30 shrink-0">
              <span className="text-[hsl(var(--gold))] font-bold text-base">S</span>
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold text-base text-white truncate block max-w-[120px] tracking-tight">
              {brandName || 'Snook OS'}
            </span>
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">Admin Panel</span>
          </div>
        </div>
        {/* Open/Closed toggle */}
        <button
          onClick={() => updateClubSettings({ isOpen: !clubSettings.isOpen })}
          title={clubSettings.isOpen ? 'Club is Open — click to close' : 'Club is Closed — click to open'}
          className={cn(
            'shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
            clubSettings.isOpen
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-gray-700/40 border-white/10 text-gray-500 hover:bg-gray-700/60'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', clubSettings.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600')} />
          {clubSettings.isOpen ? 'Open' : 'Closed'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6 scrollbar-hide">
        
        {/* Core Nav */}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-3">Main</p>
          <div className="space-y-0.5">
            {primaryTabs.map((req) => (
              <NavItem
                key={req.id}
                id={req.id}
                icon={req.icon}
                label={req.label}
                isActive={activeTab === req.id && !activeMoreScreen}
                onClick={() => navigateMain(req.id as TabType)}
              />
            ))}
          </div>
        </div>

        {/* Management */}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-3">Management</p>
          <div className="space-y-0.5">
            {secondaryTabs.map((req) => (
              <NavItem
                key={req.id}
                id={req.id}
                icon={req.icon}
                label={req.label}
                isActive={activeMoreScreen === req.id}
                onClick={() => navigateMore(req.id)}
              />
            ))}
          </div>
        </div>

        {/* System */}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-3">System</p>
          <div className="space-y-0.5">
            {systemTabs.map((req) => (
              <NavItem
                key={req.id}
                id={req.id}
                icon={req.icon}
                label={req.label}
                isActive={activeMoreScreen === req.id}
                onClick={() => navigateMore(req.id)}
              />
            ))}
            <button
              onClick={() => triggerInstall.trigger()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium text-[hsl(var(--gold))]/70 hover:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/5"
            >
              <Smartphone className="w-5 h-5 shrink-0" />
              Install Admin App
            </button>
          </div>
        </div>
      </div>

      {/* Version Watermark */}
      <div className="px-5 py-4 border-t border-white/5 shrink-0">
        <p className="text-[10px] text-gray-700 font-medium tracking-widest uppercase">Snook OS • v2.0.0</p>
        <p className="text-[9px] text-gray-800 mt-0.5">Professional Snooker Club Manager</p>
      </div>
    </aside>
  );
}
