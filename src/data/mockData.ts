import { TableSession, Member, Booking, CreditEntry, MenuItem } from '@/types';

export const initialTables: TableSession[] = [
  { id: '1', tableNumber: 1, status: 'occupied', players: ['Rahul Sharma', 'Amit Patel'], startTime: new Date(Date.now() - 4125000), pausedTime: 0, items: [{ id: '1', name: 'Coke', price: 50, quantity: 2 }], totalBill: 450, billingMode: 'hourly', frameCount: 0 },
  { id: '2', tableNumber: 2, status: 'free', players: [], startTime: null, pausedTime: 0, items: [], totalBill: 0, billingMode: 'hourly', frameCount: 0 },
  { id: '3', tableNumber: 3, status: 'occupied', players: ['Vikram Singh', 'Priya Mehta', 'Rohan Das'], startTime: new Date(Date.now() - 1825000), pausedTime: 0, items: [{ id: '2', name: 'Sandwich', price: 120, quantity: 1 }, { id: '3', name: 'Sprite', price: 50, quantity: 3 }], totalBill: 520, billingMode: 'per_minute', frameCount: 0 },
  { id: '4', tableNumber: 4, status: 'paused', players: ['Karan Kapoor', 'Neha Gupta'], startTime: new Date(Date.now() - 2400000), pausedTime: 600000, items: [], totalBill: 280, billingMode: 'hourly', frameCount: 0 },
  { id: '5', tableNumber: 5, status: 'free', players: [], startTime: null, pausedTime: 0, items: [], totalBill: 0, billingMode: 'hourly', frameCount: 0 },
  { id: '6', tableNumber: 6, status: 'occupied', players: ['Arjun Reddy', 'Sanjay Kumar'], startTime: new Date(Date.now() - 3600000), pausedTime: 0, items: [{ id: '4', name: 'Beer', price: 200, quantity: 4 }], totalBill: 1100, billingMode: 'per_frame', frameCount: 5 },
  { id: '7', tableNumber: 7, status: 'free', players: [], startTime: null, pausedTime: 0, items: [], totalBill: 0, billingMode: 'hourly', frameCount: 0 },
  { id: '8', tableNumber: 8, status: 'occupied', players: ['Deepak Verma', 'Ankit Jain', 'Mohit Shah', 'Ravi Teja'], startTime: new Date(Date.now() - 5400000), pausedTime: 0, items: [{ id: '5', name: 'Chips', price: 80, quantity: 2 }, { id: '6', name: 'Coke', price: 50, quantity: 4 }], totalBill: 890, billingMode: 'hourly', frameCount: 0 },
  { id: '9', tableNumber: 9, status: 'free', players: [], startTime: null, pausedTime: 0, items: [], totalBill: 0, billingMode: 'hourly', frameCount: 0 },
  { id: '10', tableNumber: 10, status: 'paused', players: ['Suresh Menon'], startTime: new Date(Date.now() - 1200000), pausedTime: 300000, items: [], totalBill: 150, billingMode: 'per_frame', frameCount: 3 },
];

