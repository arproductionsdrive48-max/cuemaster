import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Globe, Monitor, Smartphone, Tablet, Users, Eye, MousePointerClick,
  Calendar, BarChart3, ArrowUpRight, Settings, Loader2, AlertCircle, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, parse } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useMembers } from '@/contexts/MembersContext';
import { supabase } from '@/lib/supabase';

type RangePreset = '7d' | '14d' | '30d' | 'custom';

interface GA4Data {
  summary: {
    totalUsers: number;
    sessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    pageviews: number;
  };
  daily: { date: string; visitors: number; sessions: number; pageviews: number }[];
  sources: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  countries: { name: string; value: number }[];
  pages: { path: string; views: number }[];
}

const DEVICE_COLORS = ['hsl(200, 80%, 55%)', 'hsl(45, 93%, 50%)', 'hsl(142, 76%, 45%)'];
const SOURCE_COLORS = [
  'hsl(200, 80%, 55%)', 'hsl(45, 93%, 50%)', 'hsl(142, 76%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(280, 70%, 55%)', 'hsl(30, 90%, 55%)',
  'hsl(170, 70%, 45%)', 'hsl(320, 70%, 55%)',
];

const AnalyticsDashboard = () => {
  const { clubSettings } = useMembers();
  const ga4Id = clubSettings.ga4PropertyId;
  const hasServiceAccount = !!(clubSettings as any).ga4ServiceAccountJson;

  const [range, setRange] = useState<RangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [pickingStart, setPickingStart] = useState(true);

  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;

  const queryDays = useMemo(() => {
    if (range === 'custom' && customStart && customEnd) {
      const diff = Math.ceil((customEnd.getTime() - customStart.getTime()) / 86400000);
      return Math.max(diff, 1);
    }
    return days;
  }, [range, days, customStart, customEnd]);

  const { data: ga4Data, isLoading, error } = useQuery<GA4Data>({
    queryKey: ['ga4-reports', ga4Id, queryDays],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not connected');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('fetch-ga4-reports', {
        body: { days: queryDays },
      });

      if (error) throw new Error(error.message || 'Failed to fetch GA4 data');
      if (data?.error) throw new Error(data.error);
      return data as GA4Data;
    },
    enabled: !!ga4Id && hasServiceAccount,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const formattedDaily = useMemo(() => {
    if (!ga4Data?.daily) return [];
    return ga4Data.daily.map(d => ({
      ...d,
      date: (() => {
        try {
          const parsed = parse(d.date, 'yyyyMMdd', new Date());
          return format(parsed, 'MMM d');
        } catch { return d.date; }
      })(),
    }));
  }, [ga4Data]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  const tooltipStyle = {
    contentStyle: {
      background: 'hsl(0 0% 8%)',
      border: '1px solid hsl(0 0% 20%)',
      borderRadius: '12px',
      fontSize: '12px',
      color: 'hsl(0 0% 90%)',
    },
  };

  // No GA4 connected: show placeholder
  if (!ga4Id || !hasServiceAccount) {
    return (
      <div className="px-4 py-12">
        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--gold))]/20 flex items-center justify-center mx-auto">
            <Globe className="w-8 h-8 text-[hsl(var(--gold))]" />
          </div>
          <h3 className="text-lg font-bold">Connect Google Analytics 4</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Enter your GA4 {!ga4Id ? 'Property ID' : 'Service Account JSON'} in{' '}
            <strong>Settings → Integrations</strong> to see public website visitor stats here.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings → Integrations → Google Analytics</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filters */}
      <div className="px-4">
        <div className="flex gap-2 flex-wrap">
          {([
            { id: '7d', label: '7 Days' },
            { id: '14d', label: '14 Days' },
            { id: '30d', label: '30 Days' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setRange(f.id)} className={cn(
              'flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all',
              range === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}>
              {f.label}
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium h-auto',
                range === 'custom'
                  ? 'bg-[hsl(var(--gold))] text-black hover:bg-[hsl(var(--gold))]/90'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}>
                <Calendar className="w-3.5 h-3.5" />
                {range === 'custom' && customStart && customEnd
                  ? `${format(customStart, 'MMM d')} - ${format(customEnd, 'MMM d')}`
                  : 'Custom'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 z-[60] bg-background border-border" align="start">
              <p className="text-xs text-muted-foreground mb-2">
                {pickingStart ? 'Select start date' : 'Select end date'}
              </p>
              <CalendarPicker
                mode="single"
                selected={pickingStart ? customStart : customEnd}
                onSelect={(date) => {
                  if (pickingStart) {
                    setCustomStart(date);
                    setPickingStart(false);
                  } else {
                    setCustomEnd(date);
                    setPickingStart(true);
                    setRange('custom');
                  }
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Globe className="w-3 h-3" /> GA4 Property: {ga4Id}
        </p>
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="px-4 py-12 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Fetching GA4 data…</p>
        </div>
      )}

      {error && (
        <div className="px-4">
          <div className="glass-card p-4 border-primary/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Failed to fetch analytics</p>
                <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && ga4Data && (
        <>
          {/* Summary Cards */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Visitors', value: ga4Data.summary.totalUsers.toLocaleString(), icon: Users, color: 'text-primary' },
              { label: 'Sessions', value: ga4Data.summary.sessions.toLocaleString(), icon: Eye, color: 'text-[hsl(var(--gold))]' },
              { label: 'Avg Duration', value: formatDuration(ga4Data.summary.avgSessionDuration), icon: MousePointerClick, color: 'text-available' },
              { label: 'Bounce Rate', value: `${(ga4Data.summary.bounceRate * 100).toFixed(1)}%`, icon: ArrowUpRight, color: 'text-primary' },
            ].map(stat => (
              <div key={stat.label} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Visitors & Pageviews Chart */}
          <div className="px-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4">Visitors & Pageviews</h3>
              {formattedDaily.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedDaily}>
                      <defs>
                        <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pageviewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(45, 93%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(45, 93%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(0 0% 20%)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(0 0% 55%)', fontSize: 10 }} interval={Math.floor(formattedDaily.length / 6)} />
                      <YAxis hide />
                      <Tooltip {...tooltipStyle} />
                      <Area type="monotone" dataKey="visitors" stroke="hsl(200, 80%, 55%)" fill="url(#visitorsGrad)" strokeWidth={2} name="Visitors" />
                      <Area type="monotone" dataKey="pageviews" stroke="hsl(45, 93%, 50%)" fill="url(#pageviewsGrad)" strokeWidth={2} name="Pageviews" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full" style={{ background: 'hsl(200, 80%, 55%)' }} /><span className="text-xs text-muted-foreground">Visitors</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full" style={{ background: 'hsl(45, 93%, 50%)' }} /><span className="text-xs text-muted-foreground">Pageviews</span></div>
              </div>
            </div>
          </div>

          {/* Top Sources */}
          <div className="px-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4">Top Sources</h3>
              {ga4Data.sources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No source data yet</p>
              ) : (
                <div className="space-y-3">
                  {ga4Data.sources.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                        <span className="text-sm">{s.name}</span>
                      </div>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Devices */}
          <div className="px-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4">Devices</h3>
              {ga4Data.devices.length === 0 ? (
                <div className="flex items-center justify-center gap-6 py-4">
                  <div className="text-center space-y-1">
                    <Monitor className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">Desktop</p>
                    <p className="font-bold">—</p>
                  </div>
                  <div className="text-center space-y-1">
                    <Smartphone className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="font-bold">—</p>
                  </div>
                  <div className="text-center space-y-1">
                    <Tablet className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">Tablet</p>
                    <p className="font-bold">—</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ga4Data.devices} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                          {ga4Data.devices.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {ga4Data.devices.map((d, i) => {
                      const total = ga4Data.devices.reduce((s, x) => s + x.value, 0);
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
                      return (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                            <span className="text-sm capitalize">{d.name}</span>
                          </div>
                          <span className="font-semibold">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Countries */}
          <div className="px-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[hsl(var(--gold))]" /> Top Countries
              </h3>
              {ga4Data.countries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No country data yet</p>
              ) : (
                <div className="space-y-3">
                  {ga4Data.countries.map(c => (
                    <div key={c.name} className="flex items-center justify-between">
                      <span className="text-sm">{c.name}</span>
                      <span className="font-semibold">{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Pages */}
          <div className="px-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[hsl(var(--gold))]" /> Top Pages
              </h3>
              {ga4Data.pages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No page data yet</p>
              ) : (
                <div className="space-y-3">
                  {ga4Data.pages.map(p => (
                    <div key={p.path} className="flex items-center justify-between">
                      <span className="text-sm font-mono truncate max-w-[200px]">{p.path}</span>
                      <span className="font-semibold">{p.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pageviews total card */}
          <div className="px-4 pb-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-[hsl(var(--gold))]" />
                </div>
                <span className="text-xs text-muted-foreground">Total Pageviews</span>
              </div>
              <p className="text-2xl font-bold">{ga4Data.summary.pageviews.toLocaleString()}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
