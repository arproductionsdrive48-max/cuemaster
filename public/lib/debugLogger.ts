/**
 * Debug Logger — toggle-able verbose logging for Snook OS.
 *
 * Usage:
 *   import { debugLog, isDebugEnabled, setDebugEnabled } from '@/lib/debugLogger';
 *   debugLog('label', 'message', { data });
 *
 * Persisted to localStorage so it survives page refreshes.
 */

const STORAGE_KEY = 'snook_os_debug_logs';

export const isDebugEnabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setDebugEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch { /* ignore */ }
};

/**
 * Log only when debug mode is enabled.
 * Always-on logs (errors, critical) should use console.error/warn directly.
 */
export const debugLog = (label: string, ...args: unknown[]) => {
  if (isDebugEnabled()) {
    console.log(`[Snook OS:${label}]`, ...args);
  }
};
