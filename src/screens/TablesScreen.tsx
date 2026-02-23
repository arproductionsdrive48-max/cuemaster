import { useState } from 'react';
import { TableSession, BillingMode } from '@/types';
import Header from '@/components/layout/Header';
import TableCard from '@/components/tables/TableCard';
import TableDetailModal from '@/components/tables/TableDetailModal';
import PaymentModal from '@/components/tables/PaymentModal';
import StartSessionModal from '@/components/tables/StartSessionModal';
import MatchHistoryModal from '@/components/tables/MatchHistoryModal';
import WinnerSelectionModal from '@/components/tables/WinnerSelectionModal';
import { useMembers } from '@/contexts/MembersContext';
import { Plus, Store, History, Table2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TablesScreen = () => {
  const { tables, updateTable, clubSettings, addMatchRecord, updateMember, members, isOnline } = useMembers();
  const [selectedTable, setSelectedTable] = useState<TableSession | null>(null);
  const [paymentTable, setPaymentTable] = useState<TableSession | null>(null);
  const [winnerTable, setWinnerTable] = useState<TableSession | null>(null);
  const [startSessionTable, setStartSessionTable] = useState<TableSession | null>(null);
  const [showMatchHistory, setShowMatchHistory] = useState(false);

  const handleTableUpdate = (updated: TableSession) => {
    // Persist the update to Supabase immediately
    updateTable(updated);
    setSelectedTable(updated);
  };

  const handleEndSession = (table: TableSession) => {
    setSelectedTable(null);
    setWinnerTable(table);
  };

  const handleWinnerConfirm = (winnersMap: Record<string, 'win' | 'loss' | 'draw'>) => {
    if (!winnerTable) return;
    winnerTable.players.forEach(playerName => {
      const member = members.find(m => m.name === playerName);
      if (member) {
        const result = winnersMap[playerName];
        updateMember(member.id, {
          wins: result === 'win' ? member.wins + 1 : member.wins,
          losses: result === 'loss' ? member.losses + 1 : member.losses,
          gamesPlayed: member.gamesPlayed + 1,
          lastVisit: new Date(),
        });
      }
    });
    const tableWithWinners: TableSession & { _winnersMap?: Record<string, 'win' | 'loss' | 'draw'> } = {
      ...winnerTable,
      // @ts-ignore
      _winnersMap: winnersMap,
    };
    setWinnerTable(null);
    setPaymentTable(tableWithWinners);
  };

  const handlePaymentConfirm = (paymentInfo?: { paymentMethod: string; splitCount: number; qrUsed: boolean }) => {
    if (paymentTable) {
      // @ts-ignore
      const winnersMap: Record<string, 'win' | 'loss' | 'draw'> = paymentTable._winnersMap ?? {};
      const gstAmount: number = (paymentTable as any)._gstAmount ?? 0;
      const sessionEndTime = new Date();
      addMatchRecord({
        tableNumber: paymentTable.tableNumber,
        players: paymentTable.players.map(name => ({
          name,
          result: winnersMap[name] ?? 'draw',
        })),
        date: sessionEndTime,
        sessionStartTime: paymentTable.startTime ?? undefined,
        sessionEndTime,
        duration: paymentTable.startTime ? Date.now() - paymentTable.startTime.getTime() - paymentTable.pausedTime : 0,
        billingMode: paymentTable.billingMode,
        totalBill: paymentTable.totalBill,
        gstAmount,
        items: paymentTable.items.length > 0 ? paymentTable.items : undefined,
        ...(paymentInfo && {
          paymentMethod: paymentInfo.paymentMethod,
          splitCount: paymentInfo.splitCount,
          qrUsed: paymentInfo.qrUsed,
        }),
      } as any);
      // Reset table to free state in Supabase (clears active session)
      const clearedTable: TableSession = {
        ...paymentTable,
        status: 'free' as const,
        players: [],
        startTime: null,
        pausedTime: 0,
        items: [],
        totalBill: 0,
        frameCount: 0,
      };
      updateTable(clearedTable);
      setPaymentTable(null);
    }
  };

  const handleStartNewSession = () => {
    if (!isOnline) {
      toast.error('Offline – changes will not save');
      return;
    }
    if (!clubSettings.isOpen) {
      toast.error('Club is currently closed. Cannot start new sessions.');
      return;
    }
    const freeTable = tables.find(t => t.status === 'free');
    if (freeTable) {
      setStartSessionTable(freeTable);
    } else {
      toast.error('No free tables available.');
    }
  };

  const handleTableClick = (table: TableSession) => {
    if (!isOnline) {
      toast.error('Offline – changes will not save');
      return;
    }
    if (!clubSettings.isOpen && table.status === 'free') {
      toast.error('Club is currently closed. Cannot start new sessions.');
      return;
    }
    if (table.status === 'free') {
      setStartSessionTable(table);
    } else {
      setSelectedTable(table);
    }
  };

  const handleStartSession = (table: TableSession, billingMode: BillingMode) => {
    const updatedTable: TableSession = {
      ...table,
      status: 'occupied',
      startTime: new Date(),
      billingMode,
      frameCount: 0,
      players: table.players,
    };
    // Persist to Supabase (creates session row + updates table status)
    updateTable(updatedTable);
    setStartSessionTable(null);
    setSelectedTable(updatedTable);
    toast.success(`Session started on Table ${table.tableNumber} (${billingMode.replace('_', ' ')} mode)`);
  };

  const getTableConfig = (tableNumber: number) => {
    // Derive from live Supabase tables data
    const dbTable = tables.find(t => t.tableNumber === tableNumber);
    return dbTable ? {
      tableNumber: dbTable.tableNumber,
      tableName: `Table ${String(dbTable.tableNumber).padStart(2, '0')}`,
      tableType: 'Snooker' as const,
      useGlobal: true,
      billingMode: dbTable.billingMode,
    } : undefined;
  };

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const freeCount = tables.filter(t => t.status === 'free').length;

  return (
    <div className="min-h-screen pb-24">
      <Header title="Snook OS" showClubStatus />

      {!isOnline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm font-medium text-destructive">Offline – table data unavailable</p>
        </div>
      )}

      {isOnline && !clubSettings.isOpen && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-primary/20 border border-primary/30 flex items-center gap-3">
          <Store className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-primary">Club is Closed</p>
            <p className="text-xs text-muted-foreground">New sessions cannot be started</p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="px-4 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 glass-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{occupiedCount}</p>
            <p className="text-xs text-muted-foreground">Occupied</p>
          </div>
          <div className="flex-1 glass-card p-3 text-center">
            <p className="text-2xl font-bold text-available">{freeCount}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div className="flex-1 glass-card p-3 text-center">
            <p className="text-2xl font-bold">{tables.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* History Button */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowMatchHistory(true)}
          className="w-full glass-card p-3 flex items-center justify-center gap-2 hover:bg-accent/30 transition-all"
        >
          <History className="w-5 h-5 text-[hsl(var(--gold))]" />
          <span className="font-medium text-sm">Match History</span>
        </button>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="px-4">
          <div className="glass-card p-10 text-center space-y-3">
            <Table2 className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="font-semibold text-muted-foreground">No active tables</p>
            <p className="text-xs text-muted-foreground">
              {isOnline ? 'Configure tables in Settings → Manage Tables' : 'Connect to Supabase to view tables'}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3 stagger-children">
            {tables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => handleTableClick(table)}
                disabled={(!clubSettings.isOpen && table.status === 'free') || !isOnline}
              />
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleStartNewSession}
        title={!isOnline ? 'Offline – changes will not save' : 'Start new session'}
        className={cn(`fab bottom-24 right-4`, (!clubSettings.isOpen || !isOnline) ? 'opacity-50' : '')}
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* Modals */}
      {selectedTable && (
        <TableDetailModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onUpdate={handleTableUpdate}
          onEndSession={handleEndSession}
        />
      )}

      {winnerTable && (
        <WinnerSelectionModal
          table={winnerTable}
          onClose={() => setWinnerTable(null)}
          onConfirm={handleWinnerConfirm}
          onAddPlayer={() => {
            setSelectedTable(winnerTable);
            setWinnerTable(null);
          }}
        />
      )}

      {paymentTable && (
        <PaymentModal
          table={paymentTable}
          onClose={() => setPaymentTable(null)}
          onConfirm={handlePaymentConfirm}
        />
      )}

      {startSessionTable && (
        <StartSessionModal
          tableNumber={startSessionTable.tableNumber}
          tableType={getTableConfig(startSessionTable.tableNumber)?.tableType || 'Snooker'}
          defaultBillingMode={clubSettings.tablePricing.defaultBillingMode}
          tablePricing={clubSettings.tablePricing}
          tableConfig={getTableConfig(startSessionTable.tableNumber)}
          onClose={() => setStartSessionTable(null)}
          onStart={(billingMode) => handleStartSession(startSessionTable, billingMode)}
        />
      )}

      {showMatchHistory && (
        <MatchHistoryModal onClose={() => setShowMatchHistory(false)} />
      )}
    </div>
  );
};

export default TablesScreen;
