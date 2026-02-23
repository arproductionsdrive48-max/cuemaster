/**
 * useRealtimeManager — Global Supabase realtime channel manager.
 *
 * Manages ALL club channels in one place with:
 *  • Auto-resubscribe on CLOSED / CHANNEL_ERROR / TIMED_OUT
 *  • Exponential back-off: 3 s → 6 s → 12 s → 24 s → max 30 s (reset on SUBSCRIBED)
 *  • First-attempt failures are IGNORED (normal in preview/sandbox environments)
 *  • Toast suppression: only fires reportRealtimeDown after FAILURE_THRESHOLD
 *    consecutive *non-first-attempt* failures
 *  • visibilitychange listener: resubscribes all when tab returns to foreground
 *  • online listener: resubscribes all when browser regains connectivity
 *  • Strict-mode safe: removeChannel() before every new subscribe
 *  • Proper cleanup on unmount via supabase.removeChannel()
 *
 * Usage: called ONCE inside MembersProvider. Individual screens need nothing extra.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConnected } from '@/lib/supabase';
import { debugLog } from '@/lib/debugLogger';

// ─── Channel → react-query key mapping ───────────────────────────────────────

const TABLE_TO_QUERY_KEY: Record<string, string> = {
  members:              'members',
  tables:               'tables',
  sessions:             'tables',        // sessions changes invalidate the joined "tables" query
  match_history:        'match-history',
  bookings:             'bookings',
  tournaments:          'tournaments',
  inventory:            'inventory',
  promotions:           'promotions',
  clubs:                'club-settings',
  promotion_templates:  'promotion-templates',
  fcm_tokens:           'fcm-tokens',
};

const DB_TABLES = Object.keys(TABLE_TO_QUERY_KEY);

// ─── Exponential back-off helper ─────────────────────────────────────────────

const backoff = (attempt: number) => Math.min(3000 * 2 ** attempt, 30_000);

// Max retries per channel before giving up (manual reconnect needed)
const MAX_RETRIES_PER_CHANNEL = 5;

// Only count failures AFTER a channel's first attempt — the initial
// subscribe→CLOSED→retry cycle is normal in preview/sandbox environments.
// This threshold applies to consecutive *non-first-attempt* failures.
const FAILURE_THRESHOLD = 10;

// ─── Per-channel state ────────────────────────────────────────────────────────

interface ChannelEntry {
  channel: ReturnType<NonNullable<typeof supabase>['channel']> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  attempt: number;
  alive: boolean; // false after hook unmounts → prevents further retries
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface RealtimeManagerOptions {
  onRealtimeDown?: () => void;
  onRealtimeOk?: () => void;
}

export const useRealtimeManager = (clubId: string | null, options?: RealtimeManagerOptions) => {
  const qc = useQueryClient();

  // Stable ref so retry closures always see latest state without stale captures
  const stateRef = useRef<Map<string, ChannelEntry>>(new Map());
  // Ref to clubId so visibility/online handlers always see current value
  const clubIdRef = useRef<string | null>(clubId);
  useEffect(() => { clubIdRef.current = clubId; }, [clubId]);

  // Ref to qc so closures always see current query client
  const qcRef = useRef(qc);
  useEffect(() => { qcRef.current = qc; }, [qc]);

  // Stable ref to hold subscribeAll so we can expose it
  const subscribeAllRef = useRef<(() => void) | null>(null);
  // Ref to options so closures see latest callbacks
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  // Global consecutive failure counter (only non-first-attempt failures)
  const consecutiveFailuresRef = useRef(0);
  // Whether we've already notified the UI about realtime being down
  const notifiedDownRef = useRef(false);
  // Track which channels are currently SUBSCRIBED (healthy) — skip resubscribe for these
  const healthyChannelsRef = useRef<Set<string>>(new Set());
  // Debounce timer for visibility handler
  const visDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!clubId || !isSupabaseConnected() || !supabase) return;

    const sb = supabase!;

    // Reset failure state on fresh mount
    consecutiveFailuresRef.current = 0;
    notifiedDownRef.current = false;
    healthyChannelsRef.current.clear();

    // ── Remove a single channel cleanly ────────────────────────────────────
    const removeChannel = (entry: ChannelEntry) => {
      if (entry.retryTimer !== null) {
        clearTimeout(entry.retryTimer);
        entry.retryTimer = null;
      }
      if (entry.channel) {
        try { sb.removeChannel(entry.channel); } catch { /* ignore */ }
        entry.channel = null;
      }
    };

    // ── Handle a channel failure (CLOSED / CHANNEL_ERROR / TIMED_OUT) ──────
    const handleChannelFailure = (table: string, status: string, err?: Error) => {
      const entry = stateRef.current.get(table);
      if (!entry || !entry.alive) return;

      healthyChannelsRef.current.delete(table);

      const isFirstAttempt = entry.attempt === 0;
      entry.attempt += 1;

      // Stop retrying after MAX_RETRIES_PER_CHANNEL to prevent infinite loops
      if (entry.attempt > MAX_RETRIES_PER_CHANNEL) {
        debugLog('RT', `🛑 ${table} giving up after ${MAX_RETRIES_PER_CHANNEL} attempts — manual reconnect needed`);
        // Still count toward global threshold
        if (!isFirstAttempt) consecutiveFailuresRef.current += 1;
        const totalFails = consecutiveFailuresRef.current;
        if (totalFails >= FAILURE_THRESHOLD && !notifiedDownRef.current) {
          notifiedDownRef.current = true;
          optionsRef.current?.onRealtimeDown?.();
        }
        return; // DO NOT schedule another retry
      }

      const delay = backoff(entry.attempt - 1);

      // First-attempt CLOSED is normal (sandbox race) — don't count toward threshold
      if (!isFirstAttempt) {
        consecutiveFailuresRef.current += 1;
      }

      const totalFails = consecutiveFailuresRef.current;

      if (isFirstAttempt) {
        debugLog('RT', `🔁 ${table} ${status} (first attempt, expected) — retry in ${(delay / 1000).toFixed(0)}s`);
      } else {
        debugLog('RT', `⚠️ ${table} ${status} — backoff retry in ${(delay / 1000).toFixed(0)}s (attempt ${entry.attempt}, fails: ${totalFails})`, err?.message ?? '');
      }

      entry.retryTimer = setTimeout(() => subscribeOne(table), delay);

      // Only notify UI after FAILURE_THRESHOLD consecutive significant failures
      if (totalFails >= FAILURE_THRESHOLD && !notifiedDownRef.current) {
        notifiedDownRef.current = true;
        debugLog('RT', `🔴 ${totalFails} significant failures — notifying UI`);
        optionsRef.current?.onRealtimeDown?.();
      }
    };

    // ── Subscribe a single DB table's channel ──────────────────────────────
    const subscribeOne = (table: string, force = false) => {
      const cid = clubIdRef.current;
      if (!cid || !isSupabaseConnected()) return;

      // Skip if channel is already healthy and this isn't a forced reconnect
      if (!force && healthyChannelsRef.current.has(table)) return;

      // Initialise entry if not present
      if (!stateRef.current.has(table)) {
        stateRef.current.set(table, { channel: null, retryTimer: null, attempt: 0, alive: true });
      }
      const entry = stateRef.current.get(table)!;
      if (!entry.alive) return;

      // Clean up the old channel before creating a new one (strict-mode safe)
      removeChannel(entry);

      const queryKey = TABLE_TO_QUERY_KEY[table];
      // Use a unique channel name each subscribe to avoid ghost subscriptions
      const channelName = `rt-${table}-${cid}-${Date.now()}`;

      const ch = sb
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table, filter: `club_id=eq.${cid}` },
          () => {
            // Invalidate the corresponding react-query cache key
            qcRef.current.invalidateQueries({ queryKey: [queryKey, cid] });
          },
        )
        .subscribe((status: string, err?: Error) => {
          if (!entry.alive) return;

          if (status === 'SUBSCRIBED') {
            debugLog('RT', `✅ ${table} SUBSCRIBED`);
            entry.attempt = 0; // reset back-off counter on success
            healthyChannelsRef.current.add(table);

            // If any channel succeeds, reduce the failure counter
            consecutiveFailuresRef.current = Math.max(0, consecutiveFailuresRef.current - 1);

            // If all channels have recovered, notify OK
            if (consecutiveFailuresRef.current === 0 && notifiedDownRef.current) {
              notifiedDownRef.current = false;
              debugLog('RT', '✅ All channels recovered — realtime OK');
              optionsRef.current?.onRealtimeOk?.();
            }

          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            handleChannelFailure(table, status, err);
          }
        });

      entry.channel = ch;
    };

    // ── Subscribe all channels ──────────────────────────────────────────────
    const subscribeAll = (force = false) => {
      if (!clubIdRef.current || !isSupabaseConnected()) return;
      DB_TABLES.forEach(t => subscribeOne(t, force));
    };

    // Store in ref so reconnectAll can call it
    subscribeAllRef.current = subscribeAll;

    // ── Teardown all channels ───────────────────────────────────────────────
    const destroyAll = () => {
      stateRef.current.forEach(entry => {
        entry.alive = false;
        removeChannel(entry);
      });
      stateRef.current.clear();
    };

    // Mark all entries as alive (handles re-mount after clubId change)
    stateRef.current.forEach(entry => { entry.alive = true; });

    subscribeAll(true); // force on initial mount

    // ── Visibility: resubscribe unhealthy + refetch when tab returns to foreground ──
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Debounce: rapid visibility changes (e.g. switching apps) shouldn't spam
        if (visDebounceRef.current) clearTimeout(visDebounceRef.current);
        visDebounceRef.current = setTimeout(() => {
          const unhealthy = DB_TABLES.filter(t => !healthyChannelsRef.current.has(t));
          if (unhealthy.length > 0) {
            debugLog('RT', `👁 Tab visible — resubscribing ${unhealthy.length} unhealthy channel(s)`);
            consecutiveFailuresRef.current = 0;
            notifiedDownRef.current = false;
            unhealthy.forEach(t => subscribeOne(t, true));
          } else {
            debugLog('RT', '👁 Tab visible — all channels healthy, skipping resubscribe');
          }
          qcRef.current.refetchQueries({ type: 'active' });
        }, 500);
      }
    };

    // ── Network: resubscribe when browser comes back online ──────────────────
    const onOnline = () => {
      debugLog('RT', '🌐 Browser online — resubscribing');
      consecutiveFailuresRef.current = 0;
      notifiedDownRef.current = false;
      healthyChannelsRef.current.clear();
      subscribeAll(true);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      if (visDebounceRef.current) clearTimeout(visDebounceRef.current);
      subscribeAllRef.current = null;
      healthyChannelsRef.current.clear();
      destroyAll();
    };
    // Re-run only when clubId changes (e.g. after login)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  /** Imperatively tear down and resubscribe all channels */
  const reconnectAll = useCallback(() => {
    debugLog('RT', '🔄 Manual reconnect requested');
    consecutiveFailuresRef.current = 0;
    notifiedDownRef.current = false;
    healthyChannelsRef.current.clear();
    const sb = supabase;
    if (sb) {
      stateRef.current.forEach(entry => {
        if (entry.retryTimer !== null) {
          clearTimeout(entry.retryTimer);
          entry.retryTimer = null;
        }
        if (entry.channel) {
          try { sb.removeChannel(entry.channel); } catch { /* ignore */ }
          entry.channel = null;
        }
        entry.attempt = 0;
      });
      stateRef.current.clear();
    }
    subscribeAllRef.current?.();
    qcRef.current.refetchQueries({ type: 'active' });
  }, []);

  return { reconnectAll };
};
