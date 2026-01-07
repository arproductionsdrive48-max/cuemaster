import { useState } from 'react';
import { TableSession, MenuItem, OrderItem } from '@/types';
import { useTimer } from '@/hooks/useTimer';
import { useMembers } from '@/contexts/MembersContext';
import { menuItems } from '@/data/mockData';
import { 
  ArrowLeft, MoreVertical, Play, Pause, Square, Plus, X, Minus,
  UserPlus, Search, ChevronRight, Users, Calendar, Trophy, Camera, BarChart3, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AddPlayerModal from './AddPlayerModal';
import PaymentModal from './PaymentModal';

interface TableDetailModalProps {
  table: TableSession;
  onClose: () => void;
  onUpdate: (updated: TableSession) => void;
  onEndSession: (table: TableSession) => void;
}

// Realistic drink icons with colors
const drinkIcons: Record<string, { icon: string; color: string }> = {
  'Coke': { icon: '🥤', color: 'bg-red-500/20' },
  'Sprite': { icon: '🥤', color: 'bg-green-500/20' },
  'Red Bull': { icon: '🥫', color: 'bg-blue-500/20' },
  'Beer': { icon: '🍺', color: 'bg-amber-500/20' },
  'Water': { icon: '💧', color: 'bg-cyan-500/20' },
  'Coffee': { icon: '☕', color: 'bg-amber-700/20' },
  'Tea': { icon: '🍵', color: 'bg-emerald-500/20' },
  'Juice': { icon: '🧃', color: 'bg-orange-500/20' },
  'Soda': { icon: '🥤', color: 'bg-purple-500/20' },
  'Chips': { icon: '🍟', color: 'bg-yellow-500/20' },
  'Samosa': { icon: '🥟', color: 'bg-orange-400/20' },
  'Sandwich': { icon: '🥪', color: 'bg-lime-500/20' },
  'Burger': { icon: '🍔', color: 'bg-amber-600/20' },
  'Pizza': { icon: '🍕', color: 'bg-red-400/20' },
  'default': { icon: '🍽️', color: 'bg-secondary' },
};

const getDrinkIcon = (name: string) => {
  const match = Object.keys(drinkIcons).find(key => 
    name.toLowerCase().includes(key.toLowerCase())
  );
  return drinkIcons[match || 'default'];
};

const TableDetailModal = ({ table, onClose, onUpdate, onEndSession }: TableDetailModalProps) => {
  const { members, addMember, inventory, clubSettings } = useMembers();
  const [showPlayerSearch, setShowPlayerSearch] = useState(true);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'members' | 'bookings' | 'leaderboard' | 'cctv' | 'reports' | 'settings'>('tables');

  // Get the correct rate for this table based on billing mode
  const tableConfig = clubSettings.individualTablePricing?.find(t => t.tableNumber === table.tableNumber);
  const pricing = tableConfig?.useGlobal === false && tableConfig?.customPricing
    ? tableConfig.customPricing
    : clubSettings.tablePricing;
  
  const tableRate = pricing.perHour;
  const perMinuteRate = pricing.perMinute;
  const perFrameRate = pricing.perFrame;

  const { elapsed, formatted } = useTimer(
    table.startTime,
    table.status === 'paused',
    table.pausedTime
  );

  // Parse formatted time into hours, minutes, seconds
  const timeParts = formatted.split(':');
  const hours = timeParts.length === 3 ? timeParts[0].padStart(2, '0') : '00';
  const minutes = timeParts.length === 3 ? timeParts[1].padStart(2, '0') : timeParts[0]?.padStart(2, '0') || '00';
  const seconds = timeParts.length === 3 ? timeParts[2].padStart(2, '0') : timeParts[1]?.padStart(2, '0') || '00';

  // Calculate table charge based on billing mode
  const calculateTableCharge = () => {
    switch (table.billingMode) {
      case 'hourly':
        return Math.ceil(elapsed / 3600000) * tableRate;
      case 'per_minute':
        return Math.ceil(elapsed / 60000) * perMinuteRate;
      case 'per_frame':
        return table.frameCount * perFrameRate;
      default:
        return Math.ceil(elapsed / 3600000) * tableRate;
    }
  };

  const tableCharge = calculateTableCharge();
  const itemsTotal = table.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalBill = tableCharge + itemsTotal;

  // Get rate display text based on billing mode
  const getRateDisplay = () => {
    switch (table.billingMode) {
      case 'hourly':
        return `₹${tableRate}/hr`;
      case 'per_minute':
        return `₹${perMinuteRate}/min`;
      case 'per_frame':
        return `₹${perFrameRate}/frame`;
      default:
        return `₹${tableRate}/hr`;
    }
  };

  // Handle frame count update
  const handleAddFrame = () => {
    onUpdate({ ...table, frameCount: table.frameCount + 1 });
  };

  const handleRemoveFrame = () => {
    if (table.frameCount > 0) {
      onUpdate({ ...table, frameCount: table.frameCount - 1 });
    }
  };

  // Format start time
  const startTimeFormatted = table.startTime 
    ? table.startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';

  const handleStart = () => {
    onUpdate({
      ...table,
      status: 'occupied',
      startTime: table.startTime || new Date(),
    });
  };

  const handlePause = () => {
    onUpdate({
      ...table,
      status: 'paused',
    });
  };

  const handleResume = () => {
    onUpdate({
      ...table,
      status: 'occupied',
      pausedTime: table.pausedTime + (Date.now() - (table.startTime?.getTime() || 0)),
    });
  };

  const handleAddItem = (menuItem: MenuItem) => {
    const existingItem = table.items.find(i => i.id === menuItem.id);
    let newItems: OrderItem[];

    if (existingItem) {
      newItems = table.items.map(i =>
        i.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newItems = [...table.items, { ...menuItem, quantity: 1 }];
    }

    onUpdate({ ...table, items: newItems, totalBill });
  };

  const handleAddPlayer = (memberName: string) => {
    if (!table.players.includes(memberName)) {
      onUpdate({ ...table, players: [...table.players, memberName] });
    }
    setPlayerSearch('');
  };

  const handleAddNewPlayer = (player: { name: string; phone?: string; isGuest: boolean }) => {
    addMember({
      name: player.name,
      phone: player.phone || '',
      email: '',
      membershipType: player.isGuest ? 'Guest' : 'Regular',
      isGuest: player.isGuest,
    });
    
    if (!table.players.includes(player.name)) {
      onUpdate({ ...table, players: [...table.players, player.name] });
    }
  };

  const handleRemovePlayer = (playerName: string) => {
    onUpdate({ ...table, players: table.players.filter(p => p !== playerName) });
  };

  const handleEndSession = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = () => {
    setShowPaymentModal(false);
    onEndSession({ ...table, totalBill });
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // Use inventory items for Quick POS - get first 6
  const quickPosItems = inventory.slice(0, 6);

  // Get avatar initials and gradient colors
  const getPlayerGradient = (index: number) => {
    const gradients = [
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-violet-600',
      'from-cyan-500 to-blue-600',
    ];
    return gradients[index % gradients.length];
  };

  // Check if any player is a member (not guest)
  const hasMember = table.players.some(player => {
    const memberInfo = members.find(m => m.name === player);
    return memberInfo && !memberInfo.isGuest;
  });

  // Bottom navigation tabs
  const navTabs = [
    { id: 'tables', icon: BarChart3, label: 'Tables', active: true },
    { id: 'members', icon: Users, label: 'People', active: false },
    { id: 'bookings', icon: Calendar, label: 'Calendar', active: false },
    { id: 'leaderboard', icon: Trophy, label: 'Trophy', active: false },
    { id: 'cctv', icon: Camera, label: 'Camera', active: false },
    { id: 'reports', icon: BarChart3, label: 'Reports', active: false },
    { id: 'settings', icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 animate-fade-in-up"
      style={{
        background: 'radial-gradient(ellipse at top right, #2a261c 0%, #0d0c0a 100%)',
      }}
    >
      {/* Sticky Header */}
      <div 
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{
          background: 'rgba(15, 15, 12, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottomLeftRadius: '1.5rem',
          borderBottomRightRadius: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Table {table.tableNumber.toString().padStart(2, '0')} - Snooker</h1>
              {hasMember && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold uppercase tracking-wide">
                  MEMBER
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <div className={cn(
                'w-2 h-2 rounded-full',
                table.status === 'occupied' && 'bg-emerald-500 animate-pulse',
                table.status === 'paused' && 'bg-amber-500',
                table.status === 'free' && 'bg-muted-foreground'
              )} />
              <span className={cn(
                'text-[10px] uppercase tracking-wider font-medium',
                table.status === 'occupied' && 'text-emerald-500',
                table.status === 'paused' && 'text-amber-500',
                table.status === 'free' && 'text-muted-foreground'
              )}>
                {table.status === 'occupied' ? 'OCCUPIED' : table.status === 'paused' ? 'PAUSED' : 'FREE'}
              </span>
            </div>
          </div>
          
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <MoreVertical className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-240px)] no-scrollbar px-4 pt-4 pb-8">
        {/* Timer Section - TOP & Prominent */}
        <div 
          className="rounded-2xl p-5 mb-5"
          style={{
            background: 'rgba(25, 25, 20, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Display based on billing mode */}
          {table.billingMode === 'per_frame' ? (
            /* Frame Counter Display */
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Frames Played</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleRemoveFrame}
                  disabled={table.frameCount === 0}
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all active:scale-95",
                    table.frameCount === 0 
                      ? "bg-secondary/30 text-muted-foreground cursor-not-allowed" 
                      : "bg-primary/20 text-primary hover:bg-primary/30"
                  )}
                >
                  <Minus className="w-6 h-6" />
                </button>
                <div className="min-w-[100px]">
                  <span className="text-6xl font-bold font-mono text-[hsl(var(--gold))]">
                    {table.frameCount}
                  </span>
                </div>
                <button
                  onClick={handleAddFrame}
                  className="w-14 h-14 rounded-xl flex items-center justify-center bg-available/20 text-available hover:bg-available/30 transition-all active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Rate: <span className="text-[hsl(var(--gold))] font-semibold">{getRateDisplay()}</span> • 
                Total: <span className="text-[hsl(var(--gold))] font-semibold">₹{tableCharge}</span>
              </p>
              {/* Small timer below for reference */}
              <p className="text-xs text-muted-foreground mt-1">
                Time: {hours}:{minutes}:{seconds} • Started at {startTimeFormatted}
              </p>
            </div>
          ) : (
            /* Timer Display for hourly/per_minute */
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                {table.billingMode === 'per_minute' ? 'Session Time (Per Minute)' : 'Session Time'}
              </p>
              <div className="flex items-center justify-center gap-1">
                <span className={cn(
                  "text-5xl font-bold font-mono tracking-tight",
                  table.status === 'occupied' ? "text-foreground" : table.status === 'paused' ? "text-amber-400" : "text-muted-foreground"
                )}>
                  {hours}
                </span>
                <span className="text-5xl font-bold text-primary animate-pulse">:</span>
                <span className={cn(
                  "text-5xl font-bold font-mono tracking-tight",
                  table.status === 'occupied' ? "text-foreground" : table.status === 'paused' ? "text-amber-400" : "text-muted-foreground"
                )}>
                  {minutes}
                </span>
                <span className="text-5xl font-bold text-primary animate-pulse">:</span>
                <span className={cn(
                  "text-5xl font-bold font-mono tracking-tight",
                  table.status === 'occupied' ? "text-primary" : table.status === 'paused' ? "text-amber-400" : "text-muted-foreground"
                )}>
                  {seconds}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Rate: <span className="text-[hsl(var(--gold))] font-semibold">{getRateDisplay()}</span> • Started at <span className="text-foreground">{startTimeFormatted}</span>
              </p>
            </div>
          )}

          {/* Control Buttons Row */}
          <div className="flex items-center justify-center gap-3">
            {/* Start/Resume Button */}
            {(table.status === 'free' || table.status === 'paused') && (
              <button
                onClick={table.status === 'free' ? handleStart : handleResume}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                }}
              >
                <Play className="w-5 h-5 text-white fill-white" />
                <span className="text-white text-sm uppercase tracking-wide">{table.status === 'free' ? 'Start' : 'Resume'}</span>
              </button>
            )}

            {/* Pause Button - Yellow */}
            {table.status === 'occupied' && (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--gold)) 0%, hsl(40, 95%, 45%) 100%)',
                  boxShadow: '0 4px 20px hsla(var(--gold), 0.4)',
                }}
              >
                <Pause className="w-5 h-5 text-black" />
                <span className="text-black text-sm uppercase tracking-wide">Pause</span>
              </button>
            )}

            {/* Stop Button - Red */}
            {table.status !== 'free' && (
              <button
                onClick={() => onEndSession({ ...table, totalBill })}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                }}
              >
                <Square className="w-5 h-5 text-white fill-white" />
                <span className="text-white text-sm uppercase tracking-wide">Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Players Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Players ({table.players.length})</h3>
            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="text-sm text-[hsl(var(--gold))] font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Player
            </button>
          </div>

          {/* Player Search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search existing member..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-foreground placeholder:text-muted-foreground outline-none focus:border-[hsl(var(--gold))]/50 text-sm"
              />
            </div>
            {playerSearch && filteredMembers.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden bg-black/60 border border-white/10">
                {filteredMembers.slice(0, 5).map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleAddPlayer(member.name)}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors text-sm flex items-center justify-between border-b border-white/5 last:border-0"
                  >
                    <span className="text-foreground">{member.name}</span>
                    {member.isGuest ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground uppercase">Guest</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 uppercase">Member</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Players List */}
          {table.players.length > 0 ? (
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(25, 25, 20, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {table.players.map((player, idx) => {
                const memberInfo = members.find(m => m.name === player);
                const initials = player.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br',
                        getPlayerGradient(idx)
                      )}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{player}</p>
                        <span className={cn(
                          'text-[10px] uppercase tracking-wider font-medium',
                          memberInfo?.isGuest ? 'text-muted-foreground' : 'text-orange-400'
                        )}>
                          {memberInfo?.isGuest ? 'GUEST' : 'MEMBER'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(player)}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div 
              className="rounded-2xl p-4 text-center"
              style={{
                background: 'rgba(25, 25, 20, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <p className="text-muted-foreground text-sm">No players added yet</p>
            </div>
          )}
        </div>

        {/* Quick POS Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Quick POS</h3>
            <button
              onClick={() => setShowAllItems(!showAllItems)}
              className="text-sm text-[hsl(var(--gold))] font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              View All Items
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current Orders */}
          {table.items.length > 0 && (
            <div 
              className="rounded-2xl p-3 mb-3"
              style={{
                background: 'rgba(25, 25, 20, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Current Orders</span>
                <span className="text-sm font-bold text-[hsl(var(--gold))]">₹{itemsTotal}</span>
              </div>
              <div className="space-y-1.5">
                {table.items.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[hsl(var(--gold))]">{item.quantity}x</span>
                    </div>
                    <span className="flex-1 text-sm text-foreground">{item.name}</span>
                    <span className="text-sm text-[hsl(var(--gold))]">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add Grid with realistic drink icons */}
          <div className="grid grid-cols-3 gap-2">
            {quickPosItems.map((item) => {
              const drinkStyle = getDrinkIcon(item.name);
              return (
                <button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="relative rounded-xl p-3 text-left transition-all active:scale-95 group"
                  style={{
                    background: 'rgba(25, 25, 20, 0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {/* Add Button */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center group-hover:bg-[hsl(var(--gold))] group-hover:border-[hsl(var(--gold))] transition-all">
                    <Plus className="w-3.5 h-3.5 text-white group-hover:text-black transition-colors" />
                  </div>
                  
                  {/* Icon */}
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', drinkStyle.color)}>
                    <span className="text-lg">{drinkStyle.icon}</span>
                  </div>
                  
                  {/* Item Info */}
                  <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-sm font-bold text-[hsl(var(--gold))]">₹{item.price}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Footer with Bill & Pay Button */}
      <div 
        className="fixed bottom-14 left-0 right-0 px-4 pt-3 pb-3"
        style={{
          background: 'rgba(15, 15, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Bill Breakdown */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex gap-4">
            <div>
              <span className="text-muted-foreground text-xs">Table</span>
              <p className="text-foreground font-medium">₹{tableCharge}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">F&B</span>
              <p className="text-foreground font-medium">₹{itemsTotal}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs">Grand Total</span>
            <p className="text-2xl font-bold text-[hsl(var(--gold))]">₹{totalBill}</p>
          </div>
        </div>

        {/* End Session Button - Large and Prominent */}
        <button
          onClick={handleEndSession}
          disabled={table.status === 'free'}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            table.status === 'free'
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] shadow-[0_8px_32px_hsl(var(--gold)/0.4)]"
          )}
        >
          End Session & Pay
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Navigation Tabs */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-around px-2"
        style={{
          background: 'rgba(10, 10, 8, 0.98)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {navTabs.slice(0, 7).map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'tables';
          return (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Add New Player Modal */}
      {showAddPlayerModal && (
        <AddPlayerModal
          onClose={() => setShowAddPlayerModal(false)}
          onAddPlayer={handleAddNewPlayer}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          table={{ ...table, totalBill }}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handlePaymentConfirm}
        />
      )}
    </div>
  );
};

export default TableDetailModal;