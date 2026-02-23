import { 
  Calendar, BarChart3, Settings, HelpCircle, Shield, X, ChevronRight, Megaphone, Download, RefreshCw, Bug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerInstall } from '@/components/pwa/InstallPrompt';
import { useConnection } from '@/contexts/ConnectionContext';

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

const isStandalone = typeof window !== 'undefined' && (
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true
);

const MoreSheet = ({ isOpen, onClose, onNavigate }: MoreSheetProps) => {
  const { syncAll, isConnected } = useConnection();

  const menuItems = [
    { id: 'bookings', icon: Calendar, label: 'Calendar / Bookings', color: 'text-blue-400', bg: 'bg-blue-400/20' },
    { id: 'reports', icon: BarChart3, label: 'Reports & Analytics', color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
    { id: 'promotions', icon: Megaphone, label: 'Promotions', color: 'text-purple-400', bg: 'bg-purple-400/20' },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'text-muted-foreground', bg: 'bg-secondary' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support', color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsl(var(--gold))]/20' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy', color: 'text-muted-foreground', bg: 'bg-secondary' },
    { id: 'debug', icon: Bug, label: 'Debug & Test Mode', color: 'text-destructive', bg: 'bg-destructive/20' },
    ...(!isStandalone ? [{ id: 'install', icon: Download, label: 'Install Admin App', color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsl(var(--gold))]/20' }] : []),
  ];

  if (!isOpen) return null;

  const handleItemClick = (id: string) => {
    if (id === 'install') {
      onClose();
      triggerInstall.trigger();
      return;
    }
    onNavigate(id);
    onClose();
  };

  const handleSync = async () => {
    onClose();
    await syncAll();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl rounded-t-3xl border-t border-border/50 animate-slide-up">
        <div className="flex justify-center py-3"><div className="w-12 h-1.5 rounded-full bg-border" /></div>
        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="text-lg font-bold">More Options</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent/30 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Sync Data button */}
        <div className="px-4 pb-3">
          <button
            onClick={handleSync}
            className={cn(
              "w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all active:scale-[0.98]",
              isConnected
                ? "bg-available/10 border-available/20 hover:bg-available/20"
                : "bg-destructive/10 border-destructive/20 hover:bg-destructive/20"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              isConnected ? "bg-available/20" : "bg-destructive/20"
            )}>
              <RefreshCw className={cn("w-4 h-4", isConnected ? "text-available" : "text-destructive")} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Sync Data</p>
              <p className="text-xs text-muted-foreground">Refresh all club data from database</p>
            </div>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-available animate-pulse" : "bg-destructive"
            )} />
          </button>
        </div>

        <div className="px-4 pb-8 space-y-2">
          {menuItems.map((item, index) => (
            <button key={item.id} onClick={() => handleItemClick(item.id)}
              className="w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 flex items-center gap-4 transition-all active:scale-[0.98]"
              style={{ animationDelay: `${index * 0.05}s` }}>
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", item.bg)}>
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="h-safe" />
      </div>
    </div>
  );
};

export default MoreSheet;
