import { 
  Calendar, 
  Camera, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Shield,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

const MoreSheet = ({ isOpen, onClose, onNavigate }: MoreSheetProps) => {
  const menuItems = [
    { id: 'bookings', icon: Calendar, label: 'Calendar / Bookings', color: 'text-blue-400', bg: 'bg-blue-400/20' },
    { id: 'cctv', icon: Camera, label: 'CCTV Monitoring', color: 'text-purple-400', bg: 'bg-purple-400/20' },
    { id: 'reports', icon: BarChart3, label: 'Reports & Analytics', color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'text-muted-foreground', bg: 'bg-secondary' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support', color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsl(var(--gold))]/20' },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy', color: 'text-muted-foreground', bg: 'bg-secondary' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl rounded-t-3xl border-t border-border/50 animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="text-lg font-bold">More Options</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="px-4 pb-8 space-y-2">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 flex items-center gap-4 transition-all active:scale-[0.98]"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", item.bg)}>
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Safe Area Padding */}
        <div className="h-safe" />
      </div>
    </div>
  );
};

export default MoreSheet;
