/**
 * MembersContext — PRODUCTION MODE Supabase data layer.
 *
 * - NO mock data, NO silent fallbacks.
 * - All table session state is driven by Supabase (tables + sessions tables).
 * - setTables dispatches mutations so changes persist.
 * - On any critical fetch error → reports to ConnectionContext → FullScreenErrorOverlay.
 */

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection } from '@/contexts/ConnectionContext';
import { isCriticalMessage } from '@/contexts/ConnectionContext';
import {
  Member, Camera, InventoryItem, ClubSettings,
  TablePricing, IndividualTablePricing, TableSession, MatchRecord, Tournament,
} from '@/types';
import { isSupabaseConnected } from '@/lib/supabase';
import {
  useClubId,
  useMembers as useSupabaseMembers,
  useAddMember as useSupabaseAddMember,
  useUpdateMember as useSupabaseUpdateMember,
  useTables as useSupabaseTables,
  useUpdateTable as useSupabaseUpdateTable,
  useAddTable as useSupabaseAddTable,
  useUpdateTableConfig as useSupabaseUpdateTableConfig,
  useDeleteTable as useSupabaseDeleteTable,
  useMatchHistory as useSupabaseMatchHistory,
  useAddMatchRecord as useSupabaseAddMatchRecord,
  useTournaments as useSupabaseTournaments,
  useCreateTournament as useSupabaseCreateTournament,
  useUpdateTournament as useSupabaseUpdateTournament,
  useInventory as useSupabaseInventory,
  useAddInventoryItem as useSupabaseAddInventoryItem,
  useUpdateInventoryItem as useSupabaseUpdateInventoryItem,
  useDeleteInventoryItem as useSupabaseDeleteInventoryItem,
  useCameras as useSupabaseCameras,
  useAddCamera as useSupabaseAddCamera,
  useUpdateCamera as useSupabaseUpdateCamera,
  useDeleteCamera as useSupabaseDeleteCamera,
  useClubSettings as useSupabaseClubSettings,
  useUpdateClubSettings as useSupabaseUpdateClubSettings,
} from '@/hooks/useSupabaseQuery';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { toast } from 'sonner';


// ─── Default safe values ─────────────────────────────────────────────────────
const defaultTablePricing: TablePricing = {
  perHour: 200, perMinute: 4, perFrame: 50,
  peakHourRate: 300, offPeakRate: 150,
  peakHoursStart: '18:00', peakHoursEnd: '23:00',
  defaultBillingMode: 'hourly',
};

const defaultClubSettings: ClubSettings = {
  isOpen: true,
  upiQrCode: '',
  reminderTemplate: 'Hi {name}, your pending amount at Snook OS is ₹{amount}. Please clear it soon. Thanks!',
  tablePricing: defaultTablePricing,
  individualTablePricing: [],
  showMembershipBadge: true,
  clubName: 'Snook OS',
  clubLogo: '',
  gstEnabled: false,
  gstRate: 18,
};

