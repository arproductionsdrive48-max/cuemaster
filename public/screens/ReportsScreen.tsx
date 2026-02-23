import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { useMembers } from '@/contexts/MembersContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, IndianRupee, CreditCard, Utensils, Clock, Calendar, Download, BarChart3, Globe, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isAfter, isToday, startOfWeek, startOfMonth, isSameDay, subDays, getDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AnalyticsDashboard from '@/components/reports/AnalyticsDashboard';

const salesBreakdown = [
  { name: 'Table', value: 65, color: 'hsl(0, 84%, 60%)' },
  { name: 'Food', value: 25, color: 'hsl(142, 76%, 45%)' },
  { name: 'Drinks', value: 10, color: 'hsl(45, 93%, 58%)' },
];

type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ReportsScreen = () => {
  const { matchHistory, members, isOnline } = useMembers();
  const [activeSection, setActiveSection] = useState<'revenue' | 'analytics'>('revenue');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  const now = new Date();
  const getFilteredMatches = () => {
    switch (dateFilter) {
      case 'today': return matchHistory.filter(m => isToday(m.date));
      case 'week': {
        const start = startOfWeek(now);
        return matchHistory.filter(m => isAfter(m.date, start));
      }
      case 'month': {
        const start = startOfMonth(now);
        return matchHistory.filter(m => isAfter(m.date, start));
      }
      case 'custom': {
        if (!customDate) return matchHistory;
        return matchHistory.filter(m => isSameDay(m.date, customDate));
      }
      default: return matchHistory;
    }
  };

  const filtered = getFilteredMatches();

  const dailyRevenue = useMemo(() => {
    return DAYS.map((day, idx) => {
      const targetDate = subDays(new Date(), (getDay(new Date()) - idx + 7) % 7);
      const amount = matchHistory
        .filter(m => isSameDay(m.date, targetDate))
        .reduce((sum, m) => sum + m.totalBill, 0);
      return { day, amount };
    });
  }, [matchHistory]);

  const totalRevenue = filtered.reduce((sum, m) => sum + m.totalBill, 0);
  const nonZeroDays = dailyRevenue.filter(d => d.amount > 0).length || 1;
  const avgDaily = Math.round(dailyRevenue.reduce((s, d) => s + d.amount, 0) / nonZeroDays);
  const pendingCredits = members.filter(m => m.creditBalance < 0).reduce((sum, m) => sum + Math.abs(m.creditBalance), 0);

  const formatDuration = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error('No data to export for the selected period');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const data = filtered.map(match => ({
        'Date': format(match.date, 'yyyy-MM-dd'),
        'Start Time': match.sessionStartTime ? format(match.sessionStartTime, 'hh:mm a') : '—',
        'End Time': match.sessionEndTime ? format(match.sessionEndTime, 'hh:mm a') : format(match.date, 'hh:mm a'),
        'Table': match.tableNumber,
        'Players': match.players.map(p => `${p.name} (${p.result})`).join(', '),
        'Duration': formatDuration(match.duration),
        'Billing Mode': match.billingMode.replace('_', ' '),
        'Total Bill (₹)': match.totalBill,
        'Payment Method': (match as any).paymentMethod || 'N/A',
        'Split': (match as any).splitCount || 1,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Match History');
      XLSX.writeFile(wb, `CueMaster_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Report exported successfully!');
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title="Reports" />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – report data unavailable</p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 rounded-2xl bg-secondary/50">
          <button onClick={() => setActiveSection('revenue')} className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            activeSection === 'revenue' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}>
            <BarChart3 className="w-4 h-4" /> Revenue
          </button>
          <button onClick={() => setActiveSection('analytics')} className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            activeSection === 'analytics' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}>
            <Globe className="w-4 h-4" /> Analytics
          </button>
        </div>
      </div>

      {activeSection === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <>
          <div className="px-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              {([
                { id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' }, { id: 'all', label: 'All Time' },
              ] as const).map(f => (
                <button key={f.id} onClick={() => setDateFilter(f.id)} className={cn(
                  'flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  dateFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium h-auto',
                      dateFilter === 'custom'
                        ? 'bg-[hsl(var(--gold))] text-black hover:bg-[hsl(var(--gold))]/90'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {dateFilter === 'custom' && customDate ? format(customDate, 'MMM d, yyyy') : 'Pick Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[60] bg-background border-border" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={customDate}
                    onSelect={(date) => {
                      setCustomDate(date);
                      setDateFilter('custom');
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium h-auto bg-available/20 text-available hover:bg-available/30"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="px-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-available/20 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-available" /></div>
                  <span className="text-sm text-muted-foreground">Revenue</span>
                </div>
                <div className="flex items-center gap-1"><IndianRupee className="w-5 h-5" /><span className="text-2xl font-bold">{totalRevenue.toLocaleString()}</span></div>
                <p className="text-xs text-muted-foreground mt-1">{filtered.length} sessions</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center"><Clock className="w-4 h-4 text-muted-foreground" /></div>
                  <span className="text-sm text-muted-foreground">Avg Daily</span>
                </div>
                <div className="flex items-center gap-1"><IndianRupee className="w-5 h-5" /><span className="text-2xl font-bold">{avgDaily.toLocaleString()}</span></div>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center"><CreditCard className="w-4 h-4 text-primary" /></div>
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-1 text-primary"><IndianRupee className="w-5 h-5" /><span className="text-2xl font-bold">{pendingCredits.toLocaleString()}</span></div>
                <p className="text-xs text-muted-foreground mt-1">{members.filter(m => m.creditBalance < 0).length} members</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center"><Utensils className="w-4 h-4 text-[hsl(var(--gold))]" /></div>
                  <span className="text-sm text-muted-foreground">F&B Sales</span>
                </div>
                <div className="flex items-center gap-1"><IndianRupee className="w-5 h-5" /><span className="text-2xl font-bold">—</span></div>
                <p className="text-xs text-muted-foreground mt-1">Track via inventory</p>
              </div>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          <div className="px-4 mb-6">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4">Daily Revenue (This Week)</h3>
              {matchHistory.length === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No session data yet</p>
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyRevenue}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(0 0% 55%)', fontSize: 12 }} />
                      <YAxis hide />
                      <Bar dataKey="amount" fill="hsl(0 84% 60%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="px-4 mb-6">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4">Sales Breakdown</h3>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={salesBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                        {salesBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {salesBreakdown.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div className="px-4 mb-6">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[hsl(var(--gold))]" />
                Match History ({filtered.length})
              </h3>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isOnline ? 'No matches in this period' : 'Connect to Supabase to view match history'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filtered.map(match => (
                    <div key={match.id} className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Table {match.tableNumber}</span>
                        <span className="text-xs text-muted-foreground">{format(match.date, 'MMM d, h:mm a')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {match.players.map((p, i) => (
                            <span key={i} className={cn(
                              'text-xs font-bold px-1.5 py-0.5 rounded',
                              p.result === 'win' ? 'bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]' : 'bg-primary/20 text-primary'
                            )}>
                              {p.result === 'win' ? 'W' : 'L'} {p.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDuration(match.duration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsScreen;
