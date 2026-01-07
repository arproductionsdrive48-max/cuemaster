import { useState, useRef } from 'react';
import { IndividualTablePricing, TableType } from '@/types';
import { X, Plus, Pencil, Trash2, Image, Check, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManageTablesModalProps {
  tables: IndividualTablePricing[];
  onClose: () => void;
  onSave: (tables: IndividualTablePricing[]) => void;
}

interface TableFormData {
  tableNumber: number;
  tableName: string;
  tableType: TableType;
  image?: string;
}

const ManageTablesModal = ({ tables, onClose, onSave }: ManageTablesModalProps) => {
  const [localTables, setLocalTables] = useState<IndividualTablePricing[]>(tables);
  const [editingTable, setEditingTable] = useState<TableFormData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTableNumber, setDeleteTableNumber] = useState<number | null>(null);
  const [newTable, setNewTable] = useState<TableFormData>({
    tableNumber: tables.length + 1,
    tableName: `Table ${String(tables.length + 1).padStart(2, '0')}`,
    tableType: 'Snooker',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTable = () => {
    const tableExists = localTables.some(t => t.tableNumber === newTable.tableNumber);
    if (tableExists) {
      toast.error('Table number already exists');
      return;
    }

    const newTablePricing: IndividualTablePricing = {
      ...newTable,
      useGlobal: true,
    };

    setLocalTables(prev => [...prev, newTablePricing].sort((a, b) => a.tableNumber - b.tableNumber));
    setNewTable({
      tableNumber: localTables.length + 2,
      tableName: `Table ${String(localTables.length + 2).padStart(2, '0')}`,
      tableType: 'Snooker',
    });
    setShowAddForm(false);
    toast.success('Table added!');
  };

  const handleUpdateTable = () => {
    if (!editingTable) return;
    
    setLocalTables(prev => prev.map(t => 
      t.tableNumber === editingTable.tableNumber 
        ? { ...t, ...editingTable }
        : t
    ));
    setEditingTable(null);
    toast.success('Table updated!');
  };

  const handleDeleteTable = () => {
    if (deleteTableNumber === null) return;
    
    setLocalTables(prev => prev.filter(t => t.tableNumber !== deleteTableNumber));
    setDeleteTableNumber(null);
    toast.success('Table deleted');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (isEdit && editingTable) {
          setEditingTable({ ...editingTable, image: result });
        } else {
          setNewTable(prev => ({ ...prev, image: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAll = () => {
    onSave(localTables);
    toast.success('Tables saved successfully!');
    onClose();
  };

  const getTableIcon = (type: TableType) => {
    switch (type) {
      case 'Snooker': return '🎱';
      case 'Pool': return '🟡';
      case '8-Ball': return '⚫';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-background rounded-t-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Table2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Manage Tables</h2>
                <p className="text-sm text-muted-foreground">{localTables.length} tables configured</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-accent/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {/* Add New Table Button */}
          {!showAddForm && !editingTable && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 mb-4 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center gap-2 text-muted-foreground hover:border-[hsl(var(--gold))]/50 hover:text-[hsl(var(--gold))] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add New Table
            </button>
          )}

          {/* Add Table Form */}
          {showAddForm && (
            <div className="mb-4 p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">New Table</h3>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="text-sm text-muted-foreground"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Table Number</label>
                  <input
                    type="number"
                    value={newTable.tableNumber}
                    onChange={(e) => setNewTable(prev => ({ 
                      ...prev, 
                      tableNumber: Number(e.target.value),
                      tableName: `Table ${String(Number(e.target.value)).padStart(2, '0')}`
                    }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <select
                    value={newTable.tableType}
                    onChange={(e) => setNewTable(prev => ({ ...prev, tableType: e.target.value as TableType }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm appearance-none"
                  >
                    <option value="Snooker">Snooker</option>
                    <option value="Pool">Pool</option>
                    <option value="8-Ball">8-Ball</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Table Name</label>
                <input
                  type="text"
                  value={newTable.tableName}
                  onChange={(e) => setNewTable(prev => ({ ...prev, tableName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Table Image (Optional)</label>
                <div className="flex items-center gap-3">
                  {newTable.image ? (
                    <div className="w-16 h-12 rounded-lg overflow-hidden">
                      <img src={newTable.image} alt="Table" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="hidden"
                    id="new-table-image"
                  />
                  <label
                    htmlFor="new-table-image"
                    className="px-3 py-2 rounded-lg bg-secondary text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
                  >
                    Upload Image
                  </label>
                </div>
              </div>

              <button
                onClick={handleAddTable}
                className="w-full py-2.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Table
              </button>
            </div>
          )}

          {/* Edit Table Form */}
          {editingTable && (
            <div className="mb-4 p-4 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[hsl(var(--gold))]">Edit Table {editingTable.tableNumber}</h3>
                <button 
                  onClick={() => setEditingTable(null)}
                  className="text-sm text-muted-foreground"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Table Name</label>
                  <input
                    type="text"
                    value={editingTable.tableName}
                    onChange={(e) => setEditingTable(prev => prev ? { ...prev, tableName: e.target.value } : null)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <select
                    value={editingTable.tableType}
                    onChange={(e) => setEditingTable(prev => prev ? { ...prev, tableType: e.target.value as TableType } : null)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm appearance-none"
                  >
                    <option value="Snooker">Snooker</option>
                    <option value="Pool">Pool</option>
                    <option value="8-Ball">8-Ball</option>
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Table Image</label>
                <div className="flex items-center gap-3">
                  {editingTable.image ? (
                    <div className="w-16 h-12 rounded-lg overflow-hidden">
                      <img src={editingTable.image} alt="Table" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                    id="edit-table-image"
                  />
                  <label
                    htmlFor="edit-table-image"
                    className="px-3 py-2 rounded-lg bg-secondary text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
                  >
                    Change Image
                  </label>
                </div>
              </div>

              <button
                onClick={handleUpdateTable}
                className="w-full py-2.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}

          {/* Tables List */}
          <div className="space-y-2">
            {localTables.map(table => (
              <div 
                key={table.tableNumber}
                className="p-3 rounded-xl bg-secondary/30 flex items-center gap-3"
              >
                {/* Table Thumbnail */}
                {table.image ? (
                  <div className="w-14 h-10 rounded-lg overflow-hidden">
                    <img src={table.image} alt={table.tableName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={cn(
                    "w-14 h-10 rounded-lg flex items-center justify-center text-lg",
                    table.tableType === 'Snooker' ? 'bg-emerald-500/20' :
                    table.tableType === 'Pool' ? 'bg-blue-500/20' :
                    'bg-purple-500/20'
                  )}>
                    {getTableIcon(table.tableType)}
                  </div>
                )}

                <div className="flex-1">
                  <p className="font-medium text-sm">{table.tableName}</p>
                  <p className="text-xs text-muted-foreground">{table.tableType}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTable({
                      tableNumber: table.tableNumber,
                      tableName: table.tableName,
                      tableType: table.tableType,
                      image: table.image,
                    })}
                    className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteTableNumber(table.tableNumber)}
                    className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border/50 p-4">
          <button
            onClick={handleSaveAll}
            className="w-full py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
          >
            <Check className="w-5 h-5" />
            Save All Tables
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTableNumber !== null} onOpenChange={() => setDeleteTableNumber(null)}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove Table {deleteTableNumber} from your club. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageTablesModal;
