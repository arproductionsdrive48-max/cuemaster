import { Home, Table2, Trophy, Users, MoreHorizontal } from 'lucide-react';
import { TabType } from '@/types';
import { cn } from '@/lib/utils';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onMoreClick: () => void;
}

const tabs: { id: TabType | 'more'; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'tables', icon: Table2, label: 'Tables' },
  { id: 'events', icon: Trophy, label: 'Events' },
  { id: 'members', icon: Users, label: 'Players' },
  { id: 'more', icon: MoreHorizontal, label: 'More' },
];

const TabBar = ({ activeTab, onTabChange, onMoreClick }: TabBarProps) => {
  return (
    <nav className="tab-bar pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          const isMore = id === 'more';
          return (
            <button
              key={id}
              onClick={() => isMore ? onMoreClick() : onTabChange(id as TabType)}
              className={cn(
                'flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200',
                isActive 
                  ? 'text-[hsl(var(--gold))]' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn(
                'w-6 h-6 transition-all duration-200',
                isActive && 'scale-110'
              )} />
              <span className={cn(
                'text-[10px] mt-0.5 font-medium',
                isActive ? 'opacity-100' : 'opacity-70'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