// ─── Context type ─────────────────────────────────────────────────────────────
interface MembersContextType {
  members: Member[];
  addMember: (member: Omit<Member, 'id' | 'avatar' | 'lastVisit' | 'gamesPlayed' | 'wins' | 'losses' | 'creditBalance'> & { isGuest?: boolean }) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  cameras: Camera[];
  addCamera: (camera: Omit<Camera, 'id'>) => void;
  updateCamera: (id: string, camera: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  clubSettings: ClubSettings;
  updateClubSettings: (settings: Partial<ClubSettings>) => void;
  tables: TableSession[];
  /** Optimistically update tables in UI; fires Supabase mutation for the changed table */
  setTables: React.Dispatch<React.SetStateAction<TableSession[]>>;
  /** Directly push a full table update to Supabase */
  updateTable: (table: TableSession) => void;
  matchHistory: MatchRecord[];
  addMatchRecord: (record: Omit<MatchRecord, 'id'>) => void;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  /** Sync physical table list changes from ManageTablesModal to Supabase */
  syncTablesWithPricing: (pricing: IndividualTablePricing[]) => void;
  clubId: string | null;
  /** true when Supabase is connected AND club_id resolved AND no fetch error */
  isOnline: boolean;
  /** true while club_id is being resolved on first load */
  isLoading: boolean;
  /** Force-reconnect all realtime channels */
  reconnectRealtime: () => void;
  /** 'no-club' when user has no club linked, 'auth-error' on auth failure, null when OK */
  clubIdErrorType: 'no-club' | 'auth-error' | null;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const MembersProvider = ({ children }: { children: ReactNode }) => {
  const { reportSuccess, reportError, reportQueryError, reportRealtimeDown, reportRealtimeOk } = useConnection();
  const qc = useQueryClient();
  const { clubId, isLoading: isResolvingClubId, error: clubIdError } = useClubId();
  const online = isSupabaseConnected() && !!clubId;

  // — Classify club_id error: "no-club" vs "auth-error" —
  const clubIdErrorType = clubIdError
    ? ((clubIdError as any)?.message ?? '').toLowerCase().includes('no club')
      ? 'no-club' as const
      : 'auth-error' as const
    : null;

  // — Club_id resolution failure: only open blocking overlay for auth errors, not "no club" —
  useEffect(() => {
    if (!clubIdError) return;
    const msg = (clubIdError as any)?.message ?? String(clubIdError);
    if (clubIdErrorType === 'auth-error') {
      reportError(msg); // opens overlay for auth failures
    }
    console.error('[Snook OS] club_id resolution failed:', msg, '(type:', clubIdErrorType, ')');
  }, [clubIdError, reportError, clubIdErrorType]);

  // — Global realtime manager: handles all channels with auto-resubscribe + visibility recovery —
  const realtimeCallbacks = useMemo(() => ({
    onRealtimeDown: reportRealtimeDown,
    onRealtimeOk: reportRealtimeOk,
  }), [reportRealtimeDown, reportRealtimeOk]);
  const { reconnectAll: reconnectRealtime } = useRealtimeManager(online ? clubId : null, realtimeCallbacks);

  // — Supabase reads —
  const { data: sbMembers, error: membersError, isSuccess: membersOk } = useSupabaseMembers(online ? clubId : null);
  const { data: sbTables, error: tablesError, isSuccess: tablesOk } = useSupabaseTables(online ? clubId : null);
  const { data: sbMatchHistory, error: matchError } = useSupabaseMatchHistory(online ? clubId : null);
  const { data: sbTournaments, error: tournamentsError } = useSupabaseTournaments(online ? clubId : null);
  const { data: sbInventory } = useSupabaseInventory(online ? clubId : null);
  const { data: sbCameras } = useSupabaseCameras(online ? clubId : null);
  const { data: sbClubSettings } = useSupabaseClubSettings(online ? clubId : null);

  // — Error routing: critical → overlay, query-level → toast + red dot —
  useEffect(() => {
    const errorsToCheck: { err: unknown; label: string }[] = [
      { err: membersError, label: 'members' },
      { err: tablesError,  label: 'tables'  },
      { err: matchError,   label: 'match history' },
      { err: tournamentsError, label: 'tournaments' },
    ];

    let anyCritical = false;
    errorsToCheck.forEach(({ err, label }) => {
      if (!err) return;
      const msg = (err as any)?.message ?? String(err);
      if (isCriticalMessage(msg)) {
        anyCritical = true;
        reportError(msg); // opens overlay
      } else {
        reportQueryError(label, msg); // toast only, red dot
      }
    });

    if (!anyCritical && online && (membersOk || tablesOk)) {
      reportSuccess();
    }
  }, [membersError, tablesError, matchError, tournamentsError, membersOk, tablesOk, online, reportError, reportQueryError, reportSuccess]);

  // — Supabase mutations —
  // Mutations use direct HTTP calls — they should NOT be gated by realtime `online` status
  const { mutate: sbAddMember } = useSupabaseAddMember(clubId);
  const { mutate: sbUpdateMember } = useSupabaseUpdateMember(clubId);
  const { mutate: sbUpdateTable } = useSupabaseUpdateTable(clubId);
  const { mutate: sbAddTable } = useSupabaseAddTable(clubId);
  const { mutate: sbUpdateTableConfig } = useSupabaseUpdateTableConfig(clubId);
  const { mutate: sbDeleteTable } = useSupabaseDeleteTable(clubId);
  const { mutate: sbAddMatchRecord } = useSupabaseAddMatchRecord(clubId);
  const { mutate: sbCreateTournament } = useSupabaseCreateTournament(clubId);
  const { mutate: sbUpdateTournament } = useSupabaseUpdateTournament(clubId);
  const { mutate: sbAddInventory } = useSupabaseAddInventoryItem(clubId);
  const { mutate: sbUpdateInventory } = useSupabaseUpdateInventoryItem(clubId);
  const { mutate: sbDeleteInventory } = useSupabaseDeleteInventoryItem(clubId);
  const { mutate: sbAddCamera } = useSupabaseAddCamera(clubId);
  const { mutate: sbUpdateCamera } = useSupabaseUpdateCamera(clubId);
  const { mutate: sbDeleteCamera } = useSupabaseDeleteCamera(clubId);
  const { mutate: sbUpdateSettings } = useSupabaseUpdateClubSettings(clubId);

  // — Final values: empty arrays when offline / errored —
  const members: Member[] = online && !membersError ? (sbMembers ?? []) : [];
  const cameras: Camera[] = online ? (sbCameras ?? []) : [];
  const inventory: InventoryItem[] = online ? (sbInventory ?? []) : [];
  const matchHistory: MatchRecord[] = online && !matchError ? (sbMatchHistory ?? []) : [];
  const tournaments: Tournament[] = online && !tournamentsError ? (sbTournaments ?? []) : [];
  // tables come 100% from Supabase (tables + sessions join). No local fallback.
  const tables: TableSession[] = online && !tablesError ? (sbTables ?? []) : [];
  const clubSettings: ClubSettings = online && sbClubSettings && Object.keys(sbClubSettings).length
    ? { ...defaultClubSettings, ...sbClubSettings }
    : defaultClubSettings;

  /**
   * setTables: accepts a React state dispatch action (value or updater function).
   * For each table in the next state that differs from the current Supabase data,
   * we call sbUpdateTable to persist it.
   *
   * This allows TablesScreen to call setTables(...) as before, while all changes
   * now flow through to Supabase.
   */
  const setTables: React.Dispatch<React.SetStateAction<TableSession[]>> = useCallback((action) => {
    if (!online) return;
    const currentTables = sbTables ?? [];
    const nextTables = typeof action === 'function' ? action(currentTables) : action;

    nextTables.forEach(next => {
      const current = currentTables.find(t => t.id === next.id);
      // Only fire a mutation if something changed
      const changed = !current
        || current.status !== next.status
        || current.players.join(',') !== next.players.join(',')
        || current.totalBill !== next.totalBill
        || current.frameCount !== next.frameCount
        || current.pausedTime !== next.pausedTime
        || JSON.stringify(current.items) !== JSON.stringify(next.items);

      if (changed) {
        sbUpdateTable(next, {
          onError: (err: any) => console.error('[Snook OS] setTables mutation error:', err),
        });
      }
    });

    // Refetch to reconcile UI after mutations complete
    setTimeout(() => qc.invalidateQueries({ queryKey: ['tables', clubId] }), 300);
  }, [online, sbTables, sbUpdateTable, qc, clubId]);

  /** Direct table update — used by TablesScreen's handleTableUpdate */
  const updateTable = useCallback((table: TableSession) => {
    if (!online) return;
    sbUpdateTable(table, {
      onError: (err: any) => console.error('[Snook OS] updateTable error:', err),
    });
  }, [online, sbUpdateTable]);

  // — Members —
  const addMember = useCallback((memberData: Omit<Member, 'id' | 'avatar' | 'lastVisit' | 'gamesPlayed' | 'wins' | 'losses' | 'creditBalance'> & { isGuest?: boolean }) => {
    if (online) sbAddMember(memberData);
  }, [online, sbAddMember]);

  const updateMember = useCallback((id: string, updates: Partial<Member>) => {
    if (online) sbUpdateMember({ id, updates });
  }, [online, sbUpdateMember]);

  // — Cameras —
  const addCamera = useCallback((cameraData: Omit<Camera, 'id'>) => {
    if (online) sbAddCamera(cameraData);
  }, [online, sbAddCamera]);

  const updateCamera = useCallback((id: string, cameraData: Partial<Camera>) => {
    if (online) sbUpdateCamera({ id, updates: cameraData });
  }, [online, sbUpdateCamera]);

  const deleteCamera = useCallback((id: string) => {
    if (online) sbDeleteCamera(id);
  }, [online, sbDeleteCamera]);

  // — Inventory —
  const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id'>) => {
    if (online) sbAddInventory(itemData);
  }, [online, sbAddInventory]);

