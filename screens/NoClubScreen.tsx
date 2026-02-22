import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

const NoClubScreen = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-[hsl(var(--gold))]" />
      </div>

      <h1 className="text-2xl font-bold mb-2 text-center">No Club Linked</h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-8">
        Your account doesn't have a club associated with it yet. Contact your administrator to link your account to a club.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-secondary flex items-center justify-center gap-2 font-medium hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>

        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center gap-2 font-medium hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        If you believe this is an error, try signing out and logging in again.
      </p>
    </div>
  );
};

export default NoClubScreen;
