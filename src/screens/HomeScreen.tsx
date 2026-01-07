import Header from '@/components/layout/Header';
import { useMembers } from '@/contexts/MembersContext';
import { initialTables } from '@/data/mockData';
import { 
  Table2, 
  Users, 
  Trophy, 
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeScreenProps {
  onNavigate: (tab: 'tables' | 'events' | 'members') => void;
}

const HomeScreen = ({ onNavigate }: HomeScreenProps) => {
  const { members, clubSettings } = useMembers();
  const tables = initialTables;
  
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const freeTables = tables.filter(t => t.status === 'free').length;
  const totalRevenue = tables.reduce((sum, t) => sum + t.totalBill, 0);
  const pendingCredits = members.filter(m => m.creditBalance < 0).reduce((sum, m) => sum + Math.abs(m.creditBalance), 0);
  
  const stats = [
    { 
      label: 'Active Tables', 
      value: `${occupiedTables}/${tables.length}`, 
      icon: Table2, 
      color: 'text-live',
      bgColor: 'bg-live/20',
      onClick: () => onNavigate('tables')
    },
    { 
      label: 'Members Online', 
      value: '8', 
      icon: Users, 
      color: 'text-available',
      bgColor: 'bg-available/20',
      onClick: () => onNavigate('members')
    },
    { 
      label: "Today's Revenue", 
      value: `₹${totalRevenue.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-[hsl(var(--gold))]',
      bgColor: 'bg-[hsl(var(--gold))]/20'
    },
    { 
      label: 'Pending Credits', 
      value: `₹${pendingCredits.toLocaleString()}`, 
      icon: AlertCircle, 
      color: 'text-paused',
      bgColor: 'bg-paused/20'
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header title="CueMaster" />
      
      <div className="px-4 space-y-6">
        {/* Club Status Banner */}
        <div className={cn(
          "glass-card p-4 flex items-center justify-between",
          clubSettings.isOpen ? "border-available/30" : "border-paused/30"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              clubSettings.isOpen ? "bg-available" : "bg-paused"
            )} />
            <div>
              <p className="font-semibold">Club Status</p>
              <p className={cn(
                "text-sm",
                clubSettings.isOpen ? "text-available" : "text-paused"
              )}>
                {clubSettings.isOpen ? 'Open for Business' : 'Currently Closed'}
              </p>
            </div>
          </div>
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <button
              key={index}
              onClick={stat.onClick}
              disabled={!stat.onClick}
              className={cn(
                "glass-card p-4 text-left transition-all",
                stat.onClick && "hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bgColor)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => onNavigate('tables')}
              className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-accent/30 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Table2 className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium">Tables</span>
            </button>
            <button 
              onClick={() => onNavigate('events')}
              className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-accent/30 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[hsl(var(--gold))]" />
              </div>
              <span className="text-xs font-medium">Events</span>
            </button>
            <button 
              onClick={() => onNavigate('members')}
              className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-accent/30 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-available/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-available" />
              </div>
              <span className="text-xs font-medium">Members</span>
            </button>
          </div>
        </div>

        {/* Active Tables Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active Tables</h3>
            <button 
              onClick={() => onNavigate('tables')}
              className="text-xs text-primary font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {tables.filter(t => t.status === 'occupied').slice(0, 3).map(table => (
              <div key={table.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-live/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-live">{table.tableNumber.toString().padStart(2, '0')}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{table.players.join(', ')}</p>
                    <p className="text-xs text-muted-foreground">{table.players.length} players</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[hsl(var(--gold))]">₹{table.totalBill}</p>
                  <div className="flex items-center gap-1 text-xs text-live">
                    <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
                    Live
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