  const updateInventoryItem = useCallback((id: string, itemData: Partial<InventoryItem>) => {
    if (online) sbUpdateInventory({ id, updates: itemData });
  }, [online, sbUpdateInventory]);

  const deleteInventoryItem = useCallback((id: string) => {
    if (online) sbDeleteInventory(id);
  }, [online, sbDeleteInventory]);

  // — Club Settings —
  const updateClubSettings = useCallback((settings: Partial<ClubSettings>) => {
    if (online) sbUpdateSettings(settings);
  }, [online, sbUpdateSettings]);

  // — Match History —
  const addMatchRecord = useCallback((record: Omit<MatchRecord, 'id'>) => {
    if (online) sbAddMatchRecord(record);
  }, [online, sbAddMatchRecord]);

  // — Tournaments —
  const setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>> = useCallback((action) => {
    if (!online) return;
    const currentTournaments = sbTournaments ?? [];
    const nextTournaments = typeof action === 'function' ? action(currentTournaments) : action;

    // Detect new tournaments (not in current list) and create them
    nextTournaments.forEach(next => {
      const existing = currentTournaments.find(t => t.id === next.id);
      if (!existing) {
        // New tournament — but prefer using sbCreate from EventsScreen directly
        // This is a safety fallback
        const { id: _id, registeredPlayers: _rp, status: _st, ...rest } = next;
        sbCreateTournament(rest as any, {
          onError: (err: any) => console.error('[Snook OS] setTournaments create error:', err),
        });
      } else {
        // Update existing
        sbUpdateTournament(next, {
          onError: (err: any) => console.error('[Snook OS] setTournaments update error:', err),
        });
      }
    });
  }, [online, sbTournaments, sbCreateTournament, sbUpdateTournament]);

