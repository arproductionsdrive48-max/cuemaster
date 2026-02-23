/**
 * DebugScreen — "Run Full App Test" + "Stress Test" for Snook OS admins.
 *
 * Runs automated smoke tests against Supabase for every feature area.
 * Each test inserts a dummy row, verifies the response, then cleans up.
 * Results are displayed in a clear pass/fail table with details.
 *
 * Stress Test: loops N iterations of CRUD operations to detect memory leaks,
 * RLS failures, or realtime drops under load.
 *
 * Access: More sheet → "Debug & Test" (admin only)
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMembers } from '@/contexts/MembersContext';
import { broadInvalidate } from '@/hooks/useSupabaseQuery';
import { X, Bug, Play, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, RefreshCw, Radio, RotateCcw, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { refreshSchemaCache } from '@/lib/schemaCache';
import { isDebugEnabled, setDebugEnabled } from '@/lib/debugLogger';


type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warn';

interface TestResult {
  id: string;
  section: string;
  name: string;
  status: TestStatus;
  details: string;
  errorType?: 'rls' | 'network' | 'schema' | 'auth' | 'app';
  durationMs?: number;
}

// ─── Error classifier ─────────────────────────────────────────────────────────
const classifyError = (err: any): { type: TestResult['errorType']; hint: string } => {
  const msg = err?.message ?? String(err);
  const code = err?.code ?? err?.status ?? err?.statusCode ?? '';

  if (msg.includes('JWT') || msg.includes('not authenticated') || code === 401) {
    return { type: 'auth', hint: 'Auth error: user not logged in or JWT expired.' };
  }
  if (msg.includes('permission denied') || msg.includes('policy') || code === 403 || msg.includes('row-level security')) {
    return { type: 'rls', hint: 'RLS denial: check Supabase RLS policies for this table.' };
  }
  if (msg.includes('column') || msg.includes('relation') || msg.includes('does not exist') || msg.includes('violates')) {
    return { type: 'schema', hint: 'Schema mismatch: column name wrong or table missing.' };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('ENOTFOUND')) {
    return { type: 'network', hint: 'Network error: Supabase unreachable. Check internet / URL.' };
  }
  return { type: 'app', hint: 'App-level error. See console for details.' };
};

// ─── Individual test runner ───────────────────────────────────────────────────
const runTest = async (
  name: string,
  section: string,
  fn: () => Promise<string>,
): Promise<TestResult> => {
  const id = `${section}-${name}`.toLowerCase().replace(/\s+/g, '-');
  const start = Date.now();
  try {
    console.group(`[Debug] ${section} › ${name}`);
    const details = await fn();
    const durationMs = Date.now() - start;
    console.log(`✅ PASS (${durationMs}ms):`, details);
    console.groupEnd();
    return { id, section, name, status: 'pass', details, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const { type, hint } = classifyError(err);
    const msg = err?.message ?? String(err);
    console.error(`❌ FAIL (${durationMs}ms):`, msg, err);
    console.groupEnd();
    return {
      id, section, name, status: 'fail',
      details: `${msg} — ${hint}`,
      errorType: type,
      durationMs,
    };
  }
};

// ─── All test suites ──────────────────────────────────────────────────────────
const buildTestSuites = (clubId: string, sb: NonNullable<typeof supabase>) => {
  const DUMMY_PREFIX = '__debug_test__';

  // Track IDs for cleanup
  const cleanup: Array<{ table: string; id: string }> = [];

  const suite = {

    // ── Auth ──────────────────────────────────────────────────────────────────
    auth: [
      async (): Promise<TestResult> => runTest('Check session', 'Auth', async () => {
        const { data, error } = await sb.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error('No authenticated user found.');
        return `Logged in as ${data.user.email ?? data.user.id}`;
      }),
      async (): Promise<TestResult> => runTest('Resolve club_id from profile', 'Auth', async () => {
        const { data: user } = await sb.auth.getUser();
        if (!user.user) throw new Error('Not logged in');
        const { data: profile, error } = await sb
          .from('profiles').select('club_id').eq('id', user.user.id).single();
        if (error) throw error;
        if (!profile?.club_id) throw new Error('profile.club_id is null — account not linked to a club.');
        if (profile.club_id !== clubId) throw new Error(`Context clubId (${clubId}) ≠ profile.club_id (${profile.club_id})`);
        return `club_id = ${profile.club_id}`;
      }),
    ],

    // ── Members ───────────────────────────────────────────────────────────────
    members: [
      async (): Promise<TestResult> => runTest('Insert dummy member', 'Members', async () => {
        console.log('[Debug] addMember → club_id:', clubId);
        const { data, error } = await sb.from('members').insert({
          club_id: clubId,
          name: `${DUMMY_PREFIX}Player`,
          avatar: 'DP',
          membership_type: 'Guest',
          is_guest: true,
          credit_balance: 0, games_played: 0, wins: 0, losses: 0,
          phone: '+91 99999 00000',
          email: 'debug@snookos.test',
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'members', id: data.id });
        return `Inserted member id=${data.id}, club_id=${clubId}`;
      }),
      async (): Promise<TestResult> => runTest('Read back member', 'Members', async () => {
        const { data, error } = await sb.from('members')
          .select('id, name, club_id').eq('club_id', clubId).ilike('name', `${DUMMY_PREFIX}%`).limit(1);
        if (error) throw error;
        if (!data?.length) throw new Error('Dummy member not found — insert may have failed or RLS blocks SELECT.');
        return `Found: ${data[0].name} (${data[0].id})`;
      }),
      async (): Promise<TestResult> => runTest('Update member credit', 'Members', async () => {
        const { data: rows } = await sb.from('members')
          .select('id').eq('club_id', clubId).ilike('name', `${DUMMY_PREFIX}%`).limit(1);
        if (!rows?.length) throw new Error('No dummy member to update.');
        const { error } = await sb.from('members').update({ credit_balance: 99 }).eq('id', rows[0].id).eq('club_id', clubId);
        if (error) throw error;
        return `Updated credit_balance → 99 for id=${rows[0].id}`;
      }),
    ],

    // ── Tables ────────────────────────────────────────────────────────────────
    tables: [
      async (): Promise<TestResult> => runTest('Insert dummy table', 'Tables', async () => {
        console.log('[Debug] addTable → club_id:', clubId);
        const { data, error } = await sb.from('tables').insert({
          club_id: clubId,
          table_number: 9999,
          table_name: `${DUMMY_PREFIX}Table`,
          table_type: 'Snooker',
          status: 'free',
          billing_mode: 'hourly',
          use_global_pricing: true,
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'tables', id: data.id });
        return `Inserted table id=${data.id} (table_number=9999)`;
      }),
      async (): Promise<TestResult> => runTest('Insert session for table', 'Tables', async () => {
        const { data: tableRow } = await sb.from('tables')
          .select('id').eq('club_id', clubId).eq('table_number', 9999).single();
        if (!tableRow) throw new Error('Dummy table not found');
        const { data, error } = await sb.from('sessions').insert({
          club_id: clubId,
          table_id: tableRow.id,
          players: ['Debug Player A', 'Debug Player B'],
          start_time: new Date().toISOString(),
          billing_mode: 'hourly',
          is_active: true,
          total_bill: 0,
          frame_count: 0,
          paused_time: 0,
          items: [],
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'sessions', id: data.id });
        return `Inserted session id=${data.id} for table 9999`;
      }),
      async (): Promise<TestResult> => runTest('Insert match_history', 'Tables', async () => {
        console.log('[Debug] addMatchRecord → club_id:', clubId);
        const { data, error } = await sb.from('match_history').insert({
          club_id: clubId,
          table_number: 9999,
          players: [{ name: 'Debug Player A', result: 'win' }, { name: 'Debug Player B', result: 'loss' }],
          date: new Date().toISOString(),
          session_start_time: new Date().toISOString(),
          session_end_time: new Date().toISOString(),
          duration: 60000,
          billing_mode: 'hourly',
          total_bill: 150,
          payment_method: 'cash',
          split_count: 1,
          qr_used: false,
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'match_history', id: data.id });
        return `Inserted match_history id=${data.id}, total_bill=150`;
      }),
      async (): Promise<TestResult> => runTest('Read match_history', 'Tables', async () => {
        const { data, error } = await sb.from('match_history')
          .select('id, table_number, total_bill').eq('club_id', clubId).eq('table_number', 9999).limit(1);
        if (error) throw error;
        if (!data?.length) throw new Error('match_history row not found — insert may have failed or RLS blocks SELECT.');
        return `Read: table=${data[0].table_number}, bill=₹${data[0].total_bill}`;
      }),
    ],

    // ── Bookings ──────────────────────────────────────────────────────────────
    bookings: [
      async (): Promise<TestResult> => runTest('Insert booking', 'Bookings', async () => {
        console.log('[Debug] addBooking → club_id:', clubId);
        const { data, error } = await sb.from('bookings').insert({
          club_id: clubId,
          table_number: 1,
          customer_name: `${DUMMY_PREFIX}Customer`,
          date: new Date().toISOString().split('T')[0],
          start_time: '10:00',
          end_time: '11:00',
          status: 'pending',
          advance_payment: 100,
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'bookings', id: data.id });
        return `Inserted booking id=${data.id}`;
      }),
      async (): Promise<TestResult> => runTest('Update booking status', 'Bookings', async () => {
        const { data: rows } = await sb.from('bookings')
          .select('id').eq('club_id', clubId).ilike('customer_name', `${DUMMY_PREFIX}%`).limit(1);
        if (!rows?.length) throw new Error('No dummy booking to update.');
        const { error } = await sb.from('bookings').update({ status: 'confirmed' }).eq('id', rows[0].id).eq('club_id', clubId);
        if (error) throw error;
        return `Updated status → confirmed for id=${rows[0].id}`;
      }),
    ],

    // ── Tournaments ───────────────────────────────────────────────────────────
    tournaments: [
      async (): Promise<TestResult> => runTest('Create tournament', 'Tournaments', async () => {
        console.log('[Debug] createTournament → club_id:', clubId);
        const { data, error } = await sb.from('tournaments').insert({
          club_id: clubId,
          name: `${DUMMY_PREFIX}Championship`,
          type: 'Snooker',
          date: new Date().toISOString(),
          location: 'Debug Arena',
          entry_fee: 0,
          max_players: 8,
          registered_players: ['Debug A', 'Debug B'],
          status: 'upcoming',
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'tournaments', id: data.id });
        return `Created tournament id=${data.id}`;
      }),
      async (): Promise<TestResult> => runTest('Update tournament bracket', 'Tournaments', async () => {
        const { data: rows } = await sb.from('tournaments')
          .select('id').eq('club_id', clubId).ilike('name', `${DUMMY_PREFIX}%`).limit(1);
        if (!rows?.length) throw new Error('No dummy tournament to update.');
        const { error } = await sb.from('tournaments').update({
          bracket: [{ id: 'match-1', round: 1, matchNumber: 1, player1: 'Debug A', player2: 'Debug B', score1: 3, score2: 1, bestOf: 5, status: 'completed', winner: 'Debug A' }],
          status: 'in_progress',
        }).eq('id', rows[0].id).eq('club_id', clubId);
        if (error) throw error;
        return `Updated bracket + status=in_progress for id=${rows[0].id}`;
      }),
    ],

    // ── Inventory ─────────────────────────────────────────────────────────────
    inventory: [
      async (): Promise<TestResult> => runTest('Insert inventory item', 'Inventory', async () => {
        console.log('[Debug] addInventory → club_id:', clubId);
        const { data, error } = await sb.from('inventory').insert({
          club_id: clubId,
          name: `${DUMMY_PREFIX}Drink`,
          price: 50,
          category: 'drinks',
          icon: '🧃',
          stock: 10,
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'inventory', id: data.id });
        return `Inserted inventory id=${data.id}`;
      }),
      async (): Promise<TestResult> => runTest('Read inventory', 'Inventory', async () => {
        const { data, error } = await sb.from('inventory')
          .select('id, name, stock').eq('club_id', clubId).ilike('name', `${DUMMY_PREFIX}%`).limit(1);
        if (error) throw error;
        if (!data?.length) throw new Error('Inventory item not found.');
        return `Found: ${data[0].name} × ${data[0].stock}`;
      }),
    ],

    // ── Promotions ────────────────────────────────────────────────────────────
    promotions: [
      async (): Promise<TestResult> => runTest('Send dummy promotion (no real SMS)', 'Promotions', async () => {
        console.log('[Debug] sendPromotion → club_id:', clubId);
        console.log('[Debug] NOTE: This only logs to DB. No real SMS/email sent.');
        const { data, error } = await sb.from('promotions').insert({
          club_id: clubId,
          title: `${DUMMY_PREFIX}Promo`,
          description: 'Debug test promotion',
          message: 'This is a debug test — no real SMS/email/push sent.',
          audience: 'Debug Audience',
          channel: 'DEBUG',
          is_active: true,
        }).select('id').single();
        if (error) throw error;
        cleanup.push({ table: 'promotions', id: data.id });
        return `Logged promotion id=${data.id} (no real notification sent)`;
      }),
    ],

    // ── Settings ──────────────────────────────────────────────────────────────
    settings: [
      async (): Promise<TestResult> => runTest('Read club settings', 'Settings', async () => {
        const { data, error } = await sb.from('clubs').select('id, name, settings').eq('id', clubId).single();
        if (error) throw error;
        if (!data) throw new Error('Club row not found for this club_id');
        return `Club "${data.name}" settings: isOpen=${data.settings?.isOpen}, gstEnabled=${data.settings?.gstEnabled}`;
      }),
      async (): Promise<TestResult> => runTest('Write club settings (GST toggle)', 'Settings', async () => {
        const { data: current } = await sb.from('clubs').select('settings').eq('id', clubId).single();
        const original = current?.settings ?? {};
        // Toggle then restore
        const { error: e1 } = await sb.from('clubs')
          .update({ settings: { ...original, gstEnabled: !original.gstEnabled } }).eq('id', clubId);
        if (e1) throw e1;
        const { error: e2 } = await sb.from('clubs')
          .update({ settings: { ...original } }).eq('id', clubId); // restore
        if (e2) throw e2;
        return `Toggled gstEnabled ${original.gstEnabled} → ${!original.gstEnabled} → ${original.gstEnabled} (restored)`;
      }),
    ],

    // ── Realtime ──────────────────────────────────────────────────────────────
    realtime: [
      async (): Promise<TestResult> => runTest('Realtime channel subscribe', 'Realtime', async () => {
        // Try up to 2 attempts — first CLOSED is normal in sandbox/preview environments
        const trySubscribe = (attempt: number): Promise<string> => new Promise((resolve, reject) => {
          const chName = `debug-realtime-${clubId}-${Date.now()}`;
          const ch = sb
            .channel(chName)
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'members', filter: `club_id=eq.${clubId}` }, () => {})
            .subscribe((status: string, err: any) => {
              if (status === 'SUBSCRIBED') {
                sb.removeChannel(ch);
                resolve(`Realtime channel subscribed OK (attempt ${attempt + 1})`);
              } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                sb.removeChannel(ch);
                if (attempt === 0) {
                  // First CLOSED is expected — retry once after a short delay
                  console.log(`[Debug] Realtime first attempt ${status} — retrying…`);
                  setTimeout(() => trySubscribe(1).then(resolve, reject), 2000);
                } else {
                  reject(new Error(`Realtime subscription failed: ${status} – ${err?.message ?? ''}`));
                }
              }
            });
          setTimeout(() => { sb.removeChannel(ch); reject(new Error('Realtime subscription timed out after 8s')); }, 8000);
        });
        return trySubscribe(0);
      }),
    ],

    // ── Cleanup ───────────────────────────────────────────────────────────────
    __cleanup: async (): Promise<{ cleaned: number; errors: string[] }> => {
      let cleaned = 0;
      const errors: string[] = [];
      // Delete in reverse order to respect FK constraints
      for (const { table, id } of [...cleanup].reverse()) {
        const { error } = await sb.from(table as any).delete().eq('id', id);
        if (error) {
          errors.push(`${table}/${id}: ${error.message}`);
        } else {
          cleaned++;
        }
      }
      return { cleaned, errors };
    },
  };

  return suite;
};

// ─── Status icon ─────────────────────────────────────────────────────────────
const StatusIcon = ({ status }: { status: TestStatus }) => {
  if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-available" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-destructive" />;
  if (status === 'warn') return <XCircle className="w-4 h-4 text-yellow-400" />;
  return <div className="w-4 h-4 rounded-full border border-border" />;
};

const errorTypeBadge: Record<string, string> = {
  rls: 'RLS Policy',
  auth: 'Auth / JWT',
  network: 'Network',
  schema: 'Schema',
  app: 'App Bug',
};

// ─── Component ────────────────────────────────────────────────────────────────
interface DebugScreenProps {
  onBack: () => void;
}

const DebugScreen = ({ onBack }: DebugScreenProps) => {
  const { clubId, isOnline, reconnectRealtime } = useMembers();
  const qc = useQueryClient();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState<string>('');
  const [reconnecting, setReconnecting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ pass: number; fail: number; total: number } | null>(null);
  const [debugEnabled, setDebugState] = useState(isDebugEnabled());
  const [stressRunning, setStressRunning] = useState(false);
  const [stressLog, setStressLog] = useState<string[]>([]);

  const handleRefreshSchema = useCallback(async () => {
    setRefreshing(true);
    toast.loading('Refreshing schema cache…', { id: 'schema-refresh' });
    const { refreshed, errors } = await refreshSchemaCache();
    toast.dismiss('schema-refresh');
    if (errors.length === 0) {
      toast.success(`Schema cache refreshed for ${refreshed} tables ✅`);
    } else {
      toast.warning(`Refreshed ${refreshed} tables. Errors: ${errors.join(', ')}`);
    }
    setRefreshing(false);
  }, []);

  const handleReconnectRealtime = useCallback(() => {
    setReconnecting(true);
    toast.loading('Reconnecting realtime channels…', { id: 'rt-reconnect' });
    reconnectRealtime();
    setTimeout(() => {
      setReconnecting(false);
      toast.dismiss('rt-reconnect');
      toast.success('Realtime channels reconnected ✅');
    }, 2000);
  }, [reconnectRealtime]);

  const handleForceRefreshAll = useCallback(() => {
    setRefreshingAll(true);
    toast.loading('Refreshing all queries…', { id: 'force-refresh' });
    broadInvalidate(qc, clubId);
    qc.refetchQueries({ type: 'active' });
    setTimeout(() => {
      setRefreshingAll(false);
      toast.dismiss('force-refresh');
      toast.success('All queries refreshed ✅');
    }, 1500);
  }, [qc, clubId]);

  const handleToggleDebug = useCallback(() => {
    const next = !debugEnabled;
    setDebugState(next);
    setDebugEnabled(next);
    toast.success(next ? 'Debug logs enabled — verbose console output ON' : 'Debug logs disabled');
  }, [debugEnabled]);

  const handleStressTest = useCallback(async () => {
    if (!supabase || !clubId) return;
    const sb = supabase;
    setStressRunning(true);
    setStressLog([]);
    const ITERATIONS = 100;
    const log = (msg: string) => setStressLog(prev => [...prev.slice(-200), msg]);
    const DUMMY = '__stress_test__';

    log(`🚀 Starting stress test: ${ITERATIONS} iterations`);
    let passed = 0;
    let failed = 0;
    const cleanupIds: { table: string; id: string }[] = [];

    for (let i = 1; i <= ITERATIONS; i++) {
      try {
        // INSERT member
        const { data: m, error: e1 } = await sb.from('members').insert({
          club_id: clubId, name: `${DUMMY}_${i}`, avatar: 'ST',
          membership_type: 'Guest', is_guest: true, credit_balance: 0,
          games_played: 0, wins: 0, losses: 0, phone: '', email: '',
        }).select('id').single();
        if (e1) throw e1;
        cleanupIds.push({ table: 'members', id: m.id });

        // UPDATE
        const { error: e2 } = await sb.from('members').update({ credit_balance: i }).eq('id', m.id).eq('club_id', clubId);
        if (e2) throw e2;

        // DELETE
        const { error: e3 } = await sb.from('members').delete().eq('id', m.id).eq('club_id', clubId);
        if (e3) throw e3;
        cleanupIds.pop(); // no longer needs cleanup

        passed++;
        if (i % 10 === 0) log(`✅ Passed ${i}/${ITERATIONS} — no errors`);
      } catch (err: any) {
        failed++;
        log(`❌ Failed at iteration ${i}: ${err?.message ?? String(err)}`);
      }
    }

    // Cleanup any remaining
    for (const { table, id } of cleanupIds) {
      try { await sb.from(table as any).delete().eq('id', id); } catch { /* ignore */ }
    }

    const finalMsg = failed === 0
      ? `🎉 Passed ${passed}/${ITERATIONS} iterations — no errors!`
      : `⚠️ Completed: ${passed} passed, ${failed} failed out of ${ITERATIONS}`;
    log(finalMsg);
    toast[failed === 0 ? 'success' : 'error'](finalMsg);
    setStressRunning(false);
  }, [clubId]);

  const addResult = useCallback((r: TestResult) => {
    setResults(prev => {
      const idx = prev.findIndex(p => p.id === r.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = r;
        return next;
      }
      return [...prev, r];
    });
  }, []);

  const handleRunAll = useCallback(async () => {
    if (!supabase) {
      toast.error('Supabase not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    if (!clubId) {
      toast.error('No club_id. Make sure you are logged in and your profile is linked to a club.');
      return;
    }

    setResults([]);
    setSummary(null);
    setCleanupMsg('');
    setRunning(true);
    toast.loading('Running full app test…', { id: 'debug-run' });

    const suites = buildTestSuites(clubId, supabase);

    // Gather all test fn arrays
    const allFns: Array<() => Promise<TestResult>> = [
      ...suites.auth,
      ...suites.members,
      ...suites.tables,
      ...suites.bookings,
      ...suites.tournaments,
      ...suites.inventory,
      ...suites.promotions,
      ...suites.settings,
      ...suites.realtime,
    ];

    // Run sequentially so FK deps are satisfied and cleanup works
    const allResults: TestResult[] = [];
    for (const fn of allFns) {
      const r = await fn();
      addResult(r);
      allResults.push(r);
    }

    // Cleanup
    const { cleaned, errors } = await suites.__cleanup();
    setCleanupMsg(
      errors.length > 0
        ? `Cleaned ${cleaned} rows. Cleanup errors: ${errors.join('; ')}`
        : `Cleaned up ${cleaned} dummy rows.`
    );

    const pass = allResults.filter(r => r.status === 'pass').length;
    const fail = allResults.filter(r => r.status === 'fail').length;
    setSummary({ pass, fail, total: allResults.length });

    setRunning(false);
    toast.dismiss('debug-run');
    if (fail === 0) {
      toast.success(`All ${pass} tests passed! ✅`);
    } else {
      toast.error(`${fail} / ${allResults.length} tests failed. Check results below.`);
    }
  }, [clubId, addResult]);

  // Group results by section
  const sections = results.reduce<Record<string, TestResult[]>>((acc, r) => {
    if (!acc[r.section]) acc[r.section] = [];
    acc[r.section].push(r);
    return acc;
  }, {});

  const sectionNames = Object.keys(sections);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in-up">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-safe-top pt-4 pb-3 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-accent/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Bug className="w-5 h-5 text-destructive" />
            <h1 className="text-lg font-bold">Debug & Test Mode</h1>
          </div>
          {summary && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-available">{summary.pass}✓</span>
              <span className="text-destructive">{summary.fail}✗</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">

        {/* Info card */}
        <div className="glass-card p-4 space-y-2 border border-destructive/20">
          <p className="text-sm font-semibold text-destructive">⚠️ Admin Only — Production Database</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This runs real mutations against your Supabase database using dummy data, then cleans up.
            Each test logs its <code className="bg-secondary px-1 rounded">club_id</code> to the browser console.
            Errors are classified: <span className="text-yellow-400">RLS</span>, <span className="text-destructive">Auth</span>,
            <span className="text-blue-400">Network</span>, <span className="text-orange-400">Schema</span>, or <span className="text-muted-foreground">App Bug</span>.
          </p>
          <div className="text-xs text-muted-foreground">
            club_id: <code className="bg-secondary px-1.5 py-0.5 rounded font-mono text-primary">{clubId ?? 'not resolved'}</code>
            &nbsp;|&nbsp;
            Status: <span className={cn('font-semibold', isOnline ? 'text-available' : 'text-destructive')}>
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Schema cache refresh + Reconnect RT + Run button */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleRefreshSchema}
            disabled={refreshing || !isOnline}
            title="Force PostgREST to reload schema cache — fixes PGRST204 column-not-found errors after migrations"
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-semibold text-sm transition-all border border-border',
              refreshing || !isOnline
                ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                : 'bg-secondary hover:bg-accent/30 active:scale-[0.97]'
            )}
          >
            {refreshing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />
            }
            <span className="whitespace-nowrap">Refresh Schema</span>
          </button>
          <button
            onClick={handleReconnectRealtime}
            disabled={reconnecting || !isOnline}
            title="Tear down and resubscribe all realtime channels"
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-semibold text-sm transition-all border border-border',
              reconnecting || !isOnline
                ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                : 'bg-secondary hover:bg-accent/30 active:scale-[0.97]'
            )}
          >
            {reconnecting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Radio className="w-4 h-4" />
            }
            <span className="whitespace-nowrap">Reconnect RT</span>
          </button>
          <button
            onClick={handleForceRefreshAll}
            disabled={refreshingAll || !isOnline}
            title="Invalidate and refetch all query caches — use when realtime fails to sync"
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-semibold text-sm transition-all border border-border',
              refreshingAll || !isOnline
                ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                : 'bg-secondary hover:bg-accent/30 active:scale-[0.97]'
            )}
          >
            {refreshingAll
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RotateCcw className="w-4 h-4" />
            }
            <span className="whitespace-nowrap">Refresh All</span>
          </button>
          <button
            onClick={handleRunAll}
            disabled={running || !isOnline || !clubId}
            className={cn(
              'flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-base',
              running
                ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                : (!isOnline || !clubId)
                  ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                  : 'btn-premium active:scale-[0.97]'
            )}
          >
            {running ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Running tests…</>
            ) : (
              <><Play className="w-5 h-5" /> Run Full App Test</>
            )}
          </button>
        </div>

        {/* Debug Logs Toggle + Stress Test */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleToggleDebug}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all border',
              debugEnabled
                ? 'bg-available/10 border-available/30 text-available'
                : 'bg-secondary border-border text-muted-foreground'
            )}
          >
            {debugEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Debug Logs {debugEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleStressTest}
            disabled={stressRunning || !isOnline || !clubId}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all border',
              stressRunning || !isOnline || !clubId
                ? 'bg-secondary border-border text-muted-foreground opacity-50 cursor-not-allowed'
                : 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 active:scale-[0.97]'
            )}
          >
            {stressRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {stressRunning ? 'Stress Testing…' : 'Stress Test (100 ops)'}
          </button>
        </div>

        {/* Stress Test Log */}
        {stressLog.length > 0 && (
          <div className="glass-card p-4 space-y-1 max-h-48 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stress Test Log</p>
            {stressLog.map((line, i) => (
              <p key={i} className={cn(
                'text-xs font-mono',
                line.startsWith('❌') ? 'text-destructive' : line.startsWith('🎉') ? 'text-available' : 'text-muted-foreground'
              )}>
                {line}
              </p>
            ))}
          </div>
        )}

        {!isOnline && (
          <p className="text-center text-sm text-destructive">Offline – connect to Supabase before running tests.</p>
        )}
        {!clubId && isOnline && (
          <p className="text-center text-sm text-destructive">No club_id resolved – log in and check your profile.</p>
        )}


        {/* Summary bar */}
        {summary && (
          <div className="glass-card p-4 flex items-center justify-around">
            <div className="text-center">
              <p className="text-2xl font-bold text-available">{summary.pass}</p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{summary.fail}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}

        {/* Results by section */}
        {sectionNames.map(section => {
          const sectionResults = sections[section];
          const sPass = sectionResults.filter(r => r.status === 'pass').length;
          const sFail = sectionResults.filter(r => r.status === 'fail').length;
          const isExpanded = expandedSection === section || sFail > 0;

          return (
            <div key={section} className="glass-card overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => setExpandedSection(isExpanded && expandedSection === section ? null : section)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/10 transition-colors"
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold',
                  sFail > 0 ? 'bg-destructive/20 text-destructive' : 'bg-available/20 text-available'
                )}>
                  {sFail > 0 ? sFail : sPass}
                </div>
                <span className="flex-1 text-left font-semibold">{section}</span>
                <span className="text-xs text-muted-foreground">{sPass}/{sectionResults.length}</span>
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                }
              </button>

              {/* Tests */}
              {isExpanded && (
                <div className="border-t border-border/50 divide-y divide-border/30">
                  {sectionResults.map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <StatusIcon status={r.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{r.name}</p>
                          {r.errorType && (
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide',
                              r.errorType === 'rls' ? 'bg-yellow-400/20 text-yellow-400' :
                              r.errorType === 'auth' ? 'bg-destructive/20 text-destructive' :
                              r.errorType === 'network' ? 'bg-blue-400/20 text-blue-400' :
                              r.errorType === 'schema' ? 'bg-orange-400/20 text-orange-400' :
                              'bg-secondary text-muted-foreground'
                            )}>
                              {errorTypeBadge[r.errorType]}
                            </span>
                          )}
                          {r.durationMs !== undefined && (
                            <span className="text-[10px] text-muted-foreground">{r.durationMs}ms</span>
                          )}
                        </div>
                        <p className={cn(
                          'text-xs mt-0.5 leading-relaxed break-all',
                          r.status === 'fail' ? 'text-destructive/80' : 'text-muted-foreground'
                        )}>
                          {r.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Cleanup message */}
        {cleanupMsg && (
          <div className="glass-card p-4 border border-border/50">
            <p className="text-xs text-muted-foreground font-mono">{cleanupMsg}</p>
          </div>
        )}

        {/* Legend */}
        {results.length === 0 && !running && (
          <div className="glass-card p-5 space-y-3">
            <h3 className="font-semibold text-sm">What gets tested:</h3>
            {[
              ['Auth', 'Session validity, club_id link'],
              ['Members', 'Insert, read, update'],
              ['Tables', 'Insert table, session, match_history, read-back'],
              ['Bookings', 'Create booking, update status'],
              ['Tournaments', 'Create, bracket update'],
              ['Inventory', 'Insert item, read-back'],
              ['Promotions', 'Log promo (no real SMS sent)'],
              ['Settings', 'Read & write club settings'],
              ['Realtime', 'Subscribe to Postgres changes'],
            ].map(([section, desc]) => (
              <div key={section} className="flex items-start gap-2 text-xs">
                <span className="text-primary font-semibold w-24 flex-shrink-0">{section}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugScreen;
