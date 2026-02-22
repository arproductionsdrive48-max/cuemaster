/**
 * LiveBillDisplay — renders a live-updating bill amount for an active table.
 * Re-renders every second for per_minute/hourly modes.
 */
import { useState, useEffect } from 'react';
import { TableSession } from '@/types';
import { calculateLiveBill } from '@/lib/billing';
import { useMembers } from '@/contexts/MembersContext';

interface LiveBillDisplayProps {
  table: TableSession;
}

const LiveBillDisplay = ({ table }: LiveBillDisplayProps) => {
  const { clubSettings } = useMembers();
  const [bill, setBill] = useState(0);

  const pricing = {
    perHour: clubSettings.tablePricing.perHour,
    perMinute: clubSettings.tablePricing.perMinute,
    perFrame: clubSettings.tablePricing.perFrame,
  };

  useEffect(() => {
    if (table.status === 'free') return;

    const update = () => setBill(calculateLiveBill(table, pricing));
    update();

    // For frame-based billing, no need to tick
    if (table.billingMode === 'per_frame') return;
    if (table.status === 'paused') return;

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [table.startTime, table.status, table.pausedTime, table.billingMode, table.frameCount, table.items, pricing.perHour, pricing.perMinute, pricing.perFrame]);

  if (table.status === 'free') return null;

  return (
    <span className="font-semibold text-[hsl(var(--gold))]">
      ₹{bill > 0 ? bill.toLocaleString() : table.totalBill.toLocaleString()}
    </span>
  );
};

export default LiveBillDisplay;
