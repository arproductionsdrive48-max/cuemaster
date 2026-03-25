import { useState, useMemo } from 'react';
import { TableSession } from '@/types';
import LiveTimer from '@/components/common/LiveTimer';
import LiveBillDisplay from '@/components/home/LiveBillDisplay';
import { cn } from '@/lib/utils';
import { Users, IndianRupee, Pause, Play, Square, UserPlus, Split, CheckCircle2, QrCode, Wrench, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Table images
const freeTableImages = [
  'https://t4.ftcdn.net/jpg/03/31/22/11/360_F_331221131_P006bsCdqfOJjIukE1vpj47duQhldw3s.jpg',
  'https://t4.ftcdn.net/jpg/16/09/27/97/360_F_1609279738_gWxGTxHWPawMmPfkuTJHElqHuGdNydlD.jpg',
];

const activeTableImages = [
  'https://media.istockphoto.com/id/149409557/photo/composition-of-billiard.jpg?s=612x612&w=0&k=20&c=Wn6B7acze4xG4TX1S3vusu8nC88nYJBy2_xYhdRNpKU=',
  'https://www.shutterstock.com/image-photo/female-player-ready-hit-red-260nw-2291821615.jpg',
];

interface TableCardProps {
  table: TableSession;
  onClick: () => void;
  disabled?: boolean;
  onAction?: (action: 'pause' | 'resume' | 'stop' | 'add_player' | 'split' | 'mark_paid', e: React.MouseEvent) => void;
  onQRClick?: (e: React.MouseEvent) => void;
}

const TableCard = ({ table, onClick, disabled, onAction, onQRClick }: TableCardProps) => {
  // Use table number to consistently pick an image
  const tableImage = useMemo(() => {
    if (table.status === 'free') {
      return freeTableImages[table.tableNumber % freeTableImages.length];
    }
    return activeTableImages[table.tableNumber % activeTableImages.length];
  }, [table.status, table.tableNumber]);

  const statusConfig = {
    free: { 
      label: 'Available', 
      dotClass: 'status-available',
      cardClass: 'glass-card-available'
    },
    occupied: { 
      label: <LiveTimer startTime={table.startTime} isPaused={false} pausedDuration={table.pausedTime} />, 
      dotClass: 'status-live',
      cardClass: 'glass-card-live'
    },
    paused: { 
      label: 'Paused', 
      dotClass: 'status-paused',
      cardClass: 'glass-card'
    },
  };

  const config = statusConfig[table.status];

  const handleAction = (action: 'pause' | 'resume' | 'stop' | 'add_player' | 'split' | 'mark_paid', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) onAction(action, e);
  };

  return (
    <>
      {/* Mobile View - Small Card Layout */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "md:hidden", // Hide on desktop
          config.cardClass,
          'p-4 text-left transition-all duration-300 active:scale-[0.98] w-full',
          disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
      >
        {/* Snooker Table Image */}
        <div className="relative mb-3 rounded-xl overflow-hidden">
          <img 
            src={tableImage} 
            alt={`Table ${table.tableNumber}`}
            className={cn(
              "w-full h-20 object-cover transition-all duration-300",
              table.status === 'free' && "opacity-80",
              table.status === 'paused' && "opacity-70"
            )}
          />
          <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border/50">
            <span className="text-sm font-bold">{table.tableNumber}</span>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
            <div className={config.dotClass} />
            <span className={cn(
              'text-xs font-medium',
              table.status === 'occupied' && 'text-primary font-mono',
              table.status === 'free' && 'text-available',
              table.status === 'paused' && 'text-paused'
            )}>
              {config.label}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Table {table.tableNumber}</h3>
          {table.status !== 'free' && table.totalBill > 0 && (
            <div className="flex items-center gap-1 text-foreground">
              <IndianRupee className="w-3.5 h-3.5" />
              <span className="font-semibold text-sm">{table.totalBill}</span>
            </div>
          )}
        </div>

        {table.status !== 'free' && (
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs truncate">
              {table.players.slice(0, 2).join(', ')}
              {table.players.length > 2 && ` +${table.players.length - 2}`}
            </span>
          </div>
        )}

        {table.status === 'free' && (
          <p className="text-xs text-muted-foreground mt-1">
            {disabled ? 'Club is closed' : 'Tap to start session'}
          </p>
        )}
      </button>

      {/* Desktop View - Professional CuePal Grid Layout */}
      <div 
        className={cn(
          "hidden md:flex flex-col rounded-2xl border transition-all duration-300 w-full overflow-hidden hover:shadow-lg shadow-sm cursor-pointer", // Show on desktop
          table.status === 'free' ? 'bg-[#121212] border-[#2A2A2A] hover:border-[#444]' : 
          table.status === 'occupied' ? 'bg-gradient-to-br from-[#1A1C23] to-[#121212] border-blue-900/50 hover:border-blue-500/50' : 
          'bg-[#1A1A1A] border-[#333]',
          disabled && 'opacity-50 cursor-not-allowed selection:bg-transparent'
        )}
        onClick={disabled ? undefined : onClick}
      >
        {/* Header Block */}
        <div className="p-5 flex justify-between items-start border-b border-white/5 bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-xl font-bold text-gray-100 tracking-tight">Table {String(table.tableNumber).padStart(2, '0')}</h2>
              <span className="text-xs px-2 py-0.5 rounded text-gray-400 bg-white/5 font-medium border border-white/10 uppercase tracking-widest">{table.tableType}</span>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2 mt-2">
              {table.status === 'free' ? (
                <div className="flex flex-row items-center justify-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span> Available
                </div>
              ) : table.status === 'occupied' ? (
                <div className="flex flex-row items-center justify-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span> In Use
                </div>
              ) : (
                <div className="flex flex-row items-center justify-center px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span> Paused
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors" 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (onQRClick) onQRClick(e);
            }}
          >
            <QrCode className="w-5 h-5"/>
          </button>
        </div>

        {/* Content Block */}
        <div className="p-5 flex-1 flex flex-col justify-center">
          {table.status === 'free' ? (
            <div className="flex flex-col items-center justify-center py-6 opacity-60">
              <Wrench className="w-8 h-8 mb-3 text-gray-500" />
              <p className="text-sm font-medium text-gray-400">Ready for next session</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-gray-400 text-sm font-medium flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Players
                </div>
                <div className="text-gray-100 font-semibold text-sm truncate max-w-[150px]">
                  {table.players.length > 0 ? table.players.join(', ') : 'Anonymous'}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-gray-400 text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Duration
                </div>
                <div className="text-gray-100 font-mono text-lg font-bold">
                  {config.label}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                <div className="text-gray-400 text-sm font-medium">Due Amount</div>
                <div className="text-2xl font-bold text-emerald-400 flex items-center drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                  <LiveBillDisplay table={table} />
                </div>
              </div>

              {/* Temporary Debug Banner for Billing */}
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono break-all leading-tight">
                <strong className="block text-red-500 mb-1 uppercase tracking-widest text-[10px]">⚠️ Billing Debug Info</strong>
                Calc Base: {table.billingMode === 'per_frame' ? table.frameCount + ' frames' : Math.floor(Math.max(0, Date.now() - (table.startTime?.getTime() || Date.now()) - (table.pausedTime || 0))/60000) + ' min elapsed'}
                <br/>
                Items Total: ₹{table.items?.reduce((s,i)=>s+i.price*i.quantity,0) || 0}
                <br/>
                Sync DB Prop (totalBill): ₹{table.totalBill}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Footer - Only show if occupied or paused */}
        {table.status !== 'free' && (
          <div className="grid grid-cols-4 gap-px bg-white/5 border-t border-white/5 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] duration-1000 transition-transform pointer-events-none" />
            
            {table.status === 'occupied' ? (
              <button onClick={(e) => handleAction('pause', e)} title="Pause Session" className="p-3 flex items-center justify-center text-amber-500 hover:bg-amber-500/10 transition-colors">
                <Pause className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={(e) => handleAction('resume', e)} title="Resume Session" className="p-3 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                <Play className="w-5 h-5 ml-1" />
              </button>
            )}
            
            <button onClick={(e) => handleAction('add_player', e)} title="Manage Players" className="p-3 flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors border-l border-white/5">
              <UserPlus className="w-5 h-5" />
            </button>
            
            <button onClick={(e) => handleAction('split', e)} title="Split Bill" className="p-3 flex items-center justify-center text-purple-400 hover:bg-purple-500/10 transition-colors border-l border-white/5">
              <Split className="w-5 h-5" />
            </button>

            <button onClick={(e) => handleAction('stop', e)} title="End Session" className="p-3 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors border-l border-white/5">
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TableCard;
