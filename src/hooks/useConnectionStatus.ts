import { useEffect, useState } from 'react';
import { supabase, isSupabaseConnected } from '@/lib/supabase';

export type ConnectionState = 'connected' | 'disconnected' | 'checking';

/**
 * Lightweight ping-based connection monitor.
 * Fires a SELECT on the clubs table every 30s and on browser online/offline events.
 * Used by ConnectionStatusBadge for the UI indicator.
 *
 * Critical errors are also reported via MembersContext → ConnectionContext.
 */
export const useConnectionStatus = () => {
  const [state, setState] = useState<ConnectionState>(
    isSupabaseConnected() ? 'checking' : 'disconnected'
  );

  useEffect(() => {
    if (!isSupabaseConnected() || !supabase) {
      setState('disconnected');
      return;
    }

    const check = async () => {
      try {
        const { error } = await supabase!.from('clubs').select('id').limit(1);
        if (error) {
          console.warn('[Snook OS] Connection ping failed:', error.message);
          setState('disconnected');
        } else {
          setState('connected');
        }
      } catch (err) {
        console.warn('[Snook OS] Connection ping exception:', err);
        setState('disconnected');
      }
    };

    check();

    // Re-check every 30s
    const interval = setInterval(check, 30_000);

    // Also listen to browser online/offline
    const goOnline = () => check();
    const goOffline = () => setState('disconnected');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return state;
};
