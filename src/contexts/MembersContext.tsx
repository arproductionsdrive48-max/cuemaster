import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Member, Camera, InventoryItem, ClubSettings, TablePricing, IndividualTablePricing } from '@/types';
import { members as initialMembers, menuItems } from '@/data/mockData';

// CCTV cycling images for live simulation - high quality snooker table views
const cctvImages = [
  'https://www.wellingboroughcuesports.co.uk/wp-content/uploads/2024/05/arena1web-1024x683.jpg',
  'https://www.wellingboroughcuesports.co.uk/wp-content/uploads/2024/05/arena-6-1024x683.jpg',
  'https://media.istockphoto.com/id/149409557/photo/composition-of-billiard.jpg?s=612x612&w=0&k=20&c=Wn6B7acze4xG4TX1S3vusu8nC88nYJBy2_xYhdRNpKU=',
  'https://storage.googleapis.com/shp-promo-europe/web-promo/img/gallery/shooterspool-snooker-tv-camera.webp',
  'https://clan.fastly.steamstatic.com/images/12590736/eab48d815a38025e2538e8934c898710de44d2dc.png',
  'https://t4.ftcdn.net/jpg/03/31/22/11/360_F_331221131_P006bsCdqfOJjIukE1vpj47duQhldw3s.jpg',
  'https://t4.ftcdn.net/jpg/16/09/27/97/360_F_1609279738_gWxGTxHWPawMmPfkuTJHElqHuGdNydlD.jpg',
];

