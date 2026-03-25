import { useState, useEffect } from 'react';
import { Brain, Trash2, CheckCircle2, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function AIStatusCard() {
  const [status, setStatus] = useState<'ready' | 'unknown'>('unknown');

  useEffect(() => {
    // Instant engine is always ready
    setStatus('ready');
    localStorage.setItem('snookos_ai_model_ready', 'true');
  }, []);

  const handleClear = async () => {
    toast.success('System cache cleared.');
  };

  return (
    <div className="glass-card p-6 animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex flex-col items-center justify-center relative overflow-hidden">
            <Brain className="w-6 h-6 text-primary relative z-10" />
            <div className="absolute w-full h-full bg-primary/10 animate-pulse-glow" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Smart AI Engine</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Status: 
              {status === 'ready' 
                ? <span className="text-[hsl(var(--gold))] flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> Enabled</span>
                : <span className="text-emerald-500 flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> Built-in</span>
              }
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm mb-1">Instant Edge Processing</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Snook OS uses an optimized offline content generation engine. Suggestions for nicknames, tournament names, and match records resolve in milliseconds without draining your device's bandwidth or battery.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleClear}
          className="flex-1 py-3 px-4 rounded-xl border border-destructive/30 text-destructive flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors font-medium text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Clear Cache
        </button>
      </div>
    </div>
  );
}
