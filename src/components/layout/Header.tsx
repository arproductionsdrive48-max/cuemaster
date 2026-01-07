import { Circle } from 'lucide-react';
import { useMembers } from '@/contexts/MembersContext';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  showClubStatus?: boolean;
  rightContent?: React.ReactNode;
}

const Header = ({ title, showClubStatus = false, rightContent }: HeaderProps) => {
  const { clubSettings } = useMembers();

  return (
    <header className="pt-6 pb-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {showClubStatus && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
              clubSettings.isOpen 
                ? "bg-available/20 border-available/30" 
                : "bg-primary/20 border-primary/30"
            )}>
              <Circle className={cn(
                "w-2 h-2",
                clubSettings.isOpen 
                  ? "fill-available text-available animate-pulse" 
                  : "fill-primary text-primary"
              )} />
              <span className={cn(
                "text-xs font-semibold",
                clubSettings.isOpen ? "text-available" : "text-primary"
              )}>
                {clubSettings.isOpen ? 'Club Open' : 'Club Closed'}
              </span>
            </div>
          )}
        </div>
        {rightContent}
      </div>
    </header>
  );
};

export default Header;
