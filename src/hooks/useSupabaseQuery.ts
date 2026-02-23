/**
 * Central Supabase hooks — PRODUCTION MODE.
 *
 * All queryFns THROW on error so react-query registers them as failures.
 * The global QueryClient onError handler (in App.tsx) reports errors to
 * ConnectionContext, which shows the FullScreenErrorOverlay.
 *
 * No silent [] fallbacks. No mock data. If Supabase is not configured,
 * every enabled query will throw immediately.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase, isSupabaseConnected } from '@/lib/supabase';
import { toast } from 'sonner';
import { debugLog } from '@/lib/debugLogger';
import type { Member, TableSession, MatchRecord, Booking, Tournament, InventoryItem, Camera, ClubSettings, IndividualTablePricing } from '@/types';

// Shared guard — throws if Supabase is not available
const requireSupabase = (clubId?: string | null) => {
  if (!isSupabaseConnected() || !supabase) {
    throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (clubId !== undefined && !clubId) {
    console.warn('[Snook OS] requireSupabase called with null/empty club_id');
    throw new Error('No club_id resolved. Make sure your account has an associated club in the database.');
  }
  if (clubId) {
    debugLog('query', 'Using club_id:', clubId);
  }
  return supabase!;
};

// All primary query keys — used for broad invalidation as realtime fallback
export const ALL_QUERY_KEYS = ['members', 'tables', 'match-history', 'bookings', 'tournaments', 'inventory', 'cameras', 'club-settings', 'promotions'] as const;

/** Invalidate all primary query keys for a club — realtime fallback */
export const broadInvalidate = (qc: ReturnType<typeof useQueryClient>, clubId: string | null) => {
  ALL_QUERY_KEYS.forEach(key => qc.invalidateQueries({ queryKey: [key, clubId] }));
};

// ─── Helper: get club_id from current user's profile ─────────────────────────
// Returns null (not error) when no auth session — the AuthContext handles login redirect.
export const useClubId = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['club-id'],
    queryFn: async (): Promise<string | null> => {
      const sb = requireSupabase();
      // Check for session first — don't throw AuthSessionMissingError
      const { data: sessionData } = await sb.auth.getSession();
      if (!sessionData?.session) {
        console.log('[Snook OS] useClubId: no session, returning null');
        return null; // Not an error — user needs to log in first
      }
      const userId = sessionData.session.user.id;
      console.log('[Snook OS] useClubId: resolving club for user:', userId);
      const { data: profile, error: profileErr } = await sb
        .from('profiles')
        .select('club_id')
        .eq('id', userId)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (!profile?.club_id) {
        console.warn('[Snook OS] useClubId: no club linked for user:', userId);
        throw new Error('No club associated with this account. Contact your administrator.');
      }
      console.log('[Snook OS] useClubId: resolved club_id:', profile.club_id);
      return profile.club_id as string;
    },
    retry: (failureCount, error) => {
      const msg = (error as any)?.message ?? '';
      // Don't retry "no club" — it's a permanent state
      if (msg.includes('No club associated')) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { clubId: data ?? null, isLoading, error };
};