interface MembersContextType {
  members: Member[];
  addMember: (member: Omit<Member, 'id' | 'avatar' | 'lastVisit' | 'gamesPlayed' | 'wins' | 'losses' | 'creditBalance'> & { isGuest?: boolean }) => Member;
  updateMember: (id: string, updates: Partial<Member>) => void;
  cameras: Camera[];
  addCamera: (camera: Omit<Camera, 'id'>) => void;
  updateCamera: (id: string, camera: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  cctvImages: string[];
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  clubSettings: ClubSettings;
  updateClubSettings: (settings: Partial<ClubSettings>) => void;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

// Pre-filled cameras with realistic labels and RTSP-style URLs
const initialCameras: Camera[] = [
  { 
    id: '1', 
    name: 'Table 1 Overhead', 
    url: 'rtsp://192.168.1.101:554/cam/table1/overhead', 
    status: 'online', 
    thumbnail: cctvImages[0] 
  },
  { 
    id: '2', 
    name: 'Table 2 Side View', 
    url: 'rtsp://192.168.1.102:554/cam/table2/side', 
    status: 'online', 
    thumbnail: cctvImages[1] 
  },
  { 
    id: '3', 
    name: 'Table 3 Overhead', 
    url: 'rtsp://192.168.1.103:554/cam/table3/overhead', 
    status: 'online', 
    thumbnail: cctvImages[2] 
  },
  { 
    id: '4', 
    name: 'Table 4 Wide Angle', 
    url: 'rtsp://192.168.1.104:554/cam/table4/wide', 
    status: 'online', 
    thumbnail: cctvImages[3] 
  },
  { 
    id: '5', 
    name: 'Entrance & Reception', 
    url: 'rtsp://192.168.1.105:554/cam/entrance', 
    status: 'offline', 
    thumbnail: cctvImages[4] 
  },
  { 
    id: '6', 
    name: 'Lounge & Bar Area', 
    url: 'rtsp://192.168.1.106:554/cam/lounge', 
    status: 'online', 
    thumbnail: cctvImages[5] 
  },
];

const initialInventory: InventoryItem[] = menuItems.map((item, index) => ({
  ...item,
  stock: Math.floor(Math.random() * 50) + 10,
}));

const defaultTablePricing: TablePricing = {
  perHour: 200,
  perMinute: 4,
  perFrame: 50,
  peakHourRate: 300,
  offPeakRate: 150,
  peakHoursStart: '18:00',
  peakHoursEnd: '23:00',
  defaultBillingMode: 'hourly',
};

// Initial individual table pricing for 10 tables
const initialIndividualTablePricing: IndividualTablePricing[] = [
  { tableNumber: 1, tableName: 'Table 01', tableType: 'Snooker', useGlobal: true },
  { tableNumber: 2, tableName: 'Table 02', tableType: 'Pool', useGlobal: true },
  { tableNumber: 3, tableName: 'Table 03', tableType: 'Snooker', useGlobal: true },
  { tableNumber: 4, tableName: 'Table 04', tableType: 'Pool', useGlobal: true },
  { tableNumber: 5, tableName: 'Table 05', tableType: 'Snooker', useGlobal: true },
  { tableNumber: 6, tableName: 'Table 06', tableType: '8-Ball', useGlobal: false, customPricing: { perHour: 250, perMinute: 5, perFrame: 60, peakHourRate: 350 } },
  { tableNumber: 7, tableName: 'Table 07', tableType: 'Snooker', useGlobal: true },
  { tableNumber: 8, tableName: 'Table 08', tableType: 'Pool', useGlobal: true },
  { tableNumber: 9, tableName: 'Table 09', tableType: 'Snooker', useGlobal: true },
  { tableNumber: 10, tableName: 'Table 10', tableType: '8-Ball', useGlobal: false, customPricing: { perHour: 180, perMinute: 3, perFrame: 40 } },
];

const defaultClubSettings: ClubSettings = {
  isOpen: true,
  upiQrCode: 'https://www.cashfree.com/static/mobileQRNew-00642feb35ee9eb8904163c9b6f5d201.webp',
  reminderTemplate: 'Hi {name}, your pending amount at CueMaster is ₹{amount}. Please clear it soon. Thanks!',
  tablePricing: defaultTablePricing,
  individualTablePricing: initialIndividualTablePricing,
};

export const MembersProvider = ({ children }: { children: ReactNode }) => {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [cameras, setCameras] = useState<Camera[]>(initialCameras);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [clubSettings, setClubSettings] = useState<ClubSettings>(defaultClubSettings);

  const addMember = (memberData: Omit<Member, 'id' | 'avatar' | 'lastVisit' | 'gamesPlayed' | 'wins' | 'losses' | 'creditBalance'> & { isGuest?: boolean }) => {
    const initials = memberData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const newMember: Member = {
      id: `member-${Date.now()}`,
      name: memberData.name,
      avatar: initials,
      membershipType: memberData.isGuest ? 'Guest' : memberData.membershipType || 'Regular',
      creditBalance: 0,
      lastVisit: new Date(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      phone: memberData.phone || '',
      email: memberData.email || '',
      isGuest: memberData.isGuest,
    };
    
    setMembers(prev => [...prev, newMember]);
    return newMember;
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(member => 
      member.id === id ? { ...member, ...updates } : member
    ));
  };

  const addCamera = (cameraData: Omit<Camera, 'id'>) => {
    const newCamera: Camera = {
      ...cameraData,
      id: `cam-${Date.now()}`,
    };
    setCameras(prev => [...prev, newCamera]);
  };

  const updateCamera = (id: string, cameraData: Partial<Camera>) => {
    setCameras(prev => prev.map(cam => 
      cam.id === id ? { ...cam, ...cameraData } : cam
    ));
  };

  const deleteCamera = (id: string) => {
    setCameras(prev => prev.filter(cam => cam.id !== id));
  };

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
    };
    setInventory(prev => [...prev, newItem]);
  };

  const updateInventoryItem = (id: string, itemData: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => 
      item.id === id ? { ...item, ...itemData } : item
    ));
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const updateClubSettings = (settings: Partial<ClubSettings>) => {
    setClubSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <MembersContext.Provider value={{ 
      members, 
      addMember, 
      updateMember, 
      cameras, 
      addCamera, 
      updateCamera, 
      deleteCamera,
      cctvImages,
      inventory,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      clubSettings,
      updateClubSettings,
    }}>
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => {
  const context = useContext(MembersContext);
  if (!context) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
};
