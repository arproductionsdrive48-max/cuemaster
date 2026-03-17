import React from 'react';
import { Tournament, TournamentBracketMatch } from '@/types';
import { Trophy, X } from 'lucide-react';
import BracketView from './BracketView';

interface BracketModalProps {
  tournament: Tournament;
  onClose: () => void;
  onUpdateMatch?: (matchId: string, updates: Partial<TournamentBracketMatch>) => void;
  onGenerateBracket?: () => void;
}

const BracketModal: React.FC<BracketModalProps> = ({ tournament, onClose, onUpdateMatch, onGenerateBracket }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151515] border border-[#333] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#1A1A1A] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center border border-[hsl(var(--gold))]/30">
              <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tournament Bracket</h2>
              <p className="text-xs text-muted-foreground">{tournament.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
           {/* Subtle grid background for the brackets area */}
           <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
           
           <div className="absolute inset-0 overflow-auto">
             <BracketView 
               tournament={tournament} 
               onUpdateMatch={onUpdateMatch}
               onGenerateBracket={onGenerateBracket}
             />
           </div>
        </div>
      </div>
    </div>
  );
};

export default BracketModal;
