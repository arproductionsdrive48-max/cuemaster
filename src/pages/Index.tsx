import { useState } from 'react';
import { TabType } from '@/types';
import { MembersProvider } from '@/contexts/MembersContext';
import TabBar from '@/components/layout/TabBar';
import MoreSheet from '@/components/layout/MoreSheet';
import LoginScreen from '@/screens/LoginScreen';
import HomeScreen from '@/screens/HomeScreen';
import TablesScreen from '@/screens/TablesScreen';
import MembersScreen from '@/screens/MembersScreen';
import EventsScreen from '@/screens/EventsScreen';
import BookingsScreen from '@/screens/BookingsScreen';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import CCTVScreen from '@/screens/CCTVScreen';
import ReportsScreen from '@/screens/ReportsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import HelpScreen from '@/screens/HelpScreen';
import PrivacyScreen from '@/screens/PrivacyScreen';

const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [moreScreen, setMoreScreen] = useState<string | null>(null);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleNavigate = (tab: 'tables' | 'events' | 'members') => {
    setActiveTab(tab);
  };

  const handleMoreNavigate = (screen: string) => {
    setMoreScreen(screen);
  };

  const renderScreen = () => {
    // Handle "More" screens
    if (moreScreen) {
      switch (moreScreen) {
        case 'bookings':
          return <BookingsScreen />;
        case 'cctv':
          return <CCTVScreen />;
        case 'reports':
          return <ReportsScreen />;
        case 'settings':
          return <SettingsScreen />;
        case 'help':
          return <HelpScreen onBack={() => setMoreScreen(null)} />;
        case 'privacy':
          return <PrivacyScreen onBack={() => setMoreScreen(null)} />;
      }
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;
      case 'tables':
        return <TablesScreen />;
      case 'events':
        return <EventsScreen />;
      case 'members':
        return <MembersScreen />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {renderScreen()}
      </main>
      <TabBar 
        activeTab={activeTab} 
        onTabChange={(tab) => { setMoreScreen(null); setActiveTab(tab); }}
        onMoreClick={() => setShowMoreSheet(true)}
      />
      <MoreSheet 
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        onNavigate={handleMoreNavigate}
      />
    </div>
  );
};

const Index = () => {
  return (
    <MembersProvider>
      <AppContent />
    </MembersProvider>
  );
};

export default Index;
