import { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, startOfYear, eachMonthOfInterval } from 'date-fns';
import { useMatchHistory, useClubId, useBookings, useTournaments } from '@/hooks/useSupabaseQuery';
import Header from '@/components/layout/Header';
import { BarChart3, TrendingUp, Calendar, Download, DollarSign, Clock, ArrowUpRight, BookOpen, Trophy, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import React, { Suspense, lazy } from 'react';

const ReportsRevenueChart = lazy(() => import('@/components/reports/ReportsRevenueChart'));

type RangeType = 'predefined' | 'custom' | 'month-select';

const ReportsScreen = () => {
  const { clubId } = useClubId();
  const { data: matches = [] } = useMatchHistory(clubId || null);
  const { data: bookings = [] } = useBookings(clubId || null);
  const { data: tournaments = [] } = useTournaments(clubId || null);
  
  const [rangeType, setRangeType] = useState<RangeType>('predefined');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('7d');
  
  // Custom Range State
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Month Select State
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  const months = useMemo(() => {
    const start = startOfYear(new Date());
    const end = endOfMonth(new Date());
    return eachMonthOfInterval({ start, end }).reverse();
  }, []);

  // Compute actual start/end for filtering
  const filterRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = endOfMonth(now);

    if (rangeType === 'predefined') {
      switch (dateRange) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case '7d':
          start = subDays(now, 7);
          break;
        case '30d':
          start = subDays(now, 30);
          break;
      }
    } else if (rangeType === 'custom') {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else if (rangeType === 'month-select') {
      start = startOfMonth(selectedMonth);
      end = endOfMonth(selectedMonth);
    }

    return { start, end };
  }, [rangeType, dateRange, customStart, customEnd, selectedMonth]);

  // Filter Data
  const filteredData = useMemo(() => {
    const { start, end } = filterRange;
    return {
      matches: matches.filter(m => isWithinInterval(new Date(m.date), { start, end })),
      bookings: bookings.filter(b => isWithinInterval(new Date(b.date), { start, end })),
      tournaments: tournaments.filter(t => isWithinInterval(new Date(t.date), { start, end }))
    };
  }, [matches, bookings, tournaments, filterRange]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const { matches: fMatches, bookings: fBookings, tournaments: fTournaments } = filteredData;
    
    const totalRevenue = fMatches.reduce((sum, m) => sum + m.totalBill, 0);
    const totalDurationMs = fMatches.reduce((sum, m) => sum + m.duration, 0);
    const totalMatches = fMatches.length;
    const totalBookings = fBookings.length;
    const totalTournaments = fTournaments.length;
    
    // Revenue by Day
    const revByDay = fMatches.reduce((acc, match) => {
      const day = format(new Date(match.date), 'MMM dd');
      acc[day] = (acc[day] || 0) + match.totalBill;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(revByDay)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    const tableActivity = fMatches.reduce((acc, m) => {
      const table = `Table ${String(m.tableNumber).padStart(2, '0')}`;
      acc[table] = (acc[table] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgDurationTotal = totalMatches ? Math.round((totalDurationMs / 60000) / totalMatches) : 0;

    return { 
      totalRevenue, 
      totalMatches, 
      totalBookings,
      totalTournaments,
      avgDuration: avgDurationTotal,
      chartData,
      tableActivity: Object.entries(tableActivity).sort((a, b) => b[1] - a[1]).slice(0, 4)
    };
  }, [filteredData]);

  const handleExport = () => {
    if (!filteredData.matches.length && !filteredData.bookings.length && !filteredData.tournaments.length) {
      return toast.error('No data to export');
    }
    
    const { matches: fMatches, bookings: fBookings, tournaments: fTournaments } = filteredData;
    const { start, end } = filterRange;

    let csvContent = `CUE MASTER REPORT\n`;
    csvContent += `Period: ${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}\n`;
    csvContent += `Generated at: ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n\n`;

    csvContent += `SUMMARY\n`;
    csvContent += `Total Revenue,₹${stats.totalRevenue}\n`;
    csvContent += `Total Matches,${stats.totalMatches}\n`;
    csvContent += `Avg Match Duration,${stats.avgDuration} min\n`;
    csvContent += `Total Bookings,${stats.totalBookings}\n`;
    csvContent += `Tournaments Held,${stats.totalTournaments}\n\n`;

    if (fMatches.length > 0) {
      csvContent += `MATCH DETAILS\n`;
      csvContent += `Date,Table,Duration (min),Total Bill,Split Count\n`;
      fMatches.forEach(m => {
        csvContent += `${format(new Date(m.date), 'yyyy-MM-dd HH:mm')},${m.tableNumber},${Math.round(m.duration/60000)},${m.totalBill},${m.splitCount || 1}\n`;
      });
      csvContent += `\n`;
    }

    if (fBookings.length > 0) {
      csvContent += `BOOKING DETAILS\n`;
      csvContent += `Date,Customer,Time,Status,Note\n`;
      fBookings.forEach(b => {
        csvContent += `${format(new Date(b.date), 'yyyy-MM-dd')},"${b.customerName}",${b.startTime}-${b.endTime},${b.status},"${b.note || ''}"\n`;
      });
      csvContent += `\n`;
    }

    if (fTournaments.length > 0) {
      csvContent += `TOURNAMENT DETAILS\n`;
      csvContent += `Name,Date,Type,Entry Fee,Winner\n`;
      fTournaments.forEach(t => {
        csvContent += `"${t.name}",${format(new Date(t.date), 'yyyy-MM-dd')},${t.type},${t.entryFee},${t.winner || 'TBD'}\n`;
      });
      csvContent += `\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuemaster-report-${format(start, 'yyyyMMdd')}-to-${format(end, 'yyyyMMdd')}.csv`;
    a.click();
    toast.success('Report downloaded with full details');
  };

  const KPIs = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total Matches', value: stats.totalMatches.toLocaleString(), icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Avg Duration', value: `${stats.avgDuration}m`, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Bookings', value: stats.totalBookings.toLocaleString(), icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Tournaments', value: stats.totalTournaments.toLocaleString(), icon: Trophy, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsl(var(--gold))]/10' },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header title="Reports & Analytics" />

      <div className="px-4 mt-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Controls Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center glass-card p-4 rounded-3xl">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {/* Range Type Selector */}
              <div className="flex p-1 bg-secondary/50 rounded-2xl gap-1">
                <button
                  onClick={() => setRangeType('predefined')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    rangeType === 'predefined' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  Quick
                </button>
                <button
                  onClick={() => setRangeType('month-select')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    rangeType === 'month-select' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  Month
                </button>
                <button
                  onClick={() => setRangeType('custom')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    rangeType === 'custom' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  Custom
                </button>
              </div>

              {/* Range Sub-Controls */}
              <div className="flex-1 min-w-[200px]">
                {rangeType === 'predefined' && (
                  <div className="flex items-center gap-2 p-1 bg-secondary/30 rounded-2xl">
                    {['today', '7d', '30d'].map(range => (
                      <button
                        key={range}
                        onClick={() => setDateRange(range as any)}
                        className={cn(
                          "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize",
                          dateRange === range ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                )}

                {rangeType === 'month-select' && (
                  <select
                    value={selectedMonth.toISOString()}
                    onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                    className="w-full bg-secondary/30 border border-white/5 rounded-2xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[hsl(var(--gold))]/30 transition-all appearance-none cursor-pointer"
                  >
                    {months.map((m) => (
                      <option key={m.toISOString()} value={m.toISOString()} className="bg-[#121212]">
                        {format(m, 'MMMM yyyy')}
                      </option>
                    ))}
                  </select>
                )}

                {rangeType === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="flex-1 bg-secondary/30 border border-white/5 rounded-2xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-[hsl(var(--gold))]/30 transition-all"
                    />
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="flex-1 bg-secondary/30 border border-white/5 rounded-2xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-[hsl(var(--gold))]/30 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handleExport}
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-[hsl(var(--gold))] text-black font-black flex items-center justify-center gap-2 hover:bg-[hsl(var(--gold))]/90 transition-all active:scale-95 shadow-lg shadow-[hsl(var(--gold))]/10"
            >
              <Download className="w-4 h-4" />
              EXPORT CSV
            </button>
          </div>
          
          <div className="flex items-center gap-2 px-6 py-2 text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
            <CalendarDays className="w-3 h-3" />
            Active Period: {format(filterRange.start, 'MMM dd, yyyy')} — {format(filterRange.end, 'MMM dd, yyyy')}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {KPIs.map((kpi, idx) => (
            <div key={idx} className="glass-card p-5 rounded-3xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl", kpi.bg)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">{kpi.value}</h3>
              <div className={cn("absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity", kpi.bg)} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 rounded-3xl min-h-[400px]">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Revenue Trend
            </h3>
            <div className="h-[300px] w-full">
              {stats.chartData.length > 0 ? (
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-sm text-gray-500 animate-pulse">Loading Chart...</div>}>
                  <ReportsRevenueChart data={stats.chartData} />
                </Suspense>
              ) : (
                <div className="w-full h-[300px] flex flex-col items-center justify-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                  <p>No revenue data for this period</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl min-h-[400px]">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Most Active Tables
            </h3>
            <div className="space-y-4">
              {stats.tableActivity.map(([table, count], i) => (
                <div key={table} className="bg-secondary/30 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {i + 1}
                    </div>
                    <span className="font-medium text-gray-200">{table}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{count}</p>
                    <p className="text-xs text-gray-500">matches</p>
                  </div>
                </div>
              ))}
              {stats.tableActivity.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  <p>No table activity recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Match History List */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Detailed Match History
            </h3>
            <span className="text-[10px] font-black bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full uppercase tracking-widest">
              {filteredData.matches.length} Matches Found
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Table</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Players</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Duration</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Total Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.matches.slice(0, 50).map((match) => (
                  <tr key={match.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white mb-0.5">{format(new Date(match.date), 'MMM dd, yyyy')}</div>
                      <div className="text-[10px] text-gray-500 font-medium uppercase">{format(new Date(match.date), 'hh:mm a')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-black text-xs border border-white/5 group-hover:border-white/10 transition-all">
                        {match.tableNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {match.players.map((p, idx) => (
                          <span key={idx} className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            p.result === 'win' 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : "bg-white/5 text-gray-400 border-white/5"
                          )}>
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-black text-white">{Math.round(match.duration / 60000)}m</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-[hsl(var(--gold))]">₹{match.totalBill.toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
                {filteredData.matches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-500 italic text-sm">
                      No matches recorded for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredData.matches.length > 50 && (
            <div className="p-4 bg-white/[0.01] text-center border-t border-white/5">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Showing top 50 matches — Use CSV export for full history
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;
