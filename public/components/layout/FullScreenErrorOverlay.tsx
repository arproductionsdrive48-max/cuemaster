/**
 * FullScreenErrorOverlay — blocks all interaction when DB is unreachable.
 *
 * Shown when useConnection().overlayOpen is true.
 * Two CTAs: "Retry Connection" (re-runs ping) and "Sync Now" (invalidates all queries).
 */

import { WifiOff, RefreshCw, RotateCcw } from 'lucide-react';
import { useConnection } from '@/contexts/ConnectionContext';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

const FullScreenErrorOverlay = () => {
  const { overlayOpen, errorMessage, syncAll, closeOverlay } = useConnection();
  const connectionStatus = useConnectionStatus();

  // Auto-close if connection is restored
  if (!overlayOpen && connectionStatus !== 'disconnected') return null;
  if (!overlayOpen) return null;

  const handleRetry = () => {
    window.location.reload();
  };

  const handleSync = async () => {
    closeOverlay();
    await syncAll();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ background: 'hsl(var(--background) / 0.98)', backdropFilter: 'blur(20px)' }}
    >
      {/* Icon */}
      <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
        <WifiOff className="w-12 h-12 text-destructive" />
      </div>

      {/* Text */}
      <div className="space-y-3 max-w-sm">
        <h2 className="text-2xl font-bold tracking-tight">Database Connection Failed</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cannot load or save data. All club information is currently unavailable.
          Please check your internet connection, refresh the page, or contact support if the problem continues.
        </p>
        {errorMessage && (
          <p className="text-xs font-mono bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 text-destructive text-left break-all">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleRetry}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm w-full active:scale-[0.97] transition-transform"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Connection
        </button>
        <button
          onClick={handleSync}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm w-full border border-border active:scale-[0.97] transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          Sync Now
        </button>
      </div>

      {/* Footer hint */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
        Snook OS — Production Mode
      </p>
    </div>
  );
};

export default FullScreenErrorOverlay;
