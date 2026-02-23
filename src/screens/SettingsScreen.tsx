import { useState, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import CameraSetupModal from '@/components/settings/CameraSetupModal';
import InventoryModal from '@/components/settings/InventoryModal';
import ManageTablesModal from '@/components/settings/ManageTablesModal';
import PrivacyScreen from '@/screens/PrivacyScreen';
import HelpScreen from '@/screens/HelpScreen';
import { useMembers } from '@/contexts/MembersContext';
import { Camera as CameraType, InventoryItem, IndividualTablePricing, BillingMode, TableType } from '@/types';
import {
  QrCode, Moon, Sun, Wifi, WifiOff, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Upload, Camera, Plus, Pencil, Trash2, Store, Check, Circle,
  MessageSquare, Package, Image, IndianRupee, Clock, Zap, Globe,
  ToggleLeft, ToggleRight, Table2, ChevronDown, Receipt } from
'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from
"@/components/ui/alert-dialog";

type SettingsView = 'main' | 'privacy' | 'help';

const SettingsScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [isOffline, setIsOffline] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraType | undefined>();
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | undefined>();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [customTemplate, setCustomTemplate] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [showInventoryList, setShowInventoryList] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [uploadedQrPreview, setUploadedQrPreview] = useState<string | null>(null);
  const [showManageTables, setShowManageTables] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    cameras, addCamera, updateCamera, deleteCamera,
    inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    clubSettings, updateClubSettings,
    tables: dbTables,
    syncTablesWithPricing,
  } = useMembers();

  // Derive IndividualTablePricing[] from live Supabase tables — use actual DB values
  const derivedIndividualPricing: IndividualTablePricing[] = dbTables.map(t => ({
    tableNumber: t.tableNumber,
    tableName: t.tableName || `Table ${String(t.tableNumber).padStart(2, '0')}`,
    tableType: (t.tableType as TableType) || 'Snooker',
    useGlobal: true,
    billingMode: t.billingMode,
  }));

  // Local pricing state
  const [pricing, setPricing] = useState(clubSettings.tablePricing);
  const [individualPricing, setIndividualPricing] = useState<IndividualTablePricing[]>(derivedIndividualPricing);

  // Keep individualPricing in sync when dbTables changes (after mutations / realtime)
  useEffect(() => {
    const fresh: IndividualTablePricing[] = dbTables.map(t => ({
      tableNumber: t.tableNumber,
      tableName: t.tableName || `Table ${String(t.tableNumber).padStart(2, '0')}`,
      tableType: (t.tableType as TableType) || 'Snooker',
      useGlobal: true,
      billingMode: t.billingMode,
    }));
    setIndividualPricing(fresh);
  }, [dbTables]);
  const [expandedTable, setExpandedTable] = useState<number | null>(null);

  const handleAddCamera = (cameraData: Omit<CameraType, 'id'>) => {
    addCamera(cameraData);
  };

  const handleEditCamera = (camera: CameraType) => {
    setEditingCamera(camera);
    setShowCameraModal(true);
  };

  const handleSaveCamera = (cameraData: Omit<CameraType, 'id'>) => {
    if (editingCamera) {
      updateCamera(editingCamera.id, cameraData);
    } else {
      addCamera(cameraData);
    }
    setEditingCamera(undefined);
  };

  const handleCloseModal = () => {
    setShowCameraModal(false);
    setEditingCamera(undefined);
  };

  const handleQrUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedQrPreview(result);
        updateClubSettings({ upiQrCode: result });
        toast.success('QR Code saved successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    if (editingInventoryItem) {
      updateInventoryItem(editingInventoryItem.id, item);
    } else {
      addInventoryItem(item);
    }
    setEditingInventoryItem(undefined);
    setShowInventoryModal(false);
  };

  const handleSaveTemplate = () => {
    if (customTemplate.trim()) {
      updateClubSettings({ reminderTemplate: customTemplate });
      toast.success('Template saved!');
    }
    setIsEditingTemplate(false);
  };

  const handleSavePricing = () => {
    updateClubSettings({ tablePricing: pricing, individualTablePricing: individualPricing });
    syncTablesWithPricing(individualPricing);
    toast.success('All pricing saved!');
  };

  const handleToggleTableGlobal = (tableNumber: number) => {
    setIndividualPricing((prev) => prev.map((t) =>
    t.tableNumber === tableNumber ?
    {
      ...t,
      useGlobal: !t.useGlobal,
      customPricing: !t.useGlobal ? undefined : { perHour: pricing.perHour, perMinute: pricing.perMinute, perFrame: pricing.perFrame }
    } :
    t
    ));
  };

  const handleUpdateTablePricing = (tableNumber: number, field: string, value: number) => {
    setIndividualPricing((prev) => prev.map((t) =>
    t.tableNumber === tableNumber ?
    {
      ...t,
      customPricing: {
        ...(t.customPricing || { perHour: pricing.perHour, perMinute: pricing.perMinute, perFrame: pricing.perFrame }),
        [field]: value
      }
    } :
    t
    ));
  };

  const handleUpdateTableBillingMode = (tableNumber: number, billingMode: BillingMode) => {
    setIndividualPricing((prev) => prev.map((t) =>
    t.tableNumber === tableNumber ?
    { ...t, billingMode } :
    t
    ));
  };

  const handleDeleteInventoryItem = () => {
    if (deleteItemId) {
      deleteInventoryItem(deleteItemId);
      toast.success('Item deleted');
      setDeleteItemId(null);
    }
  };

  if (currentView === 'privacy') {
    return <PrivacyScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'help') {
    return <HelpScreen onBack={() => setCurrentView('main')} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <Header title="Settings" />

      {/* Offline Banner */}
      {isOffline &&
      <div className="mx-4 mb-4 p-3 rounded-2xl bg-paused/20 border border-paused/30 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-paused" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Offline Mode Active</p>
            <p className="text-xs text-muted-foreground">Data will sync when online</p>
          </div>
        </div>
      }

      {/* Settings Sections */}
      <div className="px-4 space-y-6">
        {/* Club Status */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Club Status</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => updateClubSettings({ isOpen: !clubSettings.isOpen })}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                clubSettings.isOpen ? "bg-available/20" : "bg-primary/20"
              )}>
                <Store className={cn(
                  "w-5 h-5",
                  clubSettings.isOpen ? "text-available" : "text-primary"
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Club Status</p>
                <p className={cn(
                  "text-sm font-medium",
                  clubSettings.isOpen ? "text-available" : "text-primary"
                )}>
                  {clubSettings.isOpen ? 'Open for Business' : 'Currently Closed'}
                </p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                clubSettings.isOpen ? 'bg-available' : 'bg-primary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  clubSettings.isOpen && 'translate-x-5'
                )} />
              </div>
            </button>
          </div>
        </div>

        {/* Club Identity */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Club Identity</h3>
          <div className="glass-card overflow-hidden">
            {/* Club Logo Only */}
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden">
                  {clubSettings.clubLogo ?
                  <img src={clubSettings.clubLogo} alt="Club logo" className="w-full h-full object-cover" /> :
                  <Image className="w-6 h-6 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Club Logo</p>
                  <p className="text-sm text-muted-foreground">
                    {clubSettings.clubLogo ? 'Logo uploaded' : 'No logo set'}
                  </p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        updateClubSettings({ clubLogo: ev.target?.result as string });
                        toast.success('Logo updated!');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden" />

                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm font-medium flex items-center gap-2 hover:bg-secondary transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* GST Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tax Settings</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => updateClubSettings({ gstEnabled: !clubSettings.gstEnabled })}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                clubSettings.gstEnabled ? "bg-available/20" : "bg-secondary"
              )}>
                <Receipt className={cn(
                  "w-5 h-5",
                  clubSettings.gstEnabled ? "text-available" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">GST on Bills</p>
                <p className="text-sm text-muted-foreground">
                  {clubSettings.gstEnabled ? `${clubSettings.gstRate}% GST applied to all items` : 'No GST on bills'}
                </p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                clubSettings.gstEnabled ? 'bg-available' : 'bg-secondary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  clubSettings.gstEnabled && 'translate-x-5'
                )} />
              </div>
            </button>

            {clubSettings.gstEnabled &&
            <div className="p-4">
                <label className="text-xs text-muted-foreground mb-2 block">GST Rate (%)</label>
                <div className="flex gap-2">
                  {[5, 12, 18, 28].map((rate) =>
                <button
                  key={rate}
                  onClick={() => {
                    updateClubSettings({ gstRate: rate });
                    toast.success(`GST rate set to ${rate}%`);
                  }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                    clubSettings.gstRate === rate ?
                    "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]" :
                    "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}>

                      {rate}%
                    </button>
                )}
                </div>
              </div>
            }
          </div>
        </div>


        {/* Membership Badge Toggle */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Player Settings</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => updateClubSettings({ showMembershipBadge: !clubSettings.showMembershipBadge })}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                clubSettings.showMembershipBadge ? "bg-[hsl(var(--gold))]/20" : "bg-secondary"
              )}>
                {clubSettings.showMembershipBadge ?
                <ToggleRight className="w-5 h-5 text-[hsl(var(--gold))]" /> :

                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Membership Badges</p>
                <p className="text-sm text-muted-foreground">
                  {clubSettings.showMembershipBadge ? 'Showing Gold/Silver/Bronze badges' : 'Badges hidden on player cards'}
                </p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                clubSettings.showMembershipBadge ? 'bg-[hsl(var(--gold))]' : 'bg-secondary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  clubSettings.showMembershipBadge && 'translate-x-5'
                )} />
              </div>
            </button>
          </div>
        </div>

        {/* Table Rates & Pricing */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Table Rates & Pricing</h3>
          
          {/* Global Default Rates Card */}
          <div className="glass-card overflow-hidden p-4 space-y-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-[hsl(var(--gold))]" />
              </div>
              <span className="font-semibold">Global Default Rates</span>
            </div>
            
            {/* General Rates */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">₹ Per Hour</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                  <input
                    type="number"
                    value={pricing.perHour}
                    onChange={(e) => setPricing({ ...pricing, perHour: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium" />

                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">₹ Per Minute</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                  <input
                    type="number"
                    value={pricing.perMinute}
                    onChange={(e) => setPricing({ ...pricing, perMinute: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium" />

                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">₹ Per Frame</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                  <input
                    type="number"
                    value={pricing.perFrame}
                    onChange={(e) => setPricing({ ...pricing, perFrame: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium" />

                </div>
              </div>
            </div>

            {/* Default Billing Mode */}
            <div className="pt-3 border-t border-border/30">
              <label className="text-xs text-muted-foreground mb-2 block">Default Billing Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['hourly', 'per_minute', 'per_frame'] as BillingMode[]).map((mode) =>
                <button
                  key={mode}
                  onClick={() => setPricing({ ...pricing, defaultBillingMode: mode })}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                    pricing.defaultBillingMode === mode ?
                    "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]" :
                    "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}>

                    {mode === 'hourly' ? 'Hourly' : mode === 'per_minute' ? 'Per Minute' : 'Per Frame'}
                  </button>
                )}
              </div>
            </div>

            {/* Peak/Off-Peak Rates */}
            <div className="pt-3 border-t border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[hsl(var(--gold))]" />
                <span className="text-sm font-medium">Peak / Off-Peak Hours</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Peak Rate (₹/hr)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                    <input
                      type="number"
                      value={pricing.peakHourRate}
                      onChange={(e) => setPricing({ ...pricing, peakHourRate: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium" />

                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Off-Peak Rate (₹/hr)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                    <input
                      type="number"
                      value={pricing.offPeakRate}
                      onChange={(e) => setPricing({ ...pricing, offPeakRate: Number(e.target.value) })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium" />

                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Peak Start
                  </label>
                  <input
                    type="time"
                    value={pricing.peakHoursStart}
                    onChange={(e) => setPricing({ ...pricing, peakHoursStart: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm" />

                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Peak End
                  </label>
                  <input
                    type="time"
                    value={pricing.peakHoursEnd}
                    onChange={(e) => setPricing({ ...pricing, peakHoursEnd: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm" />

                </div>
              </div>
            </div>
          </div>

          {/* Individual Table Rates */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Table2 className="w-5 h-5 text-primary" />
                <span className="font-semibold">Individual Table Rates</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Override global rates for specific tables</p>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {individualPricing.map((table) =>
              <div
                key={table.tableNumber}
                className="border-b border-border/30 last:border-0">

                  <button
                  onClick={() => setExpandedTable(expandedTable === table.tableNumber ? null : table.tableNumber)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-accent/20 transition-colors">

                    <div className={cn(
                    "w-12 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                    table.tableType === 'Snooker' ? 'bg-emerald-500/20 text-emerald-400' :
                    table.tableType === 'Pool' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  )}>
                      {table.tableType === 'Snooker' ? '🎱' : table.tableType === 'Pool' ? '🟡' : '⚫'}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{table.tableName} - {table.tableType}</p>
                      <p className="text-xs text-muted-foreground">
                        {table.useGlobal ?
                      `Global: ₹${pricing.perHour}/hr` :
                      `Custom: ₹${table.customPricing?.perHour || pricing.perHour}/hr`
                      }
                      </p>
                    </div>

                    <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTableGlobal(table.tableNumber);
                    }}
                    className="flex items-center gap-2">

                      <span className="text-xs text-muted-foreground">Global</span>
                      {table.useGlobal ?
                    <ToggleRight className="w-8 h-8 text-available cursor-pointer" /> :

                    <ToggleLeft className="w-8 h-8 text-muted-foreground cursor-pointer" />
                    }
                    </div>

                    <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    expandedTable === table.tableNumber && "rotate-180"
                  )} />
                  </button>

                  {expandedTable === table.tableNumber && !table.useGlobal &&
                <div className="px-4 pb-4 space-y-3 bg-secondary/20">
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">Default Billing Mode</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['hourly', 'per_minute', 'per_frame'] as BillingMode[]).map((mode) =>
                      <button
                        key={mode}
                        onClick={() => handleUpdateTableBillingMode(table.tableNumber, mode)}
                        className={cn(
                          "py-2 px-2 rounded-lg text-xs font-medium transition-all",
                          (table.billingMode || pricing.defaultBillingMode) === mode ?
                          "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]" :
                          "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}>

                              {mode === 'hourly' ? 'Hourly' : mode === 'per_minute' ? 'Per Min' : 'Per Frame'}
                            </button>
                      )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">₹ Per Hour</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--gold))]" />
                            <input
                          type="number"
                          value={table.customPricing?.perHour || pricing.perHour}
                          onChange={(e) => handleUpdateTablePricing(table.tableNumber, 'perHour', Number(e.target.value))}
                          className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium" />

                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">₹ Per Min</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--gold))]" />
                            <input
                          type="number"
                          value={table.customPricing?.perMinute || pricing.perMinute}
                          onChange={(e) => handleUpdateTablePricing(table.tableNumber, 'perMinute', Number(e.target.value))}
                          className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium" />

                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">₹ Per Frame</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--gold))]" />
                            <input
                          type="number"
                          value={table.customPricing?.perFrame || pricing.perFrame}
                          onChange={(e) => handleUpdateTablePricing(table.tableNumber, 'perFrame', Number(e.target.value))}
                          className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium" />

                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Peak Rate Override (₹/hr)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--gold))]" />
                          <input
                        type="number"
                        value={table.customPricing?.peakHourRate || pricing.peakHourRate}
                        onChange={(e) => handleUpdateTablePricing(table.tableNumber, 'peakHourRate', Number(e.target.value))}
                        placeholder="Optional"
                        className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium" />

                        </div>
                      </div>
                    </div>
                }

                  {expandedTable === table.tableNumber && table.useGlobal &&
                <div className="px-4 pb-4 bg-secondary/20">
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Using global rates. Toggle off to set custom pricing.
                      </p>
                    </div>
                }
                </div>
              )}
            </div>
          </div>

          {/* Save All Pricing Button */}
          <button
            onClick={handleSavePricing}
            className="w-full mt-4 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] shadow-[0_8px_32px_hsl(var(--gold)/0.4)]">

            <Check className="w-5 h-5" />
            Save All Pricing
          </button>

          {/* Manage Tables Button */}
          <button
            onClick={() => setShowManageTables(true)}
            className="w-full mt-3 py-3 rounded-xl bg-secondary/50 border border-border/50 font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">

            <Table2 className="w-5 h-5" />
            Manage Tables (Add/Remove)
          </button>
        </div>

        {/* CCTV Setup */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">CCTV SETUP (COMING SOON)</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => {
                setEditingCamera(undefined);
                setShowCameraModal(true);
              }}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-primary">Add New Camera</p>
                <p className="text-sm text-muted-foreground">Configure RTSP/IP stream</p>
              </div>
            </button>

            {cameras.map((camera, idx) =>
            <div
              key={camera.id}
              className={cn(
                'p-4 flex items-center gap-4',
                idx < cameras.length - 1 && 'border-b border-border/50'
              )}>

                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{camera.name}</p>
                    <div className="flex items-center gap-1">
                      <Circle className={cn(
                      'w-2 h-2',
                      camera.status === 'online' ? 'fill-available text-available' : 'fill-primary text-primary'
                    )} />
                      <span className={cn(
                      'text-xs',
                      camera.status === 'online' ? 'text-available' : 'text-primary'
                    )}>
                        {camera.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{camera.url}</p>
                </div>
                <div className="flex gap-2">
                  <button
                  onClick={() => handleEditCamera(camera)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">

                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                  onClick={() => deleteCamera(camera.id)}
                  className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">

                    <Trash2 className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Management */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Inventory</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => {
                setEditingInventoryItem(undefined);
                setShowInventoryModal(true);
              }}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-available/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-available" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-available">Add New Item</p>
                <p className="text-sm text-muted-foreground">Add drinks, snacks, meals</p>
              </div>
            </button>

            <button
              onClick={() => setShowInventoryList(!showInventoryList)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">View All Items</p>
                <p className="text-sm text-muted-foreground">{inventory.length} items in inventory</p>
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showInventoryList && "rotate-90"
              )} />
            </button>

            {showInventoryList &&
            <div className="max-h-80 overflow-y-auto">
                {inventory.map((item, idx) =>
              <div
                key={item.id}
                className={cn(
                  'p-4 flex items-center gap-4',
                  idx < inventory.length - 1 && 'border-b border-border/50'
                )}>

                    <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--gold))] font-medium">₹{item.price}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                    onClick={() => {
                      setEditingInventoryItem(item);
                      setShowInventoryModal(true);
                    }}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors">

                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                    onClick={() => setDeleteItemId(item.id)}
                    className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">

                        <Trash2 className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>
              )}
              </div>
            }

            {!showInventoryList &&
            <div className="p-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <p className="font-bold">{inventory.filter((i) => i.category === 'drinks').length}</p>
                    <p className="text-muted-foreground">Drinks</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <p className="font-bold">{inventory.filter((i) => i.category === 'snacks').length}</p>
                    <p className="text-muted-foreground">Snacks</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <p className="font-bold">{inventory.filter((i) => i.category === 'meals').length}</p>
                    <p className="text-muted-foreground">Meals</p>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        {/* UPI Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setShowQrPreview(!showQrPreview)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-[hsl(var(--gold))]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">UPI QR Code</p>
                <p className="text-sm text-muted-foreground">Tap to preview/update</p>
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showQrPreview && "rotate-90"
              )} />
            </button>

            {showQrPreview &&
            <div className="p-4 space-y-3">
                <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden bg-white p-2">
                  <img
                  src={uploadedQrPreview || clubSettings.upiQrCode}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain" />

                </div>
                <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden" />

                <button
                onClick={handleQrUpload}
                className="w-full py-3 rounded-xl bg-secondary/50 border border-border/50 font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors">

                  <Upload className="w-4 h-4" />
                  Upload New QR Code
                </button>
              </div>
            }
          </div>
        </div>

        {/* WhatsApp Template */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">WhatsApp Reminder</h3>
          <div className="glass-card overflow-hidden p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-[#25D366]" />
              <span className="font-semibold">Reminder Template</span>
            </div>
            
            {isEditingTemplate ?
            <div className="space-y-3">
                <textarea
                value={customTemplate || clubSettings.reminderTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[#25D366]/50 text-sm resize-none" />

                <p className="text-xs text-muted-foreground">
                  Use {'{name}'} and {'{amount}'} as placeholders
                </p>
                <div className="flex gap-2">
                  <button
                  onClick={handleSaveTemplate}
                  className="flex-1 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm">

                    Save
                  </button>
                  <button
                  onClick={() => setIsEditingTemplate(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm">

                    Cancel
                  </button>
                </div>
              </div> :

            <div>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 text-sm text-muted-foreground mb-3">
                  {clubSettings.reminderTemplate}
                </div>
                <button
                onClick={() => {
                  setCustomTemplate(clubSettings.reminderTemplate);
                  setIsEditingTemplate(true);
                }}
                className="w-full py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary transition-colors">

                  <Pencil className="w-4 h-4" />
                  Edit Template
                </button>
              </div>
            }
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Preferences</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => {
                const next = !isDarkMode;
                setIsDarkMode(next);
                if (next) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                localStorage.setItem('snookos-theme', next ? 'dark' : 'light');
              }}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-[hsl(var(--gold))]" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Dark Mode</p>
                <p className="text-sm text-muted-foreground">{isDarkMode ? 'On' : 'Off'}</p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                isDarkMode ? 'bg-primary' : 'bg-secondary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  isDarkMode && 'translate-x-5'
                )} />
              </div>
            </button>

            <button
              onClick={() => setIsOffline(!isOffline)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {isOffline ? <WifiOff className="w-5 h-5 text-paused" /> : <Wifi className="w-5 h-5 text-available" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Offline Mode</p>
                <p className="text-sm text-muted-foreground">{isOffline ? 'Data stored locally' : 'Online'}</p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                isOffline ? 'bg-paused' : 'bg-secondary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  isOffline && 'translate-x-5'
                )} />
              </div>
            </button>

            <button
              onClick={() => setNotifications(!notifications)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">

              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Bell className={cn("w-5 h-5", notifications && "text-[hsl(var(--gold))]")} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Notifications</p>
                <p className="text-sm text-muted-foreground">{notifications ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                notifications ? 'bg-[hsl(var(--gold))]' : 'bg-secondary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  notifications && 'translate-x-5'
                )} />
              </div>
            </button>
          </div>
        </div>

        {/* Time & Timezone Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Time & Timezone</h3>
          <div className="glass-card overflow-hidden">
            {/* 12/24 Hour Format */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[hsl(var(--gold))]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Time Format</p>
                  <p className="text-sm text-muted-foreground">Select 12-hour or 24-hour display</p>
                </div>
              </div>
              <div className="flex gap-2">
                {(['12h', '24h'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => {
                      updateClubSettings({ timeFormat: fmt });
                      localStorage.setItem('snookos-timeformat', fmt);
                      toast.success(`${fmt === '12h' ? '12-hour' : '24-hour'} format applied`);
                    }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                      (clubSettings.timeFormat === fmt || (!clubSettings.timeFormat && fmt === '12h'))
                        ? 'bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {fmt === '12h' ? '12-Hour (AM/PM)' : '24-Hour'}
                  </button>
                ))}
              </div>
            </div>
            {/* Timezone */}
            <div className="p-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Timezone</p>
                  <p className="text-sm text-muted-foreground">Manage from any location</p>
                </div>
              </div>
              <select
                value={clubSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                onChange={(e) => {
                  updateClubSettings({ timezone: e.target.value });
                  localStorage.setItem('snookos-timezone', e.target.value);
                  toast.success('Timezone updated!');
                }}
                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm appearance-none"
              >
                <optgroup label="India">
                  <option value="Asia/Kolkata">India Standard Time (IST) — UTC+5:30</option>
                </optgroup>
                <optgroup label="United States">
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Central European Time (CET)</option>
                </optgroup>
                <optgroup label="Middle East & Asia">
                  <option value="Asia/Dubai">Dubai (GST) — UTC+4</option>
                  <option value="Asia/Singapore">Singapore (SGT) — UTC+8</option>
                  <option value="Asia/Tokyo">Japan (JST) — UTC+9</option>
                </optgroup>
                <optgroup label="Australia">
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Integrations — GA4 */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Integrations</h3>
          <div className="glass-card overflow-hidden p-4 space-y-4">
            <div className="flex items-center gap-4 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-[hsl(var(--gold))]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Google Analytics 4</p>
                <p className="text-sm text-muted-foreground">
                  {clubSettings.ga4PropertyId && (clubSettings as any).ga4ServiceAccountJson ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>

            {/* GA4 Property ID */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">GA4 Property ID (numeric)</label>
              <input
                type="text"
                placeholder="123456789"
                defaultValue={clubSettings.ga4PropertyId || ''}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (clubSettings.ga4PropertyId || '')) {
                    updateClubSettings({ ga4PropertyId: val || undefined } as any);
                    toast.success(val ? 'GA4 Property ID saved!' : 'GA4 Property ID removed');
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find in GA4 → Admin → Property Settings → Property ID (numeric, e.g. 123456789)
              </p>
            </div>

            {/* Service Account JSON */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Service Account JSON</label>
              <textarea
                placeholder='Paste the full JSON key file from Google Cloud Console…'
                defaultValue={(clubSettings as any).ga4ServiceAccountJson ? '••• Service account configured •••' : ''}
                rows={4}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && !val.startsWith('•••')) {
                    try {
                      JSON.parse(val);
                      updateClubSettings({ ga4ServiceAccountJson: val } as any);
                      toast.success('Service Account JSON saved!');
                      e.target.value = '••• Service account configured •••';
                    } catch {
                      toast.error('Invalid JSON — please paste the full service account key file');
                    }
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-mono placeholder:text-muted-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create a service account in Google Cloud Console → IAM → Service Accounts → Keys → Add JSON key. Grant "Viewer" role on your GA4 property.
              </p>
            </div>
          </div>
        </div>

        {/* More */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">More</h3>
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setCurrentView('privacy')}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Privacy Policy</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => setCurrentView('help')}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50">

              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Help & Support</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-primary">Log Out</p>
              </div>
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Snook OS v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">Made with ❤️ for snooker clubs</p>
        </div>
      </div>

      {/* Camera Setup Modal */}
      {showCameraModal &&
      <CameraSetupModal
        camera={editingCamera}
        onClose={handleCloseModal}
        onSave={handleSaveCamera} />

      }

      {/* Inventory Modal */}
      {showInventoryModal &&
      <InventoryModal
        item={editingInventoryItem}
        onClose={() => {
          setShowInventoryModal(false);
          setEditingInventoryItem(undefined);
        }}
        onSave={handleSaveInventoryItem} />

      }

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent className="glass-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item from inventory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-glass">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInventoryItem}
              className="bg-primary text-primary-foreground hover:bg-primary/90">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Tables Modal */}
      {showManageTables &&
      <ManageTablesModal
        tables={individualPricing}
        defaultBillingMode={clubSettings.tablePricing.defaultBillingMode}
        onClose={() => setShowManageTables(false)}
        onSave={(updatedTables) => {
          console.log('[Snook OS] ManageTablesModal onSave called with', updatedTables.length, 'tables:', updatedTables.map(t => `${t.tableNumber}:${t.tableType}:${t.billingMode}`));
          setIndividualPricing(updatedTables);
          // Persist table additions/updates/deletions to Supabase tables table
          syncTablesWithPricing(updatedTables);
        }} />
      }

    </div>
  );
};

export default SettingsScreen;