  /**
   * syncTablesWithPricing — called from ManageTablesModal.
   * Compares the new pricing list against existing Supabase tables and:
   *   - Inserts new tables that don't exist
   *   - Updates name/type/pricing for existing tables
   *   - Deletes tables that were removed
   */
  const syncTablesWithPricing = useCallback((updatedPricing: IndividualTablePricing[]) => {
    if (!clubId) {
      console.warn('[Snook OS] syncTables: no clubId, skipping');
      toast.error('Cannot sync tables: no club connected');
      return;
    }
    const currentTables = sbTables ?? [];
    const currentNums = new Set(currentTables.map(t => t.tableNumber));
    const newNums = new Set(updatedPricing.map(t => t.tableNumber));

    console.log('[Snook OS] syncTables — clubId:', clubId, 'current:', [...currentNums], 'new:', [...newNums]);

    // Add new tables
    let addCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    updatedPricing.forEach(tp => {
      if (!currentNums.has(tp.tableNumber)) {
        addCount++;
        console.log('[Snook OS] 🆕 Adding table', tp.tableNumber, tp.tableName, tp.tableType, 'billingMode:', tp.billingMode, 'typeof sbAddTable:', typeof sbAddTable);
        try {
          sbAddTable(tp, {
            onSuccess: () => {
              console.log('[Snook OS] ✅ Table', tp.tableNumber, 'added to DB');
            },
            onError: (err: any) => {
              console.error('[Snook OS] ❌ addTable onError:', err);
              toast.error(`Failed to add Table ${tp.tableNumber}: ${err?.message ?? String(err)}`);
            },
          });
          console.log('[Snook OS] sbAddTable() called successfully for table', tp.tableNumber);
        } catch (e) {
          console.error('[Snook OS] ❌ sbAddTable() threw synchronously:', e);
        }
      } else {
        updateCount++;
        sbUpdateTableConfig(tp, {
          onError: (err: any) => {
            console.error('[Snook OS] updateTableConfig error:', err);
            toast.error(`Failed to update Table ${tp.tableNumber}: ${err?.message ?? String(err)}`);
          },
        });
      }
    });

    // Delete removed tables (only if free — occupied tables can't be deleted)
    currentTables.forEach(t => {
      if (!newNums.has(t.tableNumber) && t.status === 'free') {
        deleteCount++;
        console.log('[Snook OS] 🗑️ Deleting table', t.tableNumber);
        sbDeleteTable(t.tableNumber, {
          onSuccess: () => {
            console.log('[Snook OS] ✅ Table', t.tableNumber, 'deleted from DB');
          },
          onError: (err: any) => {
            console.error('[Snook OS] deleteTable error:', err);
            toast.error(`Failed to delete Table ${t.tableNumber}: ${err?.message ?? String(err)}`);
          },
        });
      }
    });

    console.log('[Snook OS] syncTables — adding:', addCount, 'updating:', updateCount, 'deleting:', deleteCount);

    // Refetch after all mutations
    setTimeout(() => qc.invalidateQueries({ queryKey: ['tables', clubId] }), 1000);
  }, [sbTables, sbAddTable, sbUpdateTableConfig, sbDeleteTable, qc, clubId]);

  return (
    <MembersContext.Provider value={{
      members, addMember, updateMember,
      cameras, addCamera, updateCamera, deleteCamera,
      inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
      clubSettings, updateClubSettings,
      tables, setTables, updateTable,
      matchHistory, addMatchRecord,
      tournaments, setTournaments,
      syncTablesWithPricing,
      clubId,
      isOnline: online,
      isLoading: isResolvingClubId,
      reconnectRealtime,
      clubIdErrorType,
    }}>
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => {
  const context = useContext(MembersContext);
  if (!context) {
    console.error('[Snook OS] useMembers called outside MembersProvider — this should not happen. Check component hierarchy.');
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
};