export const members: Member[] = [
  { id: '1', name: 'Rahul Sharma', avatar: 'RS', membershipType: 'Gold', creditBalance: 0, lastVisit: new Date(), gamesPlayed: 156, wins: 98, losses: 58, phone: '+91 98765 43210', email: 'rahul@email.com' },
  { id: '2', name: 'Amit Patel', avatar: 'AP', membershipType: 'Silver', creditBalance: -500, lastVisit: new Date(), gamesPlayed: 89, wins: 45, losses: 44, phone: '+91 98765 43211', email: 'amit@email.com' },
  { id: '3', name: 'Vikram Singh', avatar: 'VS', membershipType: 'Gold', creditBalance: 1200, lastVisit: new Date(Date.now() - 86400000), gamesPlayed: 234, wins: 167, losses: 67, phone: '+91 98765 43212', email: 'vikram@email.com' },
  { id: '4', name: 'Priya Mehta', avatar: 'PM', membershipType: 'Bronze', creditBalance: -1500, lastVisit: new Date(Date.now() - 172800000), gamesPlayed: 45, wins: 18, losses: 27, phone: '+91 98765 43213', email: 'priya@email.com' },
  { id: '5', name: 'Rohan Das', avatar: 'RD', membershipType: 'Regular', creditBalance: 0, lastVisit: new Date(), gamesPlayed: 67, wins: 34, losses: 33, phone: '+91 98765 43214', email: 'rohan@email.com' },
  { id: '6', name: 'Karan Kapoor', avatar: 'KK', membershipType: 'Gold', creditBalance: 2500, lastVisit: new Date(Date.now() - 3600000), gamesPlayed: 312, wins: 245, losses: 67, phone: '+91 98765 43215', email: 'karan@email.com' },
  { id: '7', name: 'Neha Gupta', avatar: 'NG', membershipType: 'Silver', creditBalance: -800, lastVisit: new Date(Date.now() - 7200000), gamesPlayed: 78, wins: 42, losses: 36, phone: '+91 98765 43216', email: 'neha@email.com' },
  { id: '8', name: 'Arjun Reddy', avatar: 'AR', membershipType: 'Gold', creditBalance: 0, lastVisit: new Date(), gamesPlayed: 198, wins: 134, losses: 64, phone: '+91 98765 43217', email: 'arjun@email.com' },
  { id: '9', name: 'Sanjay Kumar', avatar: 'SK', membershipType: 'Regular', creditBalance: -2000, lastVisit: new Date(), gamesPlayed: 34, wins: 12, losses: 22, phone: '+91 98765 43218', email: 'sanjay@email.com' },
  { id: '10', name: 'Deepak Verma', avatar: 'DV', membershipType: 'Bronze', creditBalance: 500, lastVisit: new Date(), gamesPlayed: 123, wins: 78, losses: 45, phone: '+91 98765 43219', email: 'deepak@email.com' },
  { id: '11', name: 'Ankit Jain', avatar: 'AJ', membershipType: 'Silver', creditBalance: 0, lastVisit: new Date(), gamesPlayed: 89, wins: 56, losses: 33, phone: '+91 98765 43220', email: 'ankit@email.com' },
  { id: '12', name: 'Mohit Shah', avatar: 'MS', membershipType: 'Gold', creditBalance: 3000, lastVisit: new Date(), gamesPlayed: 267, wins: 189, losses: 78, phone: '+91 98765 43221', email: 'mohit@email.com' },
  { id: '13', name: 'Suresh Menon', avatar: 'SM', membershipType: 'Silver', creditBalance: 0, lastVisit: new Date(Date.now() - 1200000), gamesPlayed: 145, wins: 89, losses: 56, phone: '+91 98765 43222', email: 'suresh@email.com' },
  { id: '14', name: 'Ravi Teja', avatar: 'RT', membershipType: 'Gold', creditBalance: 1800, lastVisit: new Date(), gamesPlayed: 278, wins: 198, losses: 80, phone: '+91 98765 43223', email: 'ravi@email.com' },
  { id: '15', name: 'Anil Kapoor', avatar: 'AK', membershipType: 'Bronze', creditBalance: -300, lastVisit: new Date(Date.now() - 259200000), gamesPlayed: 56, wins: 28, losses: 28, phone: '+91 98765 43224', email: 'anil@email.com' },
  { id: '16', name: 'Pooja Sharma', avatar: 'PS', membershipType: 'Silver', creditBalance: 750, lastVisit: new Date(), gamesPlayed: 98, wins: 62, losses: 36, phone: '+91 98765 43225', email: 'pooja@email.com' },
  { id: '17', name: 'Rajesh Khanna', avatar: 'RK', membershipType: 'Regular', creditBalance: 0, lastVisit: new Date(Date.now() - 432000000), gamesPlayed: 34, wins: 15, losses: 19, phone: '+91 98765 43226', email: 'rajesh@email.com' },
  { id: '18', name: 'Sneha Reddy', avatar: 'SR', membershipType: 'Gold', creditBalance: 4200, lastVisit: new Date(), gamesPlayed: 189, wins: 145, losses: 44, phone: '+91 98765 43227', email: 'sneha@email.com' },
  { id: '19', name: 'Gaurav Tandon', avatar: 'GT', membershipType: 'Bronze', creditBalance: -600, lastVisit: new Date(), gamesPlayed: 78, wins: 38, losses: 40, phone: '+91 98765 43228', email: 'gaurav@email.com' },
  { id: '20', name: 'Meera Nair', avatar: 'MN', membershipType: 'Silver', creditBalance: 200, lastVisit: new Date(Date.now() - 86400000), gamesPlayed: 112, wins: 72, losses: 40, phone: '+91 98765 43229', email: 'meera@email.com' },
  { id: '21', name: 'Vivek Oberoi', avatar: 'VO', membershipType: 'Regular', creditBalance: -100, lastVisit: new Date(), gamesPlayed: 45, wins: 22, losses: 23, phone: '+91 98765 43230', email: 'vivek@email.com' },
  { id: '22', name: 'Kavya Madhavan', avatar: 'KM', membershipType: 'Gold', creditBalance: 1500, lastVisit: new Date(), gamesPlayed: 167, wins: 112, losses: 55, phone: '+91 98765 43231', email: 'kavya@email.com' },
  { id: '23', name: 'Akhil Sharma', avatar: 'AS', membershipType: 'Bronze', creditBalance: 0, lastVisit: new Date(Date.now() - 172800000), gamesPlayed: 67, wins: 34, losses: 33, phone: '+91 98765 43232', email: 'akhil@email.com' },
  { id: '24', name: 'Nandita Das', avatar: 'ND', membershipType: 'Silver', creditBalance: 890, lastVisit: new Date(), gamesPlayed: 134, wins: 89, losses: 45, phone: '+91 98765 43233', email: 'nandita@email.com' },
  { id: '25', name: 'Harish Iyer', avatar: 'HI', membershipType: 'Regular', creditBalance: -400, lastVisit: new Date(), gamesPlayed: 23, wins: 8, losses: 15, phone: '+91 98765 43234', email: 'harish@email.com' },
];

