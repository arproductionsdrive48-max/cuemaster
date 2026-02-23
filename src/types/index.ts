export type TableStatus = 'free' | 'occupied' | 'paused';
export type BillingMode = 'hourly' | 'per_minute' | 'per_frame';
export type TableType = 'Snooker' | 'Pool' | '8-Ball';

export interface TableSession {
  id: string;
  tableNumber: number;
  tableName?: string;
  tableType?: TableType;
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
  highestBreak?: number;
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

export interface MatchRecord {
  id: string;
  tableNumber: number;
  players: { name: string; result: 'win' | 'loss' | 'draw' }[];
  date: Date;
  sessionStartTime?: Date;
  sessionEndTime?: Date;
  duration: number; // ms
  billingMode: BillingMode;
  totalBill: number;
  paymentMethod?: string;
  splitCount?: number;
  qrUsed?: boolean;
  items?: OrderItem[]; // session POS items
}

export interface Booking {
  id: string;
  tableNumber: number;
  customerName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  advancePayment?: number;
}

export interface ClubSettings {
  isOpen: boolean;
  upiQrCode: string;
  reminderTemplate: string;
  tablePricing: TablePricing;
  individualTablePricing: IndividualTablePricing[];
  showMembershipBadge: boolean;
  clubName: string;
  clubLogo: string;
  gstEnabled: boolean;
  gstRate: number;
  timeFormat?: '12h' | '24h';
  timezone?: string;
  ga4PropertyId?: string;
  ga4ServiceAccountJson?: string;
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
  startTime?: string; // e.g. "14:00"
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
  winner?: string; // tournament winner name
  trophies?: Record<string, string[]>; // player -> trophy names
}

export interface TournamentBracketMatch {
  id: string;
  round: number; // 0 = QF, 1 = SF, 2 = Final
  matchNumber: number;
  player1: string | null;
  player2: string | null;
  score1: number;
  score2: number;
  bestOf: number;
  tableNumber: number;
  status: 'pending' | 'live' | 'completed';
  winner?: string;
  liveLink?: string;
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
