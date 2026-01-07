import { useState, useMemo } from 'react';
import { TableSession } from '@/types';
import { useTimer } from '@/hooks/useTimer';
import { cn } from '@/lib/utils';
import { Users, IndianRupee } from 'lucide-react';

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
}

const TableCard = ({ table, onClick, disabled }: TableCardProps) => {
  const { formatted } = useTimer(
    table.startTime, 
    table.status === 'paused', 
    table.pausedTime
  );

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
      label: formatted, 
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

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        config.cardClass,
        'p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full',
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
        
        {/* Table number badge */}
        <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border/50">
          <span className="text-sm font-bold">{table.tableNumber}</span>
        </div>
        
        {/* Status indicator */}
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
  );
};

export default TableCard;
