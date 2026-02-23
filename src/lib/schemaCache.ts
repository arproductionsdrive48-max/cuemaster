/**
 * schemaCache.ts — Supabase schema cache utilities.
 *
 * Fixes PGRST204 "Could not find column in schema cache" errors
 * that occur after schema migrations until PostgREST reloads its cache.
 *
 * Usage:
 *   import { warmUpSchemaCache, withSchemaRetry } from '@/lib/schemaCache';
 *
 *   // On app/login mount:
 *   await warmUpSchemaCache();
 *
 *   // Wrap any mutation that may hit stale schema:
 *   await withSchemaRetry(() => supabase.from('match_history').insert({...}));
 */

import { supabase } from '@/lib/supabase';

const SCHEMA_TABLES = [
  'members', 'tables', 'sessions', 'match_history',
  'bookings', 'tournaments', 'inventory', 'promotions',
  'clubs', 'cameras',
] as const;

/**
 * Fires a dummy SELECT on every critical table to force PostgREST
 * to refresh its schema cache. Safe to call on app/login mount.
 */
export const warmUpSchemaCache = async (): Promise<void> => {
  if (!supabase) return;
  try {
    await Promise.allSettled(
      SCHEMA_TABLES.map(t => supabase!.from(t).select('count').limit(0))
    );
    console.log('[Snook OS] Schema cache warmed up for', SCHEMA_TABLES.length, 'tables');
  } catch (e) {
    console.warn('[Snook OS] Schema warm-up failed (non-critical):', e);
  }
};

/**
 * Runs dummy SELECTs on all tables and returns counts for debug UI.
 */
export const refreshSchemaCache = async (): Promise<{ refreshed: number; errors: string[] }> => {
  if (!supabase) return { refreshed: 0, errors: ['Supabase not configured'] };
  const errors: string[] = [];
  let refreshed = 0;
  await Promise.allSettled(
    SCHEMA_TABLES.map(async (t) => {
      const { error } = await supabase!.from(t).select('count').limit(0);
      if (error) { errors.push(`${t}: ${error.message}`); }
      else { refreshed++; }
    })
  );
  console.log(`[Snook OS] Schema cache refreshed: ${refreshed}/${SCHEMA_TABLES.length} tables`);
  return { refreshed, errors };
};

/**
 * Retry a Supabase mutation once after 1s if it fails with a PGRST204
 * schema cache error. Use this to wrap any insert/update that might
 * hit stale PostgREST schema after a migration.
 *
 * Example:
 *   const { data, error } = await withSchemaRetry(() =>
 *     supabase.from('match_history').insert({ ... }).select('id').single()
 *   );
 */
export const withSchemaRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const msg = e?.message ?? '';
    const isSchemaErr =
      e?.code === 'PGRST204' ||
      msg.includes('schema cache') ||
      msg.includes('Could not find column');
    if (isSchemaErr) {
      console.warn('[Snook OS] PGRST204 – refreshing schema cache and retrying in 1s…', msg);
      await warmUpSchemaCache();
      await new Promise<void>(r => setTimeout(r, 1000));
      return await fn();
    }
    throw err;
  }
};
