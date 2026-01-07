import { Tournament, TournamentMatch } from '@/types';

export const mockTournaments: Tournament[] = [
  {
    id: '1',
    name: 'Winter 8-Ball Open',
    type: '8-Ball',
    date: new Date('2024-12-28'),
    location: 'Main Hall, Table 1-4',
    entryFee: 500,
    prizePool: 15000,
    maxPlayers: 32,
    registeredPlayers: Array.from({ length: 28 }, (_, i) => `player-${i + 1}`),
    status: 'upcoming',
    description: 'Annual winter championship for 8-ball enthusiasts',
    tables: [1, 2, 3, 4]
  },
  {
    id: '2',
    name: 'Pro Snooker Qualifiers',
    type: 'Snooker',
    date: new Date('2025-01-05'),
    location: 'VIP Room',
    entryFee: 1200,
    prizePool: 50000,
    maxPlayers: 16,
    registeredPlayers: Array.from({ length: 5 }, (_, i) => `player-${i + 1}`),
    status: 'upcoming',
    description: 'Qualify for the regional snooker championship',
    tables: [5, 6]
  },
  {
    id: '3',
    name: 'Sunday Amateur 9-Ball',
    type: '9-Ball',
    date: new Date('2025-01-07'),
    location: 'Main Hall',
    entryFee: 300,
    maxPlayers: 32,
    registeredPlayers: [],
    status: 'upcoming',
    description: 'Beginner-friendly tournament every Sunday',
    tables: [1, 2]
  },
  {
    id: '4',
    name: 'Golden Cue Championship',
    type: 'Snooker',
    date: new Date('2024-10-24'),
    location: 'Main Hall, All Tables',
    entryFee: 2000,
    prizePool: 100000,
    maxPlayers: 32,
    registeredPlayers: Array.from({ length: 32 }, (_, i) => `player-${i + 1}`),
    status: 'in_progress',
    description: 'The premier snooker event of the year',
    tables: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  {
    id: '5',
    name: 'Monsoon Pool League',
    type: '8-Ball',
    date: new Date('2024-08-15'),
    location: 'Main Hall',
    entryFee: 400,
    prizePool: 20000,
    maxPlayers: 24,
    registeredPlayers: Array.from({ length: 24 }, (_, i) => `player-${i + 1}`),
    status: 'completed',
    description: 'Monsoon season league championship',
    tables: [1, 2, 3]
  }
];

export const mockMatches: TournamentMatch[] = [
  {
    id: 'm1',
    tournamentId: '4',
    player1: 'Ronnie O.',
    player2: 'Judd T.',
    score1: 3,
    score2: 1,
    tableNumber: 1,
    status: 'live',
    scheduledTime: new Date(),
    bestOf: 7
  },
  {
    id: 'm2',
    tournamentId: '4',
    player1: 'Ding J.',
    player2: 'Neil R.',
    score1: 2,
    score2: 2,
    tableNumber: 2,
    status: 'live',
    scheduledTime: new Date(),
    bestOf: 7
  },
  {
    id: 'm3',
    tournamentId: '4',
    player1: 'Mark S.',
    player2: 'John H.',
    score1: 0,
    score2: 0,
    tableNumber: 3,
    status: 'scheduled',
    scheduledTime: new Date(Date.now() + 3600000),
    bestOf: 7
  },
  {
    id: 'm4',
    tournamentId: '4',
    player1: 'Kyren W.',
    player2: 'Shaun M.',
    score1: 0,
    score2: 0,
    tableNumber: 1,
    status: 'scheduled',
    scheduledTime: new Date(Date.now() + 7200000),
    bestOf: 7
  }
];
