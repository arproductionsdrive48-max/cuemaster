/**
 * ConnectionStatusBadge — shown in the app Header.
 *
 * Dot colours:
 *   🟢 Green  — connected, no errors, realtime OK
 *   🟡 Yellow — connected but realtime channels are down
 *   🟠 Amber  — checking / initial load
 *   🔴 Red    — critical error or query failure
 *
 * Click behaviour:
 *   Green  → triggers a silent syncAll() with "Syncing…" toast
 *   Yellow → triggers syncAll() to manually refresh data
 *   Red    → opens the FullScreenErrorOverlay for manual retry/sync
 *   Amber  → no action
 */

import { useConnection } from '@/contexts/ConnectionContext';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useMembers } from '@/contexts/MembersContext';
import { Loader2, WifiOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ConnectionStatusBadge = () => {
  const { isConnected, hasError, realtimeDown, openOverlay, syncAll } = useConnection();
  const { reconnectRealtime } = useMembers();
  const pingStatus = useConnectionStatus();

  // Offline = any error condition OR ping says disconnected
  const isOffline = hasError || pingStatus === 'disconnected';
  // Checking = no outcome yet and no error
  const isChecking = !isOffline && (pingStatus === 'checking' || (!isConnected && !hasError));
  const isOnline = !isOffline && !isChecking && isConnected;

  const handleLiveClick = async () => {
    toast.info('Syncing data…', { id: 'badge-sync', duration: 1500 });
    await syncAll();
  };

  const handleRealtimeReconnect = () => {
    toast.loading('Reconnecting realtime…', { id: 'rt-reconnect', duration: 2000 });
    reconnectRealtime();
    setTimeout(() => {
      toast.dismiss('rt-reconnect');
      toast.success('Realtime channels reconnected');
    }, 2000);
  };

  // Red — critical or query error. Opens overlay on click.
  if (isOffline) {
    return (
      <button
        onClick={openOverlay}
        title="Database error — click to retry"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 active:scale-95 transition-transform"
      >
        <WifiOff className="w-3 h-3 text-destructive" />
        <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider hidden sm:inline">
          Error
        </span>
      </button>
    );
  }

  // Amber — checking
  if (isChecking) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
          Connecting
        </span>
      </div>
    );
  }

  // Yellow — connected but realtime is down
  if (isOnline && realtimeDown) {
    return (
      <button
        onClick={handleRealtimeReconnect}
        title="Realtime offline — click to reconnect"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 active:scale-95 transition-transform"
      >
        <AlertTriangle className="w-3 h-3 text-yellow-500" />
        <span className="text-[10px] font-semibold text-yellow-500 uppercase tracking-wider hidden sm:inline">
          Reconnect
        </span>
      </button>
    );
  }

  // Green — all good
  return (
    <button
      onClick={handleLiveClick}
      title="Database connected — click to sync"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-available/10 border border-available/20 active:scale-95 transition-transform"
    >
      <span className="w-2 h-2 rounded-full bg-available animate-pulse" />
      <span className="text-[10px] font-semibold text-available uppercase tracking-wider hidden sm:inline">
        Live
      </span>
    </button>
  );
};

export default ConnectionStatusBadge;
