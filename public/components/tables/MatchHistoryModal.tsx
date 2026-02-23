import { useState, useMemo } from 'react';
import { useMembers } from '@/contexts/MembersContext';
import { MatchRecord } from '@/types';
import { X, Calendar, Filter, Clock, Eye } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import MatchDetailModal from './MatchDetailModal';

type DateFilter = 'all' | 'today' | '7days' | '30days' | 'custom';

interface MatchHistoryModalProps {
  onClose: () => void;
  filterPlayer?: string; // optional player name filter
}

const MatchHistoryModal = ({ onClose, filterPlayer }: MatchHistoryModalProps) => {
  const { matchHistory } = useMembers();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);

  const filteredHistory = useMemo(() => {
    let list = filterPlayer
      ? matchHistory.filter(m => m.players.some(p => p.name === filterPlayer))
      : matchHistory;

    if (dateFilter === 'all') return list;
    if (dateFilter === 'custom' && customDate) {
      return list.filter(m => isSameDay(m.date, customDate));
    }
    const now = new Date();
    const start = dateFilter === 'today' ? startOfDay(now)
      : dateFilter === '7days' ? subDays(now, 7)
      : subDays(now, 30);
    return list.filter(m =>
      isWithinInterval(m.date, { start, end: endOfDay(now) })
    );
  }, [matchHistory, dateFilter, customDate, filterPlayer]);

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in-up" style={{ background: 'radial-gradient(ellipse at top right, #2a261c 0%, #0d0c0a 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: 'rgba(15, 15, 12, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Match History</h1>
            {filterPlayer && <p className="text-xs text-muted-foreground">{filterPlayer}</p>}
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Date Filters */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                dateFilter === f.id
                  ? 'bg-[hsl(var(--gold))] text-black'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {f.id === 'all' && <Filter className="w-3.5 h-3.5" />}
              {f.id !== 'all' && <Calendar className="w-3.5 h-3.5" />}
              {f.label}
            </button>
          ))}
          {/* Calendar date picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  dateFilter === 'custom'
                    ? 'bg-[hsl(var(--gold))] text-black'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {dateFilter === 'custom' && customDate ? format(customDate, 'MMM d') : 'Pick Date'}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-background border-border"
              style={{ zIndex: 9999 }}
              align="start"
              side="bottom"
            >
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
        </div>
      </div>

      {/* Stats summary */}
      {filteredHistory.length > 0 && (
        <div className="px-4 pb-3 flex gap-3">
          <div className="flex-1 bg-secondary/40 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold">{filteredHistory.length}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </div>
          <div className="flex-1 bg-secondary/40 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-[hsl(var(--gold))]">₹{filteredHistory.reduce((s, m) => s + m.totalBill, 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </div>
          <div className="flex-1 bg-secondary/40 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold">{formatDuration(filteredHistory.reduce((s, m) => s + m.duration, 0))}</p>
            <p className="text-[10px] text-muted-foreground">Total Time</p>
          </div>
        </div>
      )}

      {/* Match List */}
      <div className="px-4 pb-24 space-y-3 overflow-y-auto h-[calc(100vh-200px)]">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No matches found</p>
            <p className="text-sm mt-1">Try a different date filter</p>
          </div>
        ) : (
          filteredHistory.map((match) => (
            <div key={match.id} className="glass-card p-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-sm font-bold">{match.tableNumber.toString().padStart(2, '0')}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Table {match.tableNumber}</p>
                    <p className="text-xs text-muted-foreground">{format(match.date, 'MMM dd, yyyy • hh:mm a')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[hsl(var(--gold))]">₹{match.totalBill}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{match.billingMode.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Session Times */}
              {(match.sessionStartTime || match.sessionEndTime) && (
                <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  {match.sessionStartTime && (
                    <span>Start: <span className="text-foreground font-medium">{format(match.sessionStartTime, 'hh:mm a')}</span></span>
                  )}
                  {match.sessionStartTime && match.sessionEndTime && <span>→</span>}
                  {match.sessionEndTime && (
                    <span>End: <span className="text-foreground font-medium">{format(match.sessionEndTime, 'hh:mm a')}</span></span>
                  )}
                  {match.duration > 0 && (
                    <span className="ml-auto text-[hsl(var(--gold))]">{formatDuration(match.duration)}</span>
                  )}
                </div>
              )}

              {/* Payment info */}
              {(match as any).paymentMethod && (
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-secondary">{(match as any).paymentMethod}</span>
                  {(match as any).splitCount > 1 && <span className="px-2 py-0.5 rounded bg-secondary">Split {(match as any).splitCount} ways</span>}
                  {(match as any).qrUsed && <span className="px-2 py-0.5 rounded bg-available/20 text-available">QR Paid</span>}
                </div>
              )}

              {/* Players */}
              <div className="space-y-1.5">
                {match.players.map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/40">
                    <span className="text-sm font-medium">{player.name}</span>
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded',
                      player.result === 'win'
                        ? 'bg-[hsl(var(--gold))] text-black'
                        : player.result === 'loss'
                        ? 'bg-red-500 text-white'
                        : 'bg-secondary text-muted-foreground'
                    )}>
                      {player.result === 'win' ? 'W' : player.result === 'loss' ? 'L' : 'D'}
                    </span>
                  </div>
                ))}
              </div>
              {/* View Details button */}
              <button
                onClick={() => setSelectedMatch(match)}
                className="mt-3 w-full py-2 rounded-lg bg-secondary/60 text-sm font-medium text-[hsl(var(--gold))] flex items-center justify-center gap-1.5 hover:bg-secondary transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
};

export default MatchHistoryModal;
