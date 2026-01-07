import { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import CameraSetupModal from '@/components/settings/CameraSetupModal';
import InventoryModal from '@/components/settings/InventoryModal';
import ManageTablesModal from '@/components/settings/ManageTablesModal';
import PrivacyScreen from '@/screens/PrivacyScreen';
import HelpScreen from '@/screens/HelpScreen';
import { useMembers } from '@/contexts/MembersContext';
import { Camera as CameraType, InventoryItem, IndividualTablePricing, BillingMode } from '@/types';
import { 
  QrCode, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Upload,
  Camera,
  Plus,
  Pencil,
  Trash2,
  Circle,
  Store,
  MessageSquare,
  Package,
  Image,
  Check,
  IndianRupee,
  Clock,
  Zap,
  ToggleLeft,
  ToggleRight,
  Table2,
  ChevronDown
} from 'lucide-react';
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

type SettingsView = 'main' | 'privacy' | 'help';

const SettingsScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    cameras, addCamera, updateCamera, deleteCamera,
    inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    clubSettings, updateClubSettings
  } = useMembers();

  // Local pricing state
  const [pricing, setPricing] = useState(clubSettings.tablePricing);
  const [individualPricing, setIndividualPricing] = useState<IndividualTablePricing[]>(clubSettings.individualTablePricing);
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
    toast.success('All pricing saved!');
  };

  const handleToggleTableGlobal = (tableNumber: number) => {
    setIndividualPricing(prev => prev.map(t => 
      t.tableNumber === tableNumber 
        ? { 
            ...t, 
            useGlobal: !t.useGlobal,
            customPricing: !t.useGlobal ? undefined : { perHour: pricing.perHour, perMinute: pricing.perMinute, perFrame: pricing.perFrame }
          } 
        : t
    ));
  };

  const handleUpdateTablePricing = (tableNumber: number, field: string, value: number) => {
    setIndividualPricing(prev => prev.map(t => 
      t.tableNumber === tableNumber 
        ? { 
            ...t, 
            customPricing: { 
              ...t.customPricing || { perHour: pricing.perHour, perMinute: pricing.perMinute, perFrame: pricing.perFrame },
              [field]: value 
            } 
          } 
        : t
    ));
  };

  const handleUpdateTableBillingMode = (tableNumber: number, billingMode: BillingMode) => {
    setIndividualPricing(prev => prev.map(t => 
      t.tableNumber === tableNumber 
        ? { ...t, billingMode } 
        : t
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
      {isOffline && (
        <div className="mx-4 mb-4 p-3 rounded-2xl bg-paused/20 border border-paused/30 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-paused" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Offline Mode Active</p>
            <p className="text-xs text-muted-foreground">Data will sync when online</p>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="px-4 space-y-6">
        {/* Club Status */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Club Status</h3>
          <div className="glass-card overflow-hidden">
            <button 
              onClick={() => updateClubSettings({ isOpen: !clubSettings.isOpen })}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium"
                  />
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium"
                  />
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Default Billing Mode */}
            <div className="pt-3 border-t border-border/30">
              <label className="text-xs text-muted-foreground mb-2 block">Default Billing Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['hourly', 'per_minute', 'per_frame'] as BillingMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPricing({ ...pricing, defaultBillingMode: mode })}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                      pricing.defaultBillingMode === mode
                        ? "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {mode === 'hourly' ? 'Hourly' : mode === 'per_minute' ? 'Per Minute' : 'Per Frame'}
                  </button>
                ))}
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
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium"
                    />
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
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm font-medium"
                    />
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
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Peak End
                  </label>
                  <input
                    type="time"
                    value={pricing.peakHoursEnd}
                    onChange={(e) => setPricing({ ...pricing, peakHoursEnd: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                  />
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
              {individualPricing.map((table) => (
                <div 
                  key={table.tableNumber}
                  className="border-b border-border/30 last:border-0"
                >
                  {/* Table Header Row */}
                  <button
                    onClick={() => setExpandedTable(expandedTable === table.tableNumber ? null : table.tableNumber)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-accent/20 transition-colors"
                  >
                    {/* Table Thumbnail */}
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
                        {table.useGlobal 
                          ? `Global: ₹${pricing.perHour}/hr` 
                          : `Custom: ₹${table.customPricing?.perHour || pricing.perHour}/hr`
                        }
                      </p>
                    </div>

                    {/* Use Global Toggle */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTableGlobal(table.tableNumber);
                      }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xs text-muted-foreground">Global</span>
                      {table.useGlobal ? (
                        <ToggleRight className="w-8 h-8 text-available cursor-pointer" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-muted-foreground cursor-pointer" />
                      )}
                    </div>

                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      expandedTable === table.tableNumber && "rotate-180"
                    )} />
                  </button>

                  {/* Expanded Custom Pricing Fields */}
                  {expandedTable === table.tableNumber && !table.useGlobal && (
                    <div className="px-4 pb-4 space-y-3 bg-secondary/20">
                      {/* Billing Mode Selector */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">Default Billing Mode</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['hourly', 'per_minute', 'per_frame'] as BillingMode[]).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => handleUpdateTableBillingMode(table.tableNumber, mode)}
                              className={cn(
                                "py-2 px-2 rounded-lg text-xs font-medium transition-all",
                                (table.billingMode || pricing.defaultBillingMode) === mode
                                  ? "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]"
                                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                              )}
                            >
                              {mode === 'hourly' ? 'Hourly' : mode === 'per_minute' ? 'Per Min' : 'Per Frame'}
                            </button>
                          ))}
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
                              className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium"
                            />
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
                              className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium"
                            />
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
                              className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium"
                            />
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
                            className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collapsed info when using global */}
                  {expandedTable === table.tableNumber && table.useGlobal && (
                    <div className="px-4 pb-4 bg-secondary/20">
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Using global rates. Toggle off to set custom pricing.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save All Pricing Button */}
          <button
            onClick={handleSavePricing}
            className="w-full mt-4 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] shadow-[0_8px_32px_hsl(var(--gold)/0.4)]"
          >
            <Check className="w-5 h-5" />
            Save All Pricing
          </button>

          {/* Manage Tables Button */}
          <button
            onClick={() => setShowManageTables(true)}
            className="w-full mt-3 py-3 rounded-xl bg-secondary/50 border border-border/50 font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <Table2 className="w-5 h-5" />
            Manage Tables (Add/Remove)
          </button>
        </div>

        {/* CCTV Setup */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">CCTV Setup</h3>
          <div className="glass-card overflow-hidden">
            {/* Add Camera Button */}
            <button 
              onClick={() => {
                setEditingCamera(undefined);
                setShowCameraModal(true);
              }}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-primary">Add New Camera</p>
                <p className="text-sm text-muted-foreground">Configure RTSP/IP stream</p>
              </div>
            </button>

            {/* Camera List */}
            {cameras.map((camera, idx) => (
              <div 
                key={camera.id}
                className={cn(
                  'p-4 flex items-center gap-4',
                  idx < cameras.length - 1 && 'border-b border-border/50'
                )}
              >
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
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => deleteCamera(camera.id)}
                    className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            ))}
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
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50"
            >
              <div className="w-10 h-10 rounded-xl bg-available/20 flex items-center justify-center">
                <Plus className="w-5 h-5 text-available" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-available">Add New Item</p>
                <p className="text-sm text-muted-foreground">Add drinks, snacks, meals</p>
              </div>
            </button>

            {/* Toggle Inventory List */}
            <button
              onClick={() => setShowInventoryList(!showInventoryList)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50"
            >
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

            {/* Inventory List */}
            {showInventoryList && (
              <div className="max-h-80 overflow-y-auto">
                {inventory.map((item, idx) => (
                  <div 
                    key={item.id}
                    className={cn(
                      'p-4 flex items-center gap-4',
                      idx < inventory.length - 1 && 'border-b border-border/50'
                    )}
                  >
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
                        className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteItemId(item.id)}
                        className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showInventoryList && (
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <p className="font-bold">{inventory.filter(i => i.category === 'drinks').length}</p>
                    <p className="text-muted-foreground">Drinks</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <p className="font-bold">{inventory.filter(i => i.category === 'snacks').length}</p>
                    <p className="text-muted-foreground">Snacks</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <p className="font-bold">{inventory.filter(i => i.category === 'meals').length}</p>
                    <p className="text-muted-foreground">Meals</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* UPI Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment</h3>
          <div className="glass-card overflow-hidden">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <button 
              onClick={handleQrUpload}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors border-b border-border/50"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <QrCode className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Upload UPI QR Code</p>
                <p className="text-sm text-muted-foreground">Update your payment QR</p>
              </div>
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
              </div>
            </button>

            {/* QR Preview Thumbnail after upload */}
            {(uploadedQrPreview || clubSettings.upiQrCode) && (
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white p-1">
                    <img 
                      src={uploadedQrPreview || clubSettings.upiQrCode} 
                      alt="UPI QR Preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Current QR Code</p>
                    <p className="text-xs text-available flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowQrPreview(!showQrPreview)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Image className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Full Preview</p>
                <p className="text-sm text-muted-foreground">View large QR code</p>
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showQrPreview && "rotate-90"
              )} />
            </button>

            {showQrPreview && (
              <div className="p-4 border-t border-border/50">
                <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-white p-2">
                  <img 
                    src={uploadedQrPreview || clubSettings.upiQrCode} 
                    alt="UPI QR Code" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">This QR appears on payment screen</p>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Reminder Template */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">WhatsApp Reminders</h3>
          <div className="glass-card overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-available" />
                <span className="font-semibold">Reminder Template</span>
              </div>
              
              {isEditingTemplate ? (
                <div className="space-y-3">
                  <textarea
                    value={customTemplate || clubSettings.reminderTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    className="w-full h-24 p-3 rounded-xl bg-secondary/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    placeholder="Use {name} and {amount} as placeholders"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-secondary px-1 rounded">{'{name}'}</code> for member name and <code className="bg-secondary px-1 rounded">{'{amount}'}</code> for due amount. The ₹ symbol will be URL-encoded automatically.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveTemplate}
                      className="flex-1 btn-premium py-2 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button 
                      onClick={() => setIsEditingTemplate(false)}
                      className="btn-glass px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-xl">
                    {clubSettings.reminderTemplate}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => {
                        setCustomTemplate(clubSettings.reminderTemplate);
                        setIsEditingTemplate(true);
                      }}
                      className="flex-1 btn-glass flex items-center justify-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Customize
                    </button>
                    <button 
                      onClick={() => {
                        // Test with sample data
                        const testMessage = clubSettings.reminderTemplate
                          .replace(/\{name\}/gi, 'Rahul Verma')
                          .replace(/\[name\]/gi, 'Rahul Verma')
                          .replace(/\{amount\}/gi, '500')
                          .replace(/\[amount\]/gi, '500');
                        const encodedMessage = encodeURIComponent(testMessage);
                        const testUrl = `https://wa.me/?text=${encodedMessage}`;
                        toast.success('Opening WhatsApp...', {
                          description: 'Test reminder with sample data',
                        });
                        window.open(testUrl, '_blank');
                      }}
                      className="btn-glass flex items-center justify-center gap-2 bg-[#25D366]/20 border-[#25D366]/30 text-[#25D366]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Test
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Appearance</h3>
          <div className="glass-card overflow-hidden">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {isDarkMode ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-gold" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Currently {isDarkMode ? 'enabled' : 'disabled'}</p>
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
          </div>
        </div>

        {/* Connectivity */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Connectivity</h3>
          <div className="glass-card overflow-hidden">
            <button 
              onClick={() => setIsOffline(!isOffline)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {isOffline ? <WifiOff className="w-5 h-5 text-paused" /> : <Wifi className="w-5 h-5 text-available" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Offline Mode</p>
                <p className="text-sm text-muted-foreground">Work without internet</p>
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
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notifications</h3>
          <div className="glass-card overflow-hidden">
            <button 
              onClick={() => setNotifications(!notifications)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Bell className={cn(
                  'w-5 h-5',
                  notifications ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Booking & payment alerts</p>
              </div>
              <div className={cn(
                'w-12 h-7 rounded-full p-1 transition-colors',
                notifications ? 'bg-primary' : 'bg-secondary'
              )}>
                <div className={cn(
                  'w-5 h-5 rounded-full bg-foreground transition-transform',
                  notifications && 'translate-x-5'
                )} />
              </div>
            </button>
          </div>
        </div>

        {/* Other */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Other</h3>
          <div className="glass-card overflow-hidden divide-y divide-border/50">
            <button 
              onClick={() => setCurrentView('privacy')}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">Privacy & Security</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              onClick={() => setCurrentView('help')}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
            >
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
          <p className="text-sm text-muted-foreground">CueMaster v1.0.0</p>
          <p className="text-xs text-muted-foreground mt-1">Made with ❤️ for snooker clubs</p>
        </div>
      </div>

      {/* Camera Setup Modal */}
      {showCameraModal && (
        <CameraSetupModal
          camera={editingCamera}
          onClose={handleCloseModal}
          onSave={handleSaveCamera}
        />
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <InventoryModal
          item={editingInventoryItem}
          onClose={() => {
            setShowInventoryModal(false);
            setEditingInventoryItem(undefined);
          }}
          onSave={handleSaveInventoryItem}
        />
      )}

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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsScreen;