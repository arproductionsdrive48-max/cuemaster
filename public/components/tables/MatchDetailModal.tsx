import { MatchRecord } from '@/types';
import { X, Clock, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MatchDetailModalProps {
  match: MatchRecord;
  onClose: () => void;
}

const MatchDetailModal = ({ match, onClose }: MatchDetailModalProps) => {
  const formatDuration = (ms: number) => {
    const mins = Math.floor(Math.max(0, ms) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  const itemsTotal = (match.items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
  const tableCharge = match.totalBill - itemsTotal;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-t-3xl p-5 pb-24 animate-fade-in-up max-h-[85vh] overflow-y-auto"
        style={{ background: 'radial-gradient(ellipse at top, #2a261c 0%, #0d0c0a 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Session Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table & Time */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-secondary/30">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <span className="text-sm font-bold">{String(match.tableNumber).padStart(2, '0')}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Table {match.tableNumber}</p>
            <p className="text-xs text-muted-foreground">{format(match.date, 'MMM dd, yyyy • hh:mm a')}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[hsl(var(--gold))]">₹{match.totalBill}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{match.billingMode.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Session Times */}
        {(match.sessionStartTime || match.sessionEndTime) && (
          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            {match.sessionStartTime && <span>Start: <span className="text-foreground font-medium">{format(match.sessionStartTime, 'hh:mm a')}</span></span>}
            {match.sessionStartTime && match.sessionEndTime && <span>→</span>}
            {match.sessionEndTime && <span>End: <span className="text-foreground font-medium">{format(match.sessionEndTime, 'hh:mm a')}</span></span>}
            {match.duration > 0 && <span className="ml-auto text-[hsl(var(--gold))]">{formatDuration(match.duration)}</span>}
          </div>
        )}

        {/* Players */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Players</p>
          <div className="space-y-1.5">
            {match.players.map((player, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/40">
                <span className="text-sm font-medium">{player.name}</span>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded',
                  player.result === 'win' ? 'bg-[hsl(var(--gold))] text-black'
                    : player.result === 'loss' ? 'bg-destructive text-white'
                    : 'bg-secondary text-muted-foreground'
                )}>
                  {player.result === 'win' ? 'W' : player.result === 'loss' ? 'L' : 'D'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Session Items (F&B) */}
        {match.items && match.items.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Items Ordered</p>
            </div>
            <div className="rounded-xl bg-secondary/30 overflow-hidden">
              {match.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 rounded px-1.5 py-0.5">{item.quantity}x</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-[hsl(var(--gold))]">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">Items Total</span>
                <span className="text-sm font-bold">₹{itemsTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bill Breakdown */}
        <div className="rounded-xl bg-secondary/30 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Table Charge</span>
            <span>₹{Math.max(0, tableCharge)}</span>
          </div>
          {itemsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">F&B</span>
              <span>₹{itemsTotal}</span>
            </div>
          )}
          {match.paymentMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <span className="capitalize">{match.paymentMethod}{match.qrUsed ? ' (QR)' : ''}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-[hsl(var(--gold))] text-lg">₹{match.totalBill}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetailModal;
