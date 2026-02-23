/**
 * AuthContext — robust Supabase auth session management.
 *
 * Key principles (per Supabase docs):
 *  1. Set up onAuthStateChange BEFORE calling getSession()
 *  2. Show loading spinner until session is resolved
 *  3. Handle SIGNED_OUT → redirect to login
 *  4. Handle TOKEN_REFRESHED → update session silently
 *  5. Invalidate all queries on sign-out to clear cached data
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConnected } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  session: Session | null;
  isAuthenticated: boolean;
  /** true while we're restoring the session on first load */
  isRestoring: boolean;
  /** Sign out and clear all cached data */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(isSupabaseConnected());

  useEffect(() => {
    if (!isSupabaseConnected() || !supabase) {
      setIsRestoring(false);
      return;
    }

    const sb = supabase!;

    // 1. Set up listener FIRST (per Supabase docs — prevents missing events)
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] onAuthStateChange:', event, newSession?.user?.id ?? 'no user');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(newSession);
        setIsRestoring(false);
        // Re-trigger club_id resolution now that we have a session
        qc.invalidateQueries({ queryKey: ['club-id'] });
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsRestoring(false);
        // Clear all cached data on sign-out
        qc.clear();
      }
    });

    // 2. Then call getSession() to restore existing session
    sb.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      console.log('[Auth] getSession result:', existingSession ? 'Session found' : 'No session');
      if (error) {
        console.error('[Auth] getSession error:', error.message);
      }
      if (existingSession) {
        console.log('[Auth] User ID:', existingSession.user.id, 'Email:', existingSession.user.email);
        setSession(existingSession);
      } else {
        console.log('[Auth] No existing session — redirecting to login');
      }
      setIsRestoring(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [qc]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    qc.clear();
  }, [qc]);

  return (
    <AuthContext.Provider value={{
      session,
      isAuthenticated: !!session,
      isRestoring,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
