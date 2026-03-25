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
    <nav className="tab-bar pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          const isMore = id === 'more';
          return (
            <button
              key={id}
              onClick={() => isMore ? onMoreClick() : onTabChange(id as TabType)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 relative"
            >
              {/* Active glow pill */}
              {isActive && (
                <span className="absolute top-2 w-10 h-1 rounded-full bg-[hsl(var(--gold))] opacity-80 shadow-[0_0_8px_hsl(var(--gold)/0.8)]" />
              )}
              <div className={cn(
                'w-10 h-9 flex items-center justify-center rounded-xl transition-all duration-200 mt-1',
                isActive ? 'bg-[hsl(var(--gold))]/10' : ''
              )}>
                <Icon className={cn(
                  'w-5 h-5 transition-all duration-200',
                  isActive ? 'text-[hsl(var(--gold))] scale-110' : 'text-gray-500'
                )} />
              </div>
              <span className={cn(
                'text-[9px] font-semibold uppercase tracking-wider transition-all duration-200',
                isActive ? 'text-[hsl(var(--gold))]' : 'text-gray-600'
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
