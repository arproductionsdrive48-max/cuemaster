import React, { useState, useEffect } from 'react';
import { Tournament, TournamentBracketMatch } from '@/types';
import { Trophy, Swords, CalendarClock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BracketViewProps {
  tournament: Tournament;
  onUpdateMatch?: (matchId: string, updates: Partial<TournamentBracketMatch>) => void;
  onGenerateBracket?: () => void;
}

const BracketView: React.FC<BracketViewProps> = ({ tournament, onUpdateMatch, onGenerateBracket }) => {
  const matches: TournamentBracketMatch[] = tournament.bracket?.matches || [];
  
  // Calculate how many rounds based on matches
  const numRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) + 1 : 0;
  
  const generateRounds = () => {
    const rounds: TournamentBracketMatch[][] = [];
    for (let i = 0; i < numRounds; i++) {
      rounds.push(matches.filter(m => m.round === i).sort((a, b) => a.matchNumber - b.matchNumber));
    }
    return rounds;
  };

  const rounds = generateRounds();

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-background/50 rounded-2xl border border-border/50">
        <Trophy className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-bold mb-2">No Brackets Generated</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Register players first, then generate the bracket to automatically create the single elimination tree.
        </p>
        <button
          onClick={onGenerateBracket}
          disabled={tournament.registeredPlayers.length < 2 || tournament.status === 'completed'}
          className={cn(
            "px-6 py-3 rounded-xl font-bold transition-all",
            tournament.registeredPlayers.length < 2
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : "bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] shadow-lg hover:opacity-90 active:scale-95"
          )}
        >
          {tournament.registeredPlayers.length < 2 ? 'Need at least 2 players' : 'Generate Bracket'}
        </button>
      </div>
    );
  }

  // Bracket SVG Curve generation helper
  const renderConnector = (roundIndex: number, matchIndex: number) => {
    if (roundIndex === rounds.length - 1) return null; // No connector for the final
    // Simple visual connectors using CSS borders
    return (
      <div className="absolute top-1/2 -right-6 w-6 border-b border-white/20 z-0"></div>
    );
  };

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1) return 'Final';
    if (roundIndex === totalRounds - 2) return 'Semi-Finals';
    if (roundIndex === totalRounds - 3) return 'Quarter-Finals';
    return `Round ${roundIndex + 1}`;
  };

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-8 pt-4">
      <div className="flex gap-12 min-w-max px-4">
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className="flex flex-col gap-6 justify-center" style={{ width: '280px' }}>
            <h4 className="text-center font-bold text-gray-400 uppercase tracking-widest text-sm mb-4">
              {getRoundName(roundIndex, rounds.length)}
            </h4>
            
            {roundMatches.map((match, matchIndex) => (
              <div 
                key={match.id} 
                className="relative group w-full"
              >
                {/* Match Card */}
                <div className={cn(
                  "relative z-10 flex flex-col rounded-xl border overflow-hidden transition-all duration-300",
                  match.status === 'live' ? "bg-gradient-to-r from-background to-background/50 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : 
                  match.status === 'completed' ? "bg-secondary/40 border-white/5 opacity-80" : 
                  "bg-[#1A1A1A] border-[#333] hover:border-white/20"
                )}>
                  
                  {/* Match Header */}
                  <div className="flex justify-between items-center px-3 py-1.5 bg-white/[0.02] border-b border-white/5 text-[10px] font-bold tracking-wider uppercase text-gray-500">
                    <span>Match {match.matchNumber}</span>
                    {match.status === 'live' && (
                      <span className="text-red-400 flex items-center animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span> LIVE
                      </span>
                    )}
                    {match.status === 'completed' && <span>Done</span>}
                  </div>

                  {/* Player 1 Target */}
                  <div className={cn(
                    "flex items-center justify-between px-4 py-3 border-b border-white/5",
                    match.winner === match.player1 && match.status === 'completed' ? "bg-white/5" : ""
                  )}>
                    <span className={cn(
                      "font-medium truncate pr-4",
                      !match.player1 ? "text-gray-600 italic" : 
                      match.winner === match.player1 && match.status === 'completed' ? "text-[hsl(var(--gold))] font-bold" : "text-gray-200"
                    )}>
                      {match.player1 || 'TBD'}
                    </span>
                    <span className={cn(
                      "font-mono font-bold text-lg",
                      match.winner === match.player1 && match.status === 'completed' ? "text-[hsl(var(--gold))]" : "text-gray-400"
                    )}>
                      {match.score1}
                    </span>
                  </div>

                  {/* Player 2 Target */}
                  <div className={cn(
                    "flex items-center justify-between px-4 py-3",
                    match.winner === match.player2 && match.status === 'completed' ? "bg-white/5" : ""
                  )}>
                    <span className={cn(
                      "font-medium truncate pr-4",
                      !match.player2 ? "text-gray-600 italic" : 
                      match.winner === match.player2 && match.status === 'completed' ? "text-[hsl(var(--gold))] font-bold" : "text-gray-200"
                    )}>
                      {match.player2 || 'TBD'}
                    </span>
                    <span className={cn(
                      "font-mono font-bold text-lg",
                      match.winner === match.player2 && match.status === 'completed' ? "text-[hsl(var(--gold))]" : "text-gray-400"
                    )}>
                      {match.score2}
                    </span>
                  </div>
                </div>

                {/* Right Connector Line */}
                {renderConnector(roundIndex, matchIndex)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketView;
