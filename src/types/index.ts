export type TableStatus = 'free' | 'occupied' | 'paused';
export type BillingMode = 'hourly' | 'per_minute' | 'per_frame';
export type TableType = 'Snooker' | 'Pool' | '8-Ball';

export interface TableSession {
  id: string;
  tableNumber: number;
  status: TableStatus;
  players: string[];
  startTime: Date | null;
  pausedTime: number;
  items: OrderItem[];
  totalBill: number;
  billingMode: BillingMode;
  frameCount: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export type MembershipType = 'Gold' | 'Silver' | 'Bronze' | 'Regular' | 'Guest';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  membershipType: MembershipType;
  creditBalance: number;
  lastVisit: Date;
  gamesPlayed: number;
  wins: number;
  losses: number;
  phone: string;
  email: string;
  isGuest?: boolean;
}

export interface Camera {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline';
  thumbnail: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'snacks' | 'meals';
  icon: string;
  stock: number;
}

export interface Booking {
  id: string;
  tableNumber: number;
  customerName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface CreditEntry {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: Date;
  reason: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'snacks' | 'meals';
  icon: string;
}

export interface TablePricing {
  perHour: number;
  perMinute: number;
  perFrame: number;
  peakHourRate: number;
  offPeakRate: number;
  peakHoursStart: string;
  peakHoursEnd: string;
  defaultBillingMode: BillingMode;
}

export interface IndividualTablePricing {
  tableNumber: number;
  tableName: string;
  tableType: TableType;
  useGlobal: boolean;
  customPricing?: {
    perHour: number;
    perMinute: number;
    perFrame: number;
    peakHourRate?: number;
  };
  billingMode?: BillingMode;
  image?: string;
}

export interface ClubSettings {
  isOpen: boolean;
  upiQrCode: string;
  reminderTemplate: string;
  tablePricing: TablePricing;
  individualTablePricing: IndividualTablePricing[];
}

export type TabType = 'home' | 'tables' | 'events' | 'members' | 'more';

export type TournamentType = 'Snooker' | '8-Ball' | '9-Ball';
export type TournamentStatus = 'upcoming' | 'in_progress' | 'completed';

export interface PrizeDistribution {
  place: number;
  amount: number;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  date: Date;
  location: string;
  entryFee: number;
  prizePool?: number;
  prizeDistribution?: PrizeDistribution[];
  maxPlayers: number;
  registeredPlayers: string[];
  status: TournamentStatus;
  description?: string;
  tables?: number[];
  image?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  tableNumber: number;
  status: 'scheduled' | 'live' | 'completed';
  scheduledTime: Date;
  bestOf: number;
}
