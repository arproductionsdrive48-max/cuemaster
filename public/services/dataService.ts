/**
 * Data Service Layer
 * 
 * This module abstracts data operations. Currently uses local state (MembersContext).
 * When Supabase is connected, swap implementations to use supabase client.
 * 
 * Each function follows the pattern:
 *   - Check if supabase is connected
 *   - If yes: use supabase queries
 *   - If no: fall back to local state (current behavior)
 */

import { supabase, isSupabaseConnected } from '@/lib/supabase';
import type { Member, TableSession, MatchRecord, Tournament, InventoryItem, Camera, Booking } from '@/types';

// ============ Members ============
export const fetchMembers = async (clubId?: string): Promise<Member[] | null> => {
  if (!isSupabaseConnected() || !supabase) return null; // fallback to context
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('club_id', clubId)
    .order('name');
  if (error) throw error;
  return data?.map(mapDbMember) || [];
};

export const createMember = async (member: Partial<Member>, clubId: string) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { data, error } = await supabase
    .from('members')
    .insert({ ...mapMemberToDb(member), club_id: clubId })
    .select()
    .single();
  if (error) throw error;
  return mapDbMember(data);
};

export const updateMemberById = async (id: string, updates: Partial<Member>) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { error } = await supabase
    .from('members')
    .update(mapMemberToDb(updates))
    .eq('id', id);
  if (error) throw error;
};

// ============ Tables (Realtime) ============
export const subscribeToTables = (clubId: string, callback: (tables: any[]) => void) => {
  if (!isSupabaseConnected() || !supabase) return null;
  return supabase
    .channel('tables-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `club_id=eq.${clubId}` }, () => {
      // Re-fetch on any change
      supabase.from('tables').select('*').eq('club_id', clubId).order('table_number').then(({ data }) => {
        if (data) callback(data);
      });
    })
    .subscribe();
};

// ============ Match History ============
export const fetchMatchHistory = async (clubId: string) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { data, error } = await supabase
    .from('match_history')
    .select('*')
    .eq('club_id', clubId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
};

export const createMatchRecord = async (record: any, clubId: string) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { error } = await supabase
    .from('match_history')
    .insert({ ...record, club_id: clubId });
  if (error) throw error;
};

// ============ Club Settings ============
export const fetchClubSettings = async (clubId: string) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single();
  if (error) throw error;
  return data;
};

export const updateClubSettingsDb = async (clubId: string, settings: any) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { error } = await supabase
    .from('clubs')
    .update({ settings })
    .eq('id', clubId);
  if (error) throw error;
};

// ============ Auth ============
export const signIn = async (email: string, password: string) => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!isSupabaseConnected() || !supabase) return null;
  await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  if (!isSupabaseConnected() || !supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

// ============ GST Calculation ============
export const calculateGST = (amount: number, gstRate: number = 18): { base: number; gst: number; total: number } => {
  const gst = (amount * gstRate) / 100;
  return { base: amount, gst: Math.round(gst * 100) / 100, total: Math.round((amount + gst) * 100) / 100 };
};

// ============ Mappers ============
const mapDbMember = (row: any): Member => ({
  id: row.id,
  name: row.name,
  avatar: row.avatar || '',
  membershipType: row.membership_type || 'Regular',
  creditBalance: Number(row.credit_balance) || 0,
  lastVisit: new Date(row.last_visit),
  gamesPlayed: row.games_played || 0,
  wins: row.wins || 0,
  losses: row.losses || 0,
  phone: row.phone || '',
  email: row.email || '',
  isGuest: row.is_guest || false,
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
  return mapped;
};
