/**
 * Live billing calculator for active table sessions.
 * Computes the current bill based on elapsed time, billing mode, and items.
 */

import type { TableSession, OrderItem } from '@/types';

interface PricingConfig {
  perHour: number;
  perMinute: number;
  perFrame: number;
}

/**
 * Calculate the live bill for an active session.
 * For per_minute: Math.floor(totalMinutes) * rate + items total
 * For hourly: Math.floor(totalMinutes) / 60 * rate + items total  
 * For per_frame: frameCount * rate + items total
 */
export const calculateLiveBill = (
  table: TableSession,
  pricing: PricingConfig,
  now: number = Date.now()
): number => {
  if (table.status === 'free' || !table.startTime) return 0;

  const itemsTotal = (table.items || []).reduce(
    (sum: number, item: OrderItem) => sum + item.price * item.quantity,
    0
  );

  if (table.billingMode === 'per_frame') {
    return table.frameCount * pricing.perFrame + itemsTotal;
  }

  const start = table.startTime.getTime();
  const pausedMs = table.pausedTime || 0;
  const elapsed = table.status === 'paused'
    ? Math.max(0, now - start - pausedMs)  // frozen at pause point
    : Math.max(0, now - start - pausedMs);
  const totalMinutes = elapsed / 60000;

  if (table.billingMode === 'per_minute') {
    return Math.floor(totalMinutes) * pricing.perMinute + itemsTotal;
  }

  // hourly
  const hours = totalMinutes / 60;
  return Math.round(hours * pricing.perHour) + itemsTotal;
};