export const bookings: Booking[] = [
  { id: '1', tableNumber: 2, customerName: 'Raj Malhotra', date: new Date(), startTime: '14:00', endTime: '16:00', status: 'confirmed' },
  { id: '2', tableNumber: 5, customerName: 'Aditya Nair', date: new Date(), startTime: '15:00', endTime: '17:00', status: 'confirmed' },
  { id: '3', tableNumber: 7, customerName: 'Kavitha Iyer', date: new Date(), startTime: '18:00', endTime: '20:00', status: 'pending' },
  { id: '4', tableNumber: 1, customerName: 'Varun Dhawan', date: new Date(Date.now() + 86400000), startTime: '10:00', endTime: '12:00', status: 'confirmed' },
  { id: '5', tableNumber: 3, customerName: 'Shruti Hassan', date: new Date(Date.now() + 86400000), startTime: '14:00', endTime: '16:00', status: 'pending' },
];

export const creditEntries: CreditEntry[] = [
  { id: '1', memberId: '2', memberName: 'Amit Patel', amount: 500, dueDate: new Date(Date.now() + 604800000), reason: 'Table charges - 12/24' },
  { id: '2', memberId: '4', memberName: 'Priya Mehta', amount: 1500, dueDate: new Date(Date.now() + 259200000), reason: 'Food & beverages + Table' },
  { id: '3', memberId: '7', memberName: 'Neha Gupta', amount: 800, dueDate: new Date(Date.now() + 432000000), reason: 'Table charges - 12/22' },
  { id: '4', memberId: '9', memberName: 'Sanjay Kumar', amount: 2000, dueDate: new Date(Date.now() - 172800000), reason: 'Multiple sessions pending' },
];

export const menuItems: MenuItem[] = [
  { id: '1', name: 'Coke', price: 50, category: 'drinks', icon: '🥤' },
  { id: '2', name: 'Sprite', price: 50, category: 'drinks', icon: '🥤' },
  { id: '3', name: 'Red Bull', price: 150, category: 'drinks', icon: '🥫' },
  { id: '4', name: 'Beer', price: 200, category: 'drinks', icon: '🍺' },
  { id: '5', name: 'Water', price: 30, category: 'drinks', icon: '💧' },
  { id: '6', name: 'Coffee', price: 80, category: 'drinks', icon: '☕' },
  { id: '7', name: 'Sandwich', price: 120, category: 'snacks', icon: '🥪' },
  { id: '8', name: 'Chips', price: 80, category: 'snacks', icon: '🍟' },
  { id: '9', name: 'Samosa', price: 40, category: 'snacks', icon: '🥟' },
  { id: '10', name: 'Pizza Slice', price: 150, category: 'snacks', icon: '🍕' },
  { id: '11', name: 'Burger', price: 180, category: 'meals', icon: '🍔' },
  { id: '12', name: 'Biryani', price: 250, category: 'meals', icon: '🍛' },
];

export const TABLE_RATE_PER_HOUR = 200; // ₹200 per hour
