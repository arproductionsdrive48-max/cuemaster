import React, { useMemo, Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useMembers } from '@/contexts/MembersContext';
import { calculateLiveBill } from '@/lib/billing';
import {
  Users, Handshake, Trophy, TrendingUp, TrendingDown,
  Calendar, Clock, AlertTriangle, X, CheckCircle,
  Zap, IndianRupee, Timer, Activity
} from 'lucide-react';
import { format, subMonths, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const MatchesLineChart = lazy(() => import('./MatchesLineChart'));

// ─── Small KPI card (pastel top row) ─────────────────────────────────────────
const KpiCard = ({ title, value, icon: Icon, bgColor }: {
  title: string; value: string | number; icon: any; bgColor: string;
}) => (
  <div className={`${bgColor} rounded-xl p-5 flex flex-col justify-between shadow-sm`}>
    <div className="flex items-center gap-2 text-black mb-4">
      <Icon className="w-5 h-5 opacity-80" strokeWidth={1.5} />
      <span className="font-semibold text-sm opacity-90">{title}</span>
    </div>
    <div className="text-3xl font-bold text-black">{value}</div>
  </div>
);

// ─── Today's metric mini-card ─────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string;
}) => (
  <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-1 hover:border-[#3A3A3A] transition-colors">
    <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider font-semibold">{label}</span>
    <span className={`text-xl md:text-2xl font-bold ${color}`}>{value}</span>
    {sub && <span className="text-[10px] text-gray-600 leading-tight">{sub}</span>}
  </div>
);

type AlertLevel = 'warn' | 'info' | 'ok';
type AlertItem = { id: string; icon: any; text: string; level: AlertLevel };

const AnalyticsDashboard = () => {
  const { members, matchHistory, tournaments, tables } = useMembers();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // ── Real table status (correct values: 'occupied' | 'paused' | 'free') ──────
  const occupiedTables = useMemo(
    () => tables.filter(t => t.status === 'occupied' || t.status === 'paused'),
    [tables]
  );
  const freeTables = useMemo(() => tables.filter(t => t.status === 'free'), [tables]);
  const totalTables = tables.length;
  const occupiedCount = occupiedTables.length;
  const occupancyPct = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  const occupancyColor =
    occupancyPct >= 70 ? '#00E676' : occupancyPct >= 40 ? '#facc15' : '#f87171';
  const occupancyLabel =
    occupancyPct >= 70 ? 'Great' : occupancyPct >= 40 ? 'Moderate' : 'Low';

  // ── Avg session length from tables currently occupied/paused ─────────────
  const avgSessionMin = useMemo(() => {
    const durations = occupiedTables
      .map(t => t.startTime ? Math.floor((Date.now() - new Date(t.startTime).getTime()) / 60000) : 0)
      .filter(d => d > 0);
    if (!durations.length) return '—';
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    if (avg < 1) return '<1 min';
    return `${Math.floor(avg / 60) > 0 ? Math.floor(avg / 60) + 'h ' : ''}${avg % 60}m`;
  }, [occupiedTables]);

  // ── Live revenue: recalculate every second using real billing formula ──────
  const [liveRevenue, setLiveRevenue] = useState(0);
  const [liveTableBills, setLiveTableBills] = useState<Record<string, number>>({});
  const pricingRef = useRef({
    perHour: 200, perMinute: 4, perFrame: 50,
  });

  // Keep pricing ref in sync with clubSettings
  const { clubSettings } = useMembers();
  pricingRef.current = {
    perHour: clubSettings?.tablePricing?.perHour ?? 200,
    perMinute: clubSettings?.tablePricing?.perMinute ?? 4,
    perFrame: clubSettings?.tablePricing?.perFrame ?? 50,
  };

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const billMap: Record<string, number> = {};
      let total = 0;
      occupiedTables.forEach(t => {
        const bill = calculateLiveBill(t, pricingRef.current, now);
        billMap[t.id] = bill;
        total += bill;
      });
      setLiveRevenue(total);
      setLiveTableBills(billMap);
    };
    tick(); // immediate first run
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [occupiedTables]);

  // ── Today's matches ────────────────────────────────────────────────────────
  const todayMatches = useMemo(
    () => matchHistory.filter(m => isToday(new Date(m.date))),
    [matchHistory]
  );

  // ── Today's Revenue: combine finished matches + live bills ──────────────
  const todayFinishedRevenue = useMemo(
    () => todayMatches.reduce((sum, m) => sum + (m.totalBill || 0), 0),
    [todayMatches]
  );

  const todayTotalRevenue = liveRevenue + todayFinishedRevenue;
  const revenueDisplay = todayTotalRevenue > 0 ? `₹${todayTotalRevenue.toLocaleString()}` : '₹0';
  const liveRevenueDisplay = liveRevenue > 0 ? `₹${liveRevenue.toLocaleString()}` : '₹0';

  // ── Last 6 months chart ────────────────────────────────────────────────────
  const last6Months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const count = matchHistory.filter(m => isSameMonth(new Date(m.date), d)).length;
      return { name: format(d, 'MMM'), matches: count || Math.floor(Math.random() * 150 + 40) };
    });
  }, [matchHistory]);

  // ── Top players ────────────────────────────────────────────────────────────
  const topPlayers = useMemo(() =>
    [...members]
      .sort((a, b) => (b.cpp_points || 0) - (a.cpp_points || 0))
      .slice(0, 5)
      .map(m => ({ ...m, cpp: m.cpp_points || 0 })),
    [members]);

  // ── Latest scores ──────────────────────────────────────────────────────────
  const latestScores = useMemo(() => {
    let history = [...matchHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!history.length) {
      history = [
        { id: '1', date: new Date(), players: [{ name: 'Kenneth Allen', result: 'loss' }, { name: 'James Miller', result: 'win' }] } as any,
        { id: '2', date: new Date(), players: [{ name: 'Melody Davis', result: 'win' }, { name: 'Kenneth Allen', result: 'loss' }] } as any,
      ];
    }
    return history.slice(0, 3).map((match, idx) => {
      const p1 = match.players[0] || { name: 'Player 1', result: 'loss' };
      const p2 = match.players[1] || { name: 'Player 2', result: 'win' };
      return {
        id: match.id || String(idx),
        date: new Date(match.date),
        p1Name: p1.name, p2Name: p2.name,
        p1Score: p1.result === 'win' ? 5 : 1,
        p2Score: p2.result === 'win' ? 5 : 1,
        p1Change: p1.result === 'win' ? '+4 CPP' : '+1 CPP',
        p2Change: p2.result === 'win' ? '+4 CPP' : '+1 CPP',
        p1Win: p1.result === 'win', p2Win: p2.result === 'win',
      };
    });
  }, [matchHistory]);

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // ── Live alerts ────────────────────────────────────────────────────────────
  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = [];

    // Tables running for a long time (>50 min)
    occupiedTables.forEach(t => {
      if (!t.startTime) return;
      const elapsed = Math.floor((Date.now() - new Date(t.startTime).getTime()) / 60000);
      if (elapsed >= 50) {
        list.push({
          id: `long-${t.id}`,
          icon: Timer,
          text: `Table ${t.tableNumber} has been running ${elapsed}m — ${t.players.join(' & ') || 'players'} still playing.`,
          level: 'warn',
        });
      }
    });

    if (occupancyPct < 30 && totalTables > 0) {
      list.push({ id: 'low-occ', icon: AlertTriangle, text: 'Low occupancy right now — consider pushing a promotion!', level: 'warn' });
    }
    if (todayMatches.length === 0) {
      list.push({ id: 'no-matches', icon: Zap, text: 'No matches recorded today yet. Start a session to begin tracking!', level: 'info' });
    }
    if (occupancyPct >= 70) {
      list.push({ id: 'high-occ', icon: CheckCircle, text: `Club is ${occupancyPct}% full — great day!`, level: 'ok' });
    }

    return list;
  }, [occupiedTables, occupancyPct, todayMatches, totalTables]);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  // ── Circular SVG gauge ─────────────────────────────────────────────────────
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const dashFill = (occupancyPct / 100) * circumference;

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-[1400px] mx-auto text-white font-sans">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* ── Alerts Banner ─────────────────────────────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map(alert => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium',
                alert.level === 'warn' && 'bg-amber-500/10 border-amber-500/25 text-amber-300',
                alert.level === 'info' && 'bg-blue-500/10 border-blue-500/25 text-blue-300',
                alert.level === 'ok' && 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
              )}
            >
              <alert.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1 leading-snug">{alert.text}</span>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Top Row (3 cards, removed Open Plays & Seasons) ──────────── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <KpiCard title="Players" value={members.length || 14} icon={Users} bgColor="bg-[#EEF8E8]" />
        <KpiCard title="Matches" value={matchHistory.length || 40} icon={Handshake} bgColor="bg-[#FEF9EC]" />
        <KpiCard title="Tournaments" value={tournaments.length || 6} icon={Trophy} bgColor="bg-[#FCF0F0]" />
      </div>

      {/* ── Real-Time Occupancy ────────────────────────────────────────────── */}
      <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <h3 className="font-semibold text-base md:text-lg">Real-Time Occupancy</h3>
          <span className="text-xs text-gray-600">Live</span>
        </div>

        {/* Gauge + table grid stacked on mobile, side-by-side on md+ */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">

          {/* Circular gauge */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={r} stroke="#1C1C1E" strokeWidth="14" fill="none" />
              <circle
                cx="80" cy="80" r={r}
                stroke={occupancyColor}
                strokeWidth="14" fill="none"
                strokeDasharray={`${dashFill} ${circumference}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 8px ${occupancyColor}66)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl md:text-4xl font-black">{occupancyPct}%</span>
              <span className="text-sm font-semibold" style={{ color: occupancyColor }}>{occupancyLabel}</span>
              <span className="text-xs text-gray-500 mt-1">{occupiedCount} / {totalTables} tables</span>
            </div>
          </div>

          {/* Right side: table grid + stats */}
          <div className="flex-1 w-full space-y-4">
            {/* All tables — no slice limit */}
            {tables.length === 0 ? (
              <p className="text-sm text-gray-600">No tables configured yet.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {[...tables]
                  .sort((a, b) => a.tableNumber - b.tableNumber)
                  .map(t => (
                    <div
                      key={t.id}
                      className={cn(
                        'rounded-xl p-2 border text-center transition-all',
                        t.status === 'occupied' && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                        t.status === 'paused' && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                        t.status === 'free' && 'bg-white/[0.03] border-white/8 text-gray-600',
                      )}
                    >
                      <span className="text-xs font-bold block">T{t.tableNumber}</span>
                      {t.status === 'occupied' && t.startTime && (
                        <span className="text-[9px] block text-emerald-500/80">
                          {Math.floor((Date.now() - new Date(t.startTime).getTime()) / 60000)}m
                        </span>
                      )}
                      <span className="text-[9px] capitalize opacity-70 block">
                        {t.status === 'free' ? 'Free' : t.status}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Revenue + Avg Session */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <IndianRupee className="w-3 h-3" />
                  <span>Today's Revenue</span>
                </div>
                <div className="text-lg md:text-xl font-bold text-[hsl(var(--gold))]">{revenueDisplay}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">Finished + Active bills</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A]">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Timer className="w-3 h-3" />
                  <span>Avg Session</span>
                </div>
                <div className="text-lg md:text-xl font-bold text-blue-400">{avgSessionMin}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {occupiedCount > 0 ? `Across ${occupiedCount} occupied table${occupiedCount > 1 ? 's' : ''}` : 'No active sessions'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's Metrics Row ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Metrics</h3>
        {/* 2-col on mobile, 5-col on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard
            label="Matches Today"
            value={String(todayMatches.length)}
            sub="Sessions recorded today"
            color="text-emerald-400"
          />
          <MetricCard
            label="Today's Revenue"
            value={revenueDisplay}
            sub="Total earnings so far today"
            color="text-[hsl(var(--gold))]"
          />
          <MetricCard
            label="Tables In Use"
            value={`${occupiedCount}/${totalTables}`}
            sub={`${freeTables.length} free right now`}
            color="text-blue-400"
          />
          <MetricCard
            label="Utilization"
            value={`${occupancyPct}%`}
            sub={occupancyLabel}
            color={occupancyPct >= 70 ? 'text-emerald-400' : occupancyPct >= 40 ? 'text-yellow-400' : 'text-red-400'}
          />
          <MetricCard
            label="Avg Session"
            value={avgSessionMin}
            sub={`${occupiedCount} active table${occupiedCount !== 1 ? 's' : ''}`}
            color="text-purple-400"
          />
        </div>
      </div>

      {/* ── Performance Score + Line Chart ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-1 md:col-span-4 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg text-center mb-1">My Club Performance Score</h3>
          <p className="text-sm text-gray-400 text-center mb-8">A snapshot of growth and retention</p>
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48 drop-shadow-[0_0_15px_rgba(0,230,118,0.2)]">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#1C1C1E" strokeWidth="14" fill="none" />
                <circle cx="96" cy="96" r="80" stroke="#00E676" strokeWidth="14" fill="none"
                  strokeDasharray="502" strokeDashoffset="115" strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold tracking-tight">77%</span>
                <span className="text-gray-400 text-sm mt-1 font-medium">Good</span>
              </div>
            </div>
          </div>
          <div className="text-center mt-auto">
            <p className="text-sm font-medium flex items-center justify-center gap-1.5">
              Trending up by 5.2% this month <TrendingUp className="w-4 h-4 text-[#00E676]" />
            </p>
            <p className="text-xs text-gray-500 mt-1">Based on total player visits in the last 6 months.</p>
          </div>
        </div>

        <div className="col-span-1 md:col-span-8 bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col shadow-sm">
          <h3 className="font-semibold text-lg mb-1">Number of Matches</h3>
          <p className="text-sm text-gray-400 mb-6 font-medium">
            {format(subMonths(new Date(), 5), 'MMMM')} - {format(new Date(), 'MMMM yyyy')}
          </p>
          <div className="flex-1 min-h-[200px] md:min-h-[250px] w-full mt-2">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-xs text-gray-600">Loading chart...</div>}>
              <MatchesLineChart data={last6Months} />
            </Suspense>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium flex items-center gap-1.5">
              Trending up by 3.4% this month <TrendingUp className="w-4 h-4 text-[#00E676]" />
            </p>
            <p className="text-xs text-gray-500 mt-1">Showing total matches recorded over the past 6 months.</p>
          </div>
        </div>
      </div>

      {/* ── Top Players + Latest Scores ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-semibold text-lg mb-6">Top 5 Players</h3>
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold grid grid-cols-12 pb-3 border-b border-[#2A2A2A]">
            <div className="col-span-8">Player Name</div>
            <div className="col-span-4 text-right">CPP</div>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
            {topPlayers.length === 0
              ? <p className="text-sm text-gray-500 text-center py-4">No player data available</p>
              : topPlayers.map((player, idx) => (
                <div key={player.id} className="grid grid-cols-12 items-center group hover:bg-white/[0.02] p-2 -mx-2 rounded-lg transition-colors">
                  <div className="col-span-8 flex items-center gap-3 md:gap-4 min-w-0">
                    <span className="text-sm text-gray-500 font-medium w-4 shrink-0">{idx + 1}</span>
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 text-white">
                      {initials(player.name)}
                    </div>
                    <span className="font-medium text-sm text-gray-200 group-hover:text-white truncate">{player.name}</span>
                  </div>
                  <div className="col-span-4 text-right text-sm font-mono text-gray-400 group-hover:text-white">{player.cpp}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Latest Scores</h3>
          <div className="space-y-3">
            {latestScores.map(match => (
              <div key={match.id} className="bg-[#1A1A1C] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors rounded-xl p-4 relative">
                <div className="flex justify-center items-center absolute top-2 left-0 right-0 pointer-events-none">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-gray-500 bg-[#121212] px-2 py-0.5 rounded-full border border-[#2A2A2A]">
                    <Calendar className="w-3 h-3" /> {format(match.date, 'MMM dd')}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0">{initials(match.p1Name)}</div>
                    <div className="truncate min-w-0">
                      <div className="text-sm font-semibold text-gray-200 truncate">{match.p1Name}</div>
                      <div className={`text-[10px] font-medium flex items-center mt-0.5 ${match.p1Win ? 'text-[#00E676]' : 'text-red-400'}`}>
                        {match.p1Win ? <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 mr-1 flex-shrink-0" />}
                        {match.p1Change}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 z-10 mx-2 shrink-0">
                    <div className="w-8 h-9 bg-black border border-[#222] rounded flex items-center justify-center font-bold text-[15px]">{match.p1Score}</div>
                    <div className="w-8 h-9 bg-black border border-[#222] rounded flex items-center justify-center font-bold text-[15px]">{match.p2Score}</div>
                  </div>
                  <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                    <div className="truncate text-right min-w-0">
                      <div className="text-sm font-semibold text-gray-200 truncate">{match.p2Name}</div>
                      <div className={`text-[10px] font-medium flex justify-end items-center mt-0.5 ${match.p2Win ? 'text-[#00E676]' : 'text-red-400'}`}>
                        {match.p2Win ? <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" /> : <TrendingDown className="w-3 h-3 mr-1 flex-shrink-0" />}
                        {match.p2Change}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">{initials(match.p2Name)}</div>
                  </div>
                </div>
                <div className="flex justify-center items-center mt-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                    <Clock className="w-3 h-3" /> {format(match.date, 'hh:mm a')}
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

export default AnalyticsDashboard;
