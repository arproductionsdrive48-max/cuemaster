import { useState, useMemo } from 'react';
import { TableSession, BillingMode } from '@/types';
import { initialTables } from '@/data/mockData';
import Header from '@/components/layout/Header';
import TableCard from '@/components/tables/TableCard';
import TableDetailModal from '@/components/tables/TableDetailModal';
import PaymentModal from '@/components/tables/PaymentModal';
import StartSessionModal from '@/components/tables/StartSessionModal';
import { useMembers } from '@/contexts/MembersContext';
import { Plus, Store } from 'lucide-react';
import { toast } from 'sonner';

const TablesScreen = () => {
  const [tables, setTables] = useState<TableSession[]>(initialTables);
  const [selectedTable, setSelectedTable] = useState<TableSession | null>(null);
  const [paymentTable, setPaymentTable] = useState<TableSession | null>(null);
  const [startSessionTable, setStartSessionTable] = useState<TableSession | null>(null);
  const { clubSettings } = useMembers();

  const handleTableUpdate = (updated: TableSession) => {
    setTables(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTable(updated);
  };

  const handleEndSession = (table: TableSession) => {
    setSelectedTable(null);
    setPaymentTable(table);
  };

  const handlePaymentConfirm = () => {
    if (paymentTable) {
      setTables(prev => prev.map(t =>
        t.id === paymentTable.id
          ? { ...t, status: 'free' as const, players: [], startTime: null, pausedTime: 0, items: [], totalBill: 0, frameCount: 0 }
          : t
      ));
      setPaymentTable(null);
    }
  };

  const handleStartNewSession = () => {
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
    if (!clubSettings.isOpen && table.status === 'free') {
      toast.error('Club is currently closed. Cannot start new sessions.');
      return;
    }
    
    // If table is free, show start session modal
    if (table.status === 'free') {
      setStartSessionTable(table);
    } else {
      // If occupied/paused, show detail modal
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
    };
    setTables(prev => prev.map(t => t.id === table.id ? updatedTable : t));
    setStartSessionTable(null);
    setSelectedTable(updatedTable);
    toast.success(`Session started on Table ${table.tableNumber} (${billingMode.replace('_', ' ')} mode)`);
  };

  const getTableConfig = (tableNumber: number) => {
    return clubSettings.individualTablePricing?.find(t => t.tableNumber === tableNumber);
  };

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const freeCount = tables.filter(t => t.status === 'free').length;

  return (
    <div className="min-h-screen pb-24">
      <Header title="CueMaster" showClubStatus />

      {/* Club Closed Banner */}
      {!clubSettings.isOpen && (
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

      {/* Tables Grid */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-3 stagger-children">
          {tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => handleTableClick(table)}
              disabled={!clubSettings.isOpen && table.status === 'free'}
            />
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={handleStartNewSession}
        className={`fab bottom-24 right-4 ${!clubSettings.isOpen ? 'opacity-50' : ''}`}
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
    </div>
  );
};

export default TablesScreen;
