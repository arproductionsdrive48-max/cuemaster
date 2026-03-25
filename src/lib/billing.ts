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

  let finalBill = 0;
  let totalMinutes = 0;
  const start = table.startTime.getTime();
  const pausedMs = table.pausedTime || 0;

  if (table.billingMode === 'per_frame') {
    finalBill = table.frameCount * pricing.perFrame + itemsTotal;
  } else {
    const elapsed = table.status === 'paused'
      ? Math.max(0, now - start - pausedMs)  // frozen at pause point
      : Math.max(0, now - start - pausedMs);
    totalMinutes = elapsed / 60000;

    if (table.billingMode === 'per_minute') {
      finalBill = Math.floor(totalMinutes) * pricing.perMinute + itemsTotal;
    } else {
      const hours = totalMinutes / 60;
      finalBill = Math.round(hours * pricing.perHour) + itemsTotal;
    }
  }

  // --- DEBUG LOGGING ---
  console.log(`[Billing Debug] Table ${table.tableNumber} | Mode: ${table.billingMode}`);
  console.log(`  - Start Time: ${table.startTime?.toISOString()}`);
  console.log(`  - End Time (Now): ${new Date(now).toISOString()}`);
  console.log(`  - Elapsed: ${totalMinutes.toFixed(2)} mins`);
  console.log(`  - Paused Time: ${(pausedMs / 60000).toFixed(2)} mins`);
  console.log(`  - Items array:`, table.items);
  console.log(`  - Items Total: ₹${itemsTotal}`);
  console.log(`  - Rate: ${table.billingMode === 'per_frame' ? pricing.perFrame + ' per frame' : table.billingMode === 'per_minute' ? pricing.perMinute + ' per min' : pricing.perHour + ' per hour'}`);
  console.log(`  ----- Final Calculated Total: ₹${finalBill} -----`);

  return finalBill;
};

export const generateReceiptText = (
  clubName: string,
  tableNumber: number,
  tableType: string,
  startTime: Date | null,
  endTime: Date | null,
  durationMs: number,
  totalBill: number,
  paymentMethod: string,
  items: OrderItem[] = []
): string => {
  const startTimeStr = startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
  const endTimeStr = endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
  
  const durationMins = Math.round(durationMs / 60000);
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  
  const totalItemsAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tableCharge = totalBill - totalItemsAmount;

  let receipt = `*${clubName || 'Snook OS'} Receipt*\n`;
  receipt += `Table ${tableNumber} - ${tableType}\n`;
  receipt += `Started: ${startTimeStr} | Ended: ${endTimeStr}\n`;
  receipt += `Time: ${durationStr} | Charge: ₹${Math.max(0, tableCharge)}\n`;
  
  if (items.length > 0) {
    receipt += `Items:\n`;
    items.forEach(item => {
      receipt += `- ${item.name} (x${item.quantity}): ₹${item.price * item.quantity}\n`;
    });
  }
  
  receipt += `\n*Grand Total: ₹${totalBill}*\n`;
  if (paymentMethod) {
    receipt += `Payment: ${paymentMethod.toUpperCase()}\n`;
  }
  receipt += `Thank you! Come again!`;
  
  return receipt;
};