// ─── MEMBERS ─────────────────────────────────────────────────────────────────
export const useMembers = (clubId: string | null) =>
  useQuery<Member[]>({
    queryKey: ['members', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('members')
        .select('*')
        .eq('club_id', clubId!)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapDbMember);
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useAddMember = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member: Omit<Member, 'id' | 'avatar' | 'lastVisit' | 'gamesPlayed' | 'wins' | 'losses' | 'creditBalance'> & { isGuest?: boolean }) => {
      const sb = requireSupabase(clubId);
      const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const { data, error } = await sb
        .from('members')
        .insert({
          club_id: clubId,
          name: member.name,
          avatar: initials,
          phone: member.phone || '',
          email: member.email || '',
          membership_type: member.isGuest ? 'Guest' : (member.membershipType || 'Regular'),
          is_guest: member.isGuest ?? false,
          credit_balance: 0,
          games_played: 0,
          wins: 0,
          losses: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return mapDbMember(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] addMember error:', err);
      toast.error(`Add member failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useUpdateMember = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Member> }) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('members')
        .update(mapMemberToDb(updates))
        .eq('id', id)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] updateMember error:', err);
      toast.error(`Update member failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── TABLES ──────────────────────────────────────────────────────────────────
// Tables in DB are the physical table records (table_number, type, etc.)
// Sessions are separate. We join them to build TableSession objects.
export const useTables = (clubId: string | null) =>
  useQuery<TableSession[]>({
    queryKey: ['tables', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      // Fetch tables + active session joined
      const { data: tableRows, error: tableErr } = await sb
        .from('tables')
        .select('*, sessions(*)')
        .eq('club_id', clubId!)
        .order('table_number');
      if (tableErr) throw tableErr;
      return (tableRows || []).map(mapDbTable);
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useAddTable = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (table: IndividualTablePricing) => {
      console.log('[Snook OS] 🟢 addTable mutationFn CALLED for table', table.tableNumber, 'clubId:', clubId);
      const sb = requireSupabase(clubId);
      const payload: Record<string, any> = {
        club_id: clubId,
        table_number: table.tableNumber,
        table_name: table.tableName,
        table_type: table.tableType,
        use_global_pricing: table.useGlobal,
        custom_pricing: table.customPricing ?? null,
        status: 'free',
        billing_mode: table.billingMode ?? 'per_minute',
      };
      // image_url may not exist on older schemas — only include if truthy
      if (table.image) payload.image_url = table.image;
      console.log('[Snook OS] addTable payload:', JSON.stringify(payload));
      const { error } = await sb.from('tables').insert(payload);
      if (error) {
        console.error('[Snook OS] addTable DB error:', error);
        throw error;
      }
      console.log('[Snook OS] addTable DB insert succeeded');
    },
    onSuccess: () => {
      console.log('[Snook OS] addTable success, club_id:', clubId);
      qc.invalidateQueries({ queryKey: ['tables', clubId] });
      toast.success('Table added successfully!');
    },
    onError: (err: any) => {
      console.error('[Snook OS] addTable error (club_id:', clubId, '):', err);
      toast.error(`Add table failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useUpdateTableConfig = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (table: IndividualTablePricing) => {
      console.log('[Snook OS] 🟡 updateTableConfig mutationFn CALLED for table', table.tableNumber, 'type:', table.tableType, 'clubId:', clubId);
      const sb = requireSupabase(clubId);
      const updatePayload: Record<string, any> = {
          table_name: table.tableName,
          table_type: table.tableType,
          use_global_pricing: table.useGlobal,
          custom_pricing: table.customPricing ?? null,
          billing_mode: table.billingMode ?? 'per_minute',
      };
      // image_url may not exist on older schemas — only include if provided
      if (table.image !== undefined) updatePayload.image_url = table.image;
      console.log('[Snook OS] updateTableConfig payload:', JSON.stringify(updatePayload));
      const { error } = await sb
        .from('tables')
        .update(updatePayload)
        .eq('table_number', table.tableNumber)
        .eq('club_id', clubId!);
      if (error) {
        console.error('[Snook OS] updateTableConfig DB error:', error);
        throw error;
      }
      console.log('[Snook OS] updateTableConfig DB update succeeded for table', table.tableNumber);
    },
    onSuccess: () => {
      console.log('[Snook OS] ✅ updateTableConfig success');
      qc.invalidateQueries({ queryKey: ['tables', clubId] });
    },
    onError: (err: any) => {
      console.error('[Snook OS] updateTableConfig error (club_id:', clubId, '):', err);
      toast.error(`Update table failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useDeleteTable = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tableNumber: number) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('tables')
        .delete()
        .eq('table_number', tableNumber)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] deleteTable error (club_id:', clubId, '):', err);
      toast.error(`Delete table failed: ${err?.message ?? String(err)}`);
    },
  });
};

// Update a table's live session state (status, players, billing etc.)
export const useUpdateTable = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (table: TableSession) => {
      const sb = requireSupabase(clubId);
      // Update the tables row status/billing_mode
      const { error: tableErr } = await sb
        .from('tables')
        .update({
          status: table.status,
          billing_mode: table.billingMode,
        })
        .eq('id', table.id)
        .eq('club_id', clubId!);
      if (tableErr) throw tableErr;

      if (table.status === 'free') {
        // End session: delete active session
        await sb.from('sessions').delete().eq('table_id', table.id).eq('club_id', clubId!);
      } else {
        // Upsert active session
        const { data: existing } = await sb
          .from('sessions')
          .select('id')
          .eq('table_id', table.id)
          .eq('is_active', true)
          .maybeSingle();

        const sessionPayload = {
          table_id: table.id,
          club_id: clubId,
          players: table.players,
          start_time: table.startTime?.toISOString() ?? null,
          paused_time: table.pausedTime,
          items: table.items,
          total_bill: table.totalBill,
          billing_mode: table.billingMode,
          frame_count: table.frameCount,
          is_active: true,
        };

        if (existing?.id) {
          const { error } = await sb
            .from('sessions')
            .update(sessionPayload)
            .eq('id', existing.id)
            .eq('club_id', clubId!);
          if (error) throw error;
        } else {
          const { error } = await sb.from('sessions').insert(sessionPayload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      console.log('[Snook OS] updateTable success, club_id:', clubId);
      broadInvalidate(qc, clubId);
    },
    onError: (err: any) => {
      console.error('[Snook OS] updateTable error (club_id:', clubId, '):', err);
      toast.error(`Table update failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── MATCH HISTORY ───────────────────────────────────────────────────────────
export const useMatchHistory = (clubId: string | null) =>
  useQuery<MatchRecord[]>({
    queryKey: ['match-history', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('match_history')
        .select('*')
        .eq('club_id', clubId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapDbMatch);
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useAddMatchRecord = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<MatchRecord, 'id'>) => {
      const sb = requireSupabase(clubId);
      console.log('[Snook OS] addMatchRecord → club_id:', clubId, 'table:', record.tableNumber, 'bill:', record.totalBill);
      const doInsert = async () => sb.from('match_history').insert({
        club_id: clubId,
        table_number: record.tableNumber,
        players: record.players,
        date: toTimestampString(record.date) ?? new Date().toISOString(),
        session_start_time: toTimestampString(record.sessionStartTime),
        session_end_time: toTimestampString(record.sessionEndTime),
        duration: record.duration,
        billing_mode: record.billingMode,
        total_bill: record.totalBill,
        payment_method: record.paymentMethod ?? null,
        split_count: record.splitCount ?? 1,
        qr_used: record.qrUsed ?? false,
        gst_amount: (record as any).gstAmount ?? 0,
        items: record.items ?? [],
      });

      let { error } = await doInsert();

      // Retry once on schema cache miss (PGRST204)
      if (error?.code === 'PGRST204') {
        console.warn('[Snook OS] schema cache miss on match_history — retrying after 1s');
        await new Promise(r => setTimeout(r, 1000));
        const retry = await doInsert();
        error = retry.error;
      }

      if (error) {
        console.error('[Snook OS] addMatchRecord insert error (club_id:', clubId, '):', error);
        toast.error(`Failed to save match history – try again. ${error.message}`);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[Snook OS] addMatchRecord success, club_id:', clubId);
      broadInvalidate(qc, clubId);
    },
    onError: (err: any) => {
      console.error('[Snook OS] addMatchRecord error:', err);
      toast.error(`Match history save failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
export const useBookings = (clubId: string | null) =>
  useQuery<Booking[]>({
    queryKey: ['bookings', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('bookings')
        .select('*')
        .eq('club_id', clubId!)
        .order('date');
      if (error) throw error;
      return (data || []).map(mapDbBooking);
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useAddBooking = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (booking: Omit<Booking, 'id'>) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb.from('bookings').insert({
        club_id: clubId,
        table_number: booking.tableNumber,
        customer_name: booking.customerName,
        date: booking.date instanceof Date
          ? `${booking.date.getFullYear()}-${String(booking.date.getMonth() + 1).padStart(2, '0')}-${String(booking.date.getDate()).padStart(2, '0')}`
          : booking.date,
        start_time: booking.startTime,
        end_time: booking.endTime,
        status: booking.status,
        advance_payment: booking.advancePayment ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('[Snook OS] addBooking success, club_id:', clubId);
      qc.invalidateQueries({ queryKey: ['bookings', clubId] });
      toast.success('Booking added!');
    },
    onError: (err: any) => {
      console.error('[Snook OS] addBooking error (club_id:', clubId, '):', err);
      toast.error(`Add booking failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useUpdateBookingStatus = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Booking['status'] }) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('bookings')
        .update({ status })
        .eq('id', id)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] updateBookingStatus error (club_id:', clubId, '):', err);
      toast.error(`Booking update failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── TOURNAMENTS ─────────────────────────────────────────────────────────────
export const useTournaments = (clubId: string | null) =>
  useQuery<Tournament[]>({
    queryKey: ['tournaments', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('tournaments')
        .select('*')
        .eq('club_id', clubId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapDbTournament);
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

// Helper: safely convert a Date to a date-only string "YYYY-MM-DD"
const toDateString = (d: Date): string => {
  try {
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

// Helper: safely convert a value to ISO timestamp string
const toTimestampString = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  try {
    if (typeof d === 'string') return new Date(d).toISOString();
    return d.toISOString();
  } catch {
    return null;
  }
};

export const useCreateTournament = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournament: Omit<Tournament, 'id' | 'registeredPlayers' | 'status'>) => {
      const sb = requireSupabase(clubId);

      // date column is TIMESTAMPTZ — send full ISO string
      const tournamentDate = tournament.date instanceof Date ? tournament.date : new Date(tournament.date);
      const dateStr = tournamentDate.toISOString();
      // start_time: convert "HH:MM" to full ISO timestamp using the tournament date
      const startTimeStr = tournament.startTime
        ? toTimestampString(new Date(`${toDateString(tournamentDate)}T${tournament.startTime}:00`))
        : null;

      console.log('[Snook OS] createTournament → date ISO:', dateStr, 'start_time:', startTimeStr);

      const doInsert = async () => sb.from('tournaments').insert({
        club_id: clubId,
        name: tournament.name,
        type: tournament.type,
        date: dateStr,
        start_time: startTimeStr,
        location: tournament.location,
        entry_fee: tournament.entryFee,
        prize_pool: tournament.prizePool ?? null,
        prize_distribution: tournament.prizeDistribution ?? null,
        max_players: tournament.maxPlayers,
        registered_players: [],
        status: 'upcoming',
        description: tournament.description ?? null,
        tables: tournament.tables ?? null,
        image: tournament.image ?? null,
      });

      let { error } = await doInsert();

      // Retry once on schema cache errors (PGRST204)
      if (error?.code === 'PGRST204') {
        console.warn('[Snook OS] schema cache miss on tournaments — retrying after 1s');
        await new Promise(r => setTimeout(r, 1000));
        const retry = await doInsert();
        error = retry.error;
      }

      if (error) {
        console.error('[Snook OS] createTournament insert error:', error);
        toast.error(`Create tournament failed: ${error.message} — Check timestamp format`);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[Snook OS] createTournament success, club_id:', clubId);
      broadInvalidate(qc, clubId);
      toast.success('Tournament created!');
    },
    onError: (err: any) => {
      console.error('[Snook OS] createTournament error (club_id:', clubId, '):', err);
      // Toast already shown in mutationFn for schema errors; avoid double-toast
      if (err?.code !== 'PGRST204') {
        toast.error(`Create tournament failed: ${err?.message ?? String(err)}`);
      }
    },
  });
};

export const useUpdateTournament = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tournament: Tournament) => {
      const sb = requireSupabase(clubId);
      // date column is TIMESTAMPTZ — send full ISO string
      const tournamentDate = tournament.date instanceof Date ? tournament.date : new Date(tournament.date);
      const dateStr = tournamentDate.toISOString();
      // start_time: convert "HH:MM" to full ISO timestamp using the tournament date
      const startTimeStr = tournament.startTime
        ? toTimestampString(new Date(`${toDateString(tournamentDate)}T${tournament.startTime}:00`))
        : null;

      const doUpdate = async () => sb
        .from('tournaments')
        .update({
          name: tournament.name,
          type: tournament.type,
          date: dateStr,
          start_time: startTimeStr,
          location: tournament.location,
          entry_fee: tournament.entryFee,
          prize_pool: tournament.prizePool ?? null,
          prize_distribution: tournament.prizeDistribution ?? null,
          max_players: tournament.maxPlayers,
          registered_players: tournament.registeredPlayers,
          status: tournament.status,
          description: tournament.description ?? null,
          tables: tournament.tables ?? null,
          winner: tournament.winner ?? null,
          trophies: tournament.trophies ?? null,
          bracket: (tournament as any).bracket ?? null,
        })
        .eq('id', tournament.id)
        .eq('club_id', clubId!);

      let { error } = await doUpdate();

      // Retry once on schema cache miss
      if (error?.code === 'PGRST204') {
        console.warn('[Snook OS] schema cache miss on tournaments update — retrying after 1s');
        await new Promise(r => setTimeout(r, 1000));
        const retry = await doUpdate();
        error = retry.error;
      }

      if (error) {
        console.error('[Snook OS] updateTournament update error:', error);
        toast.error(`Update tournament failed: ${error.message} — Check timestamp format`);
        throw error;
      }
    },
    onSuccess: () => broadInvalidate(qc, clubId),
    onError: (err: any) => {
      console.error('[Snook OS] updateTournament error (club_id:', clubId, '):', err);
      if (err?.code !== 'PGRST204') {
        toast.error(`Update tournament failed: ${err?.message ?? String(err)}`);
      }
    },
  });
};

// ─── INVENTORY ───────────────────────────────────────────────────────────────
export const useInventory = (clubId: string | null) =>
  useQuery<InventoryItem[]>({
    queryKey: ['inventory', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('inventory')
        .select('*')
        .eq('club_id', clubId!)
        .order('name');
      if (error) throw error;
      return (data || []).map(mapDbInventory);
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useAddInventoryItem = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id'>) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb.from('inventory').insert({
        club_id: clubId,
        name: item.name,
        price: item.price,
        category: item.category,
        icon: item.icon,
        stock: item.stock,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('[Snook OS] addInventoryItem success, club_id:', clubId);
      qc.invalidateQueries({ queryKey: ['inventory', clubId] });
      toast.success('Item added to inventory!');
    },
    onError: (err: any) => {
      console.error('[Snook OS] addInventory error (club_id:', clubId, '):', err);
      toast.error(`Add inventory failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useUpdateInventoryItem = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('inventory')
        .update({
          name: updates.name,
          price: updates.price,
          category: updates.category,
          icon: updates.icon,
          stock: updates.stock,
        })
        .eq('id', id)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] updateInventory error (club_id:', clubId, '):', err);
      toast.error(`Update inventory failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useDeleteInventoryItem = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('inventory')
        .delete()
        .eq('id', id)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] deleteInventory error (club_id:', clubId, '):', err);
      toast.error(`Delete inventory item failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── CAMERAS ─────────────────────────────────────────────────────────────────
export const useCameras = (clubId: string | null) =>
  useQuery<Camera[]>({
    queryKey: ['cameras', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('cameras')
        .select('*')
        .eq('club_id', clubId!);
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        url: c.url,
        status: c.status,
        thumbnail: c.thumbnail ?? '',
      }));
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useAddCamera = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (camera: Omit<Camera, 'id'>) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb.from('cameras').insert({ ...camera, club_id: clubId });
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('[Snook OS] addCamera success, club_id:', clubId);
      qc.invalidateQueries({ queryKey: ['cameras', clubId] });
      toast.success('Camera added!');
    },
    onError: (err: any) => {
      console.error('[Snook OS] addCamera error (club_id:', clubId, '):', err);
      toast.error(`Add camera failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useUpdateCamera = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Camera> }) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('cameras')
        .update(updates)
        .eq('id', id)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cameras', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] updateCamera error (club_id:', clubId, '):', err);
      toast.error(`Camera update failed: ${err?.message ?? String(err)}`);
    },
  });
};

export const useDeleteCamera = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb
        .from('cameras')
        .delete()
        .eq('id', id)
        .eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cameras', clubId] }),
    onError: (err: any) => {
      console.error('[Snook OS] deleteCamera error (club_id:', clubId, '):', err);
      toast.error(`Delete camera failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── CLUB SETTINGS ───────────────────────────────────────────────────────────
export const useClubSettings = (clubId: string | null) =>
  useQuery<Partial<ClubSettings>>({
    queryKey: ['club-settings', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('clubs')
        .select('settings, name, logo_url')
        .eq('id', clubId!)
        .single();
      if (error) throw error;
      const settings = data?.settings ?? {};
      return {
        ...settings,
        clubName: data?.name,
        clubLogo: data?.logo_url ?? '',
      };
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useUpdateClubSettings = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<ClubSettings>) => {
      const sb = requireSupabase(clubId);
      const { clubName, clubLogo, ...rest } = settings;
      const { data: current } = await sb.from('clubs').select('settings').eq('id', clubId!).single();
      const merged = { ...(current?.settings ?? {}), ...rest };
      const updates: Record<string, unknown> = { settings: merged };
      if (clubName !== undefined) updates.name = clubName;
      if (clubLogo !== undefined) updates.logo_url = clubLogo;
      const { error } = await sb.from('clubs').update(updates).eq('id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => broadInvalidate(qc, clubId),
    onError: (err: any) => {
      console.error('[Snook OS] updateClubSettings error (club_id:', clubId, '):', err);
      toast.error(`Settings update failed: ${err?.message ?? String(err)}`);
    },
  });
};

// ─── PROMOTIONS ──────────────────────────────────────────────────────────────
// The promotions table schema uses: id, club_id, title, description, discount_percent,
// valid_from, valid_until, is_active, created_at
// We extend it by also storing: message, audience, channel, sent_at as part of description/settings
// To avoid schema conflicts we store all extra fields in the description column as JSON
// OR we use the columns that DO exist and the schema migration adds the new ones.
// The schema.sql has been updated to add message/audience/channel/sent_at to promotions.
export interface SupabasePromotion {
  id: string;
  title: string;
  message: string;
  audience: string;
  channel: string;
  sentAt: Date;
}

export const usePromotions = (clubId: string | null) =>
  useQuery<SupabasePromotion[]>({
    queryKey: ['promotions', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('promotions')
        .select('*')
        .eq('club_id', clubId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        title: p.title ?? '',
        message: p.message ?? p.description ?? '',
        audience: p.audience ?? 'All Members',
        channel: p.channel ?? 'SMS',
        sentAt: new Date(p.sent_at ?? p.created_at),
      }));
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useSendPromotion = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (promo: { title: string; message: string; audience: string; channel: string }) => {
      const sb = requireSupabase(clubId);
      console.log('[Snook OS] sendPromotion → club_id:', clubId, 'title:', promo.title);
      const { error } = await sb.from('promotions').insert({
        club_id: clubId,
        title: promo.title,
        // Store message in description (schema-safe column)
        description: promo.message,
        // Extra columns — these exist after the schema migration below
        message: promo.message,
        audience: promo.audience,
        channel: promo.channel,
        sent_at: new Date().toISOString(),
        is_active: true,
      });
      if (error) {
        console.error('[Snook OS] sendPromotion insert error (club_id:', clubId, '):', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[Snook OS] sendPromotion success, club_id:', clubId);
      qc.invalidateQueries({ queryKey: ['promotions', clubId] });
    },
    onError: (err: any) => {
      console.error('[Snook OS] sendPromotion error:', err);
      toast.error(`Send promotion failed: ${err?.message ?? String(err)}`);
    },
  });
};

// NOTE: Legacy useRealtimeInvalidation removed — all realtime is handled by useRealtimeManager.

// ─── PROMOTION TEMPLATES ─────────────────────────────────────────────────────
export interface PromotionTemplate {
  id: string;
  title: string;
  message: string;
  audience: string;
  channel: string;
}

export const usePromotionTemplates = (clubId: string | null) =>
  useQuery<PromotionTemplate[]>({
    queryKey: ['promotion-templates', clubId],
    queryFn: async () => {
      const sb = requireSupabase(clubId);
      const { data, error } = await sb
        .from('promotion_templates')
        .select('*')
        .eq('club_id', clubId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        message: t.message,
        audience: t.audience ?? 'All Members',
        channel: t.channel ?? 'SMS',
      }));
    },
    enabled: !!clubId && isSupabaseConnected(),
  });

export const useSavePromotionTemplate = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: { title: string; message: string; audience: string; channel: string }) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb.from('promotion_templates').insert({
        club_id: clubId,
        title: template.title,
        message: template.message,
        audience: template.audience,
        channel: template.channel,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotion-templates', clubId] });
      toast.success('Template saved!');
    },
    onError: (err: any) => toast.error(`Save template failed: ${err?.message ?? String(err)}`),
  });
};

export const useDeletePromotionTemplate = (clubId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const sb = requireSupabase(clubId);
      const { error } = await sb.from('promotion_templates').delete().eq('id', id).eq('club_id', clubId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotion-templates', clubId] }),
    onError: (err: any) => toast.error(`Delete template failed: ${err?.message ?? String(err)}`),
  });
};

// ─── MAPPERS ─────────────────────────────────────────────────────────────────
const mapDbMember = (row: any): Member => ({
  id: row.id,
  name: row.name,
  avatar: row.avatar || row.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?',
  membershipType: row.membership_type || 'Regular',
  creditBalance: Number(row.credit_balance) || 0,
  lastVisit: new Date(row.last_visit || Date.now()),
  gamesPlayed: row.games_played || 0,
  wins: row.wins || 0,
  losses: row.losses || 0,
  phone: row.phone || '',
  email: row.email || '',
  isGuest: row.is_guest || false,
  highestBreak: row.highest_break ?? 0,
});

const mapMemberToDb = (member: Partial<Member>) => {
  const mapped: any = {};
  if (member.name !== undefined) mapped.name = member.name;
  if (member.avatar !== undefined) mapped.avatar = member.avatar;
  if (member.membershipType !== undefined) mapped.membership_type = member.membershipType;
  if (member.creditBalance !== undefined) mapped.credit_balance = member.creditBalance;
  if (member.phone !== undefined) mapped.phone = member.phone;
  if (member.email !== undefined) mapped.email = member.email;
  if (member.isGuest !== undefined) mapped.is_guest = member.isGuest;
  if (member.gamesPlayed !== undefined) mapped.games_played = member.gamesPlayed;
  if (member.wins !== undefined) mapped.wins = member.wins;
  if (member.losses !== undefined) mapped.losses = member.losses;
  if (member.lastVisit !== undefined) mapped.last_visit = member.lastVisit.toISOString();
  if (member.highestBreak !== undefined) mapped.highest_break = member.highestBreak;
  return mapped;
};

/**
 * Maps a tables row (with joined sessions[]) to a TableSession.
 * The DB `tables` table holds static config; the live session state
 * comes from the joined `sessions` row (if any active session exists).
 */
const mapDbTable = (row: any): TableSession => {
  // Find the most recent active session for this table
  const activeSessions: any[] = Array.isArray(row.sessions)
    ? row.sessions.filter((s: any) => s.is_active)
    : [];
  const session = activeSessions.sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] ?? null;

  return {
    id: row.id,
    tableNumber: row.table_number,
    tableName: row.table_name || `Table ${String(row.table_number).padStart(2, '0')}`,
    tableType: row.table_type || 'Snooker',
    // Use session status if available, otherwise default free
    status: session ? (row.status || 'occupied') : 'free',
    players: session?.players || [],
    startTime: session?.start_time ? new Date(session.start_time) : null,
    pausedTime: session?.paused_time || 0,
    items: session?.items || [],
    totalBill: Number(session?.total_bill) || 0,
    billingMode: session?.billing_mode || row.billing_mode || 'hourly',
    frameCount: session?.frame_count || 0,
  };
};

const mapDbMatch = (row: any): MatchRecord => ({
  id: row.id,
  tableNumber: row.table_number,
  players: row.players || [],
  date: new Date(row.date),
  sessionStartTime: row.session_start_time ? new Date(row.session_start_time) : undefined,
  sessionEndTime: row.session_end_time ? new Date(row.session_end_time) : undefined,
  duration: row.duration || 0,
  billingMode: row.billing_mode || 'hourly',
  totalBill: Number(row.total_bill) || 0,
  paymentMethod: row.payment_method,
  splitCount: row.split_count,
  qrUsed: row.qr_used,
  items: Array.isArray(row.items) ? row.items : [],
});

const mapDbBooking = (row: any): Booking => ({
  id: row.id,
  tableNumber: row.table_number,
  customerName: row.customer_name,
  date: new Date(row.date + 'T00:00:00'),
  startTime: row.start_time,
  endTime: row.end_time,
  status: row.status,
  advancePayment: row.advance_payment ? Number(row.advance_payment) : undefined,
});

const mapDbTournament = (row: any): Tournament => {
  // start_time may be stored as full ISO timestamp or "HH:MM" text
  let startTime: string | undefined = row.start_time ?? undefined;
  if (startTime && startTime.length > 5) {
    // Extract "HH:MM" from ISO string for display
    try {
      const d = new Date(startTime);
      if (!isNaN(d.getTime())) {
        startTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch { /* keep original */ }
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    date: new Date(row.date),
    startTime,
    location: row.location,
    entryFee: Number(row.entry_fee) || 0,
    prizePool: row.prize_pool ? Number(row.prize_pool) : undefined,
    prizeDistribution: row.prize_distribution,
    maxPlayers: row.max_players || 0,
    registeredPlayers: row.registered_players || [],
    status: row.status || 'upcoming',
    description: row.description,
    tables: row.tables,
    image: row.image,
    winner: row.winner,
    trophies: row.trophies,
    bracket: row.bracket ?? null,
  } as Tournament & { bracket?: any };
};

const mapDbInventory = (row: any): InventoryItem => ({
  id: row.id,
  name: row.name,
  price: Number(row.price) || 0,
  category: row.category,
  icon: row.icon || '📦',
  stock: row.stock || 0,
});
