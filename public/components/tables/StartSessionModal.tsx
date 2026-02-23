import { useState } from 'react';
import { X, Clock, Timer, Square } from 'lucide-react';
import { BillingMode, IndividualTablePricing, TablePricing } from '@/types';
import { cn } from '@/lib/utils';

interface StartSessionModalProps {
  tableNumber: number;
  tableType: string;
  defaultBillingMode: BillingMode;
  tablePricing: TablePricing;
  tableConfig?: IndividualTablePricing;
  onClose: () => void;
  onStart: (billingMode: BillingMode) => void;
}

const billingModeLabels: Record<BillingMode, { label: string; icon: typeof Clock; description: string }> = {
  hourly: { label: 'Hourly', icon: Clock, description: 'Charge per hour of play' },
  per_minute: { label: 'Per Minute', icon: Timer, description: 'Charge per minute of play' },
  per_frame: { label: 'Per Frame', icon: Square, description: 'Charge per frame played' },
};

const StartSessionModal = ({
  tableNumber,
  tableType,
  defaultBillingMode,
  tablePricing,
  tableConfig,
  onClose,
  onStart,
}: StartSessionModalProps) => {
  const [selectedMode, setSelectedMode] = useState<BillingMode>(
    tableConfig?.billingMode || defaultBillingMode
  );

  // Get the rate for display based on selected mode
  const getRate = (mode: BillingMode) => {
    const pricing = tableConfig?.useGlobal === false && tableConfig?.customPricing
      ? tableConfig.customPricing
      : tablePricing;
    
    switch (mode) {
      case 'hourly':
        return `₹${pricing.perHour}/hr`;
      case 'per_minute':
        return `₹${pricing.perMinute}/min`;
      case 'per_frame':
        return `₹${pricing.perFrame}/frame`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-[90%] max-w-md rounded-3xl overflow-hidden animate-scale-in"
        style={{
          background: 'linear-gradient(180deg, rgba(35, 32, 25, 0.98) 0%, rgba(20, 18, 14, 0.98) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="p-5 text-center border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <div className={cn(
            "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3",
            tableType === 'Snooker' ? 'bg-emerald-500/20' :
            tableType === 'Pool' ? 'bg-blue-500/20' :
            'bg-purple-500/20'
          )}>
            <span className="text-3xl">
              {tableType === 'Snooker' ? '🎱' : tableType === 'Pool' ? '🟡' : '⚫'}
            </span>
          </div>
          
          <h2 className="text-xl font-bold text-foreground">
            Start Session on Table {tableNumber.toString().padStart(2, '0')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tableType} Table • Select billing mode
          </p>
        </div>

        {/* Billing Mode Selection */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Billing Mode
          </p>
          
          {(Object.keys(billingModeLabels) as BillingMode[]).map((mode) => {
            const { label, icon: Icon, description } = billingModeLabels[mode];
            const isSelected = selectedMode === mode;
            const isDefault = (tableConfig?.billingMode || defaultBillingMode) === mode;
            
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center gap-4 transition-all",
                  isSelected
                    ? "bg-[hsl(var(--gold))]/20 border-2 border-[hsl(var(--gold))]"
                    : "bg-secondary/30 border-2 border-transparent hover:bg-secondary/50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isSelected ? "bg-[hsl(var(--gold))]/30" : "bg-secondary"
                )}>
                  <Icon className={cn(
                    "w-6 h-6",
                    isSelected ? "text-[hsl(var(--gold))]" : "text-muted-foreground"
                  )} />
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "font-semibold",
                      isSelected ? "text-[hsl(var(--gold))]" : "text-foreground"
                    )}>
                      {label}
                    </p>
                    {isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                
                <div className={cn(
                  "text-right",
                  isSelected ? "text-[hsl(var(--gold))]" : "text-muted-foreground"
                )}>
                  <p className="font-bold">{getRate(mode)}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-semibold bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(selectedMode)}
            className="flex-1 py-3.5 rounded-xl font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
            }}
          >
            <span className="text-white">Start Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartSessionModal;
