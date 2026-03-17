import { Home, Table2, Trophy, Users, MoreHorizontal, Settings, PieChart, Calendar, Wallet, Tags, Zap, Shield, Smartphone } from 'lucide-react';
import { TabType } from '@/types';
import { cn } from '@/lib/utils';
import { triggerInstall } from '@/components/pwa/InstallPrompt';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeMoreScreen: string | null;
  onMoreChange: (screen: string | null) => void;
  brandLogo?: string | null;
  brandName?: string | null;
}

export default function Sidebar({ activeTab, onTabChange, activeMoreScreen, onMoreChange, brandLogo, brandName }: SidebarProps) {
  
  // Handlers to reset states across the split Index.tsx routing
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
    { id: 'bookings', icon: Calendar, label: 'Calendar Details' },
    { id: 'memberships', icon: Wallet, label: 'Memberships' },
    { id: 'promotions', icon: Tags, label: 'Promotions' },
    { id: 'settings', icon: Settings, label: 'Club Settings' },
  ];

  const systemTabs = [
    { id: 'help', icon: Zap, label: 'Help & Support' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy' },
    { id: 'debug', icon: Zap, label: 'Debug Mode' },
  ];

  return (
    <aside className="w-64 h-screen bg-background border-r border-white/5 flex flex-col hidden md:flex shrink-0">
      
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {brandLogo ? (
            <img src={brandLogo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/20 flex items-center justify-center border border-[hsl(var(--gold))]/30">
              <span className="text-[hsl(var(--gold))] font-bold text-lg">C</span>
            </div>
          )}
          <span className="font-bold text-lg text-white truncate max-w-[140px] tracking-tight">
            {brandName || 'CueMaster'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-hide">
        
        {/* Core Nav */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Main Menu</p>
          <div className="space-y-1">
            {primaryTabs.map((req) => {
              const isActive = activeTab === req.id && !activeMoreScreen;
              return (
                <button
                  key={req.id}
                  onClick={() => navigateMain(req.id as TabType)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                    isActive 
                      ? "border border-[hsl(var(--gold))] text-[hsl(var(--gold))] font-bold" 
                      : "border border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <req.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {req.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Extensions */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Management</p>
          <div className="space-y-1">
            {secondaryTabs.map((req) => {
              const isActive = activeMoreScreen === req.id;
              return (
                <button
                  key={req.id}
                  onClick={() => navigateMore(req.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                    isActive 
                      ? "border border-[hsl(var(--gold))] text-[hsl(var(--gold))] font-bold" 
                      : "border border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <req.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {req.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Support */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">System</p>
          <div className="space-y-1">
            {systemTabs.map((req) => {
              const isActive = activeMoreScreen === req.id;
              return (
                <button
                  key={req.id}
                  onClick={() => navigateMore(req.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                    isActive 
                      ? "border border-[hsl(var(--gold))] text-[hsl(var(--gold))] font-bold" 
                      : "border border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <req.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {req.label}
                </button>
              );
            })}
            
            {/* PWA Install Button inline */}
             <button
                onClick={() => triggerInstall.trigger()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10"
              >
                <Smartphone className="w-5 h-5 transition-transform group-hover:scale-110" />
                Install Admin App
              </button>
          </div>
        </div>

      </div>
    </aside>
  );
}
