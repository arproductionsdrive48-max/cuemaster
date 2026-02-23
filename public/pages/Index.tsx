import React, { useState } from 'react';
import { TabType } from '@/types';
import { MembersProvider, useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import TabBar from '@/components/layout/TabBar';
import MoreSheet from '@/components/layout/MoreSheet';
import LoginScreen from '@/screens/LoginScreen';
import NoClubScreen from '@/screens/NoClubScreen';
import HomeScreen from '@/screens/HomeScreen';
import TablesScreen from '@/screens/TablesScreen';
import MembersScreen from '@/screens/MembersScreen';
import EventsScreen from '@/screens/EventsScreen';
import BookingsScreen from '@/screens/BookingsScreen';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import ReportsScreen from '@/screens/ReportsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import HelpScreen from '@/screens/HelpScreen';
import PrivacyScreen from '@/screens/PrivacyScreen';
import PromotionsScreen from '@/screens/PromotionsScreen';
import DebugScreen from '@/screens/DebugScreen';

/** Gate component — handles auth + restoring state BEFORE MembersProvider */
const AuthGate = () => {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Restoring session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => {/* AuthContext handles via onAuthStateChange */}} />;
  }

  // Authenticated → render MembersProvider + app content
  return (
    <MembersProvider>
      <AppErrorBoundary>
        <AppContent />
      </AppErrorBoundary>
    </MembersProvider>
  );
};

/** Error boundary to catch context/hook errors and show recovery UI instead of blank screen */
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[CueMaster] AppErrorBoundary caught:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-8 text-center">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground">The app encountered an error during loading.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Main app content — only rendered when authenticated AND inside MembersProvider */
const AppContent = () => {
  const { clubIdErrorType, isLoading } = useMembers();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [moreScreen, setMoreScreen] = useState<string | null>(null);

  // Show loading while club_id resolves
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading club data…</p>
      </div>
    );
  }

  // No club linked — show friendly screen instead of error overlay
  if (clubIdErrorType === 'no-club') {
    return <NoClubScreen />;
  }

  const handleNavigate = (tab: 'tables' | 'events' | 'members') => {
    setActiveTab(tab);
  };

  const handleMoreNavigate = (screen: string) => {
    setMoreScreen(screen);
  };

  const renderScreen = () => {
    if (moreScreen) {
      switch (moreScreen) {
        case 'bookings':   return <BookingsScreen />;
        case 'reports':    return <ReportsScreen />;
        case 'settings':   return <SettingsScreen />;
        case 'help':       return <HelpScreen onBack={() => setMoreScreen(null)} />;
        case 'privacy':    return <PrivacyScreen onBack={() => setMoreScreen(null)} />;
        case 'promotions': return <PromotionsScreen />;
        case 'debug':      return <DebugScreen onBack={() => setMoreScreen(null)} />;
      }
    }

    switch (activeTab) {
      case 'home':    return <HomeScreen onNavigate={handleNavigate} />;
      case 'tables':  return <TablesScreen />;
      case 'events':  return <EventsScreen />;
      case 'members': return <MembersScreen />;
      default:        return <HomeScreen onNavigate={handleNavigate} />;
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

const Index = () => <AuthGate />;

export default Index;
