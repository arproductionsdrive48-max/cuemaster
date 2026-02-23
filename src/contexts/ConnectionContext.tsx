/**
 * ConnectionContext — global database connection state.
 *
 * Three error tiers:
 *   1. CRITICAL  → auth loss, network down, no club linked.
 *                  Sets hasError=true AND opens the full-screen blocking overlay.
 *   2. QUERY     → individual table fetch/mutation failed (RLS, schema cache, timestamp).
 *                  Sets hasError=true (red dot) but shows a toast — never blocks the app.
 *   3. REALTIME  → realtime channels closed/errored but queries still work.
 *                  Sets realtimeDown=true (yellow dot) + yellow toast — app stays usable.
 *
 * API:
 *   reportSuccess()              — clears all error state, turns dot green.
 *   reportError(msg)             — critical failure → red dot + overlay after 400 ms debounce.
 *   reportQueryError(label)      — non-critical failure → red dot + toast, no overlay.
 *   reportRealtimeDown()         — realtime offline → yellow dot + yellow toast, no overlay.
 *   reportRealtimeOk()           — realtime recovered → clears realtimeDown flag.
 *   syncAll()                    — invalidate + refetch all primary query caches.
 */

import React, {
  createContext, useContext, useState, useCallback,
  useRef, ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const MAIN_QUERY_KEYS = [
  'club-id', 'members', 'tables', 'match-history',
  'bookings', 'tournaments', 'inventory', 'cameras',
  'club-settings', 'reports', 'promotions',
];

/** Messages that match these patterns trigger the full-screen overlay. */
const CRITICAL_PATTERNS = [
  'auth session missing',
  'not authenticated',
  // 'no club associated' — now handled by NoClubScreen, not the blocking overlay
  'failed to fetch',
  'networkerror',
  'jwt expired',
  'network request failed',
];

export const isCriticalMessage = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return CRITICAL_PATTERNS.some(p => lower.includes(p));
};

interface ConnectionContextType {
  isConnected: boolean;
  hasError: boolean;
  realtimeDown: boolean;
  errorMessage: string;
  overlayOpen: boolean;
  reportSuccess: () => void;
  /** Critical failure: opens blocking overlay + sets red dot */
  reportError: (msg: string) => void;
  /** Non-critical query failure: red dot + toast only, no overlay */
  reportQueryError: (label: string, msg?: string) => void;
  /** Realtime channels closed/errored — yellow dot + toast, app stays usable */
  reportRealtimeDown: () => void;
  /** Realtime recovered — clears yellow dot */
  reportRealtimeOk: () => void;
  syncAll: () => Promise<void>;
  openOverlay: () => void;
  closeOverlay: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider = ({ children }: { children: ReactNode }) => {
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [realtimeDown, setRealtimeDown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Debounce timer so rapid successive errors don't spam the overlay
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportSuccess = useCallback(() => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    setIsConnected(true);
    setHasError(false);
    setErrorMessage('');
    // Don't auto-close the overlay here — user must explicitly retry/sync
  }, []);

  /**
   * reportError — use for CRITICAL failures only:
   *   auth session missing, JWT expired, network down, no club linked.
   * Opens the full-screen blocking overlay after a 400 ms debounce.
   */
  const reportError = useCallback((msg: string) => {
    console.error('[Snook OS] Critical DB Error:', msg);
    setIsConnected(false);
    setHasError(true);
    setErrorMessage(msg);

    if (isCriticalMessage(msg)) {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = setTimeout(() => setOverlayOpen(true), 400);
    }
    // Non-critical messages just set the red dot — no overlay
  }, []);

  /**
   * reportQueryError — use for individual query/mutation failures:
   *   RLS denial, schema cache miss, timestamp syntax error, etc.
   * Shows a non-blocking toast and lights the red dot — never opens overlay.
   */
  const reportQueryError = useCallback((label: string, msg?: string) => {
    const detail = msg ? ` – ${msg}` : '';
    console.warn(`[Snook OS] Query error [${label}]:`, msg ?? 'unknown');
    setHasError(true);
    // Show a dismissible toast, not a blocker
    toast.error(`Failed to load/save ${label}${detail} – retrying`, {
      id: `qerr-${label}`,   // deduplicates repeat toasts for same table
      duration: 4000,
    });
  }, []);

  // Session-level flag: only show the RT-down toast once per app load
  const rtToastShownRef = useRef(false);

  /** Realtime channels closed — yellow dot + one-time toast per session. */
  const reportRealtimeDown = useCallback(() => {
    if (realtimeDown) return;
    setRealtimeDown(true);
    if (!rtToastShownRef.current) {
      rtToastShownRef.current = true;
      toast.warning('Realtime sync offline — data may be stale. Tap status badge to refresh.', {
        id: 'rt-down-session',
        duration: 5000,
      });
    }
  }, [realtimeDown]);

  /** Realtime recovered — clear yellow state */
  const reportRealtimeOk = useCallback(() => {
    setRealtimeDown(false);
  }, []);

  const syncAll = useCallback(async () => {
    const tid = toast.loading('Syncing data…');
    try {
      await Promise.all(MAIN_QUERY_KEYS.map(key => qc.invalidateQueries({ queryKey: [key] })));
      await qc.refetchQueries({ type: 'active' });
      toast.dismiss(tid);
      toast.success('Data synced successfully');
      // Optimistically mark connected after a successful sync
      setIsConnected(true);
      setHasError(false);
      setErrorMessage('');
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error(`Sync failed: ${err?.message ?? 'Unknown error'}`);
      console.error('[Snook OS] Sync error:', err);
    }
  }, [qc]);

  const openOverlay = useCallback(() => setOverlayOpen(true), []);
  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  return (
    <ConnectionContext.Provider value={{
      isConnected, hasError, realtimeDown, errorMessage, overlayOpen,
      reportSuccess, reportError, reportQueryError,
      reportRealtimeDown, reportRealtimeOk,
      syncAll, openOverlay, closeOverlay,
    }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider');
  return ctx;
};
