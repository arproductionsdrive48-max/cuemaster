import React, { useState } from 'react';
import { Tournament, TournamentBracketMatch } from '@/types';
import {
  Trophy, Swords, X, Activity, Share2, MessageSquare, Copy, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generateCommentary } from '@/services/smartGenerator';
import { useMembers } from '@/contexts/MembersContext';

interface LiveScoringProps {
  tournament: Tournament;
  onClose: () => void;
  onUpdateMatch: (matchId: string, updates: Partial<TournamentBracketMatch>) => void;
}

// Per-match highlight state (keyed by match id)
type MatchHighlight = {
  text: string;
  copied: boolean;
};

const LiveScoring: React.FC<LiveScoringProps> = ({ tournament, onClose, onUpdateMatch }) => {
  const { clubSettings } = useMembers();
  const matches: TournamentBracketMatch[] = tournament.bracket?.matches || [];
  const [highlights, setHighlights] = useState<Record<string, MatchHighlight>>({});

  // Filter for active matches with two real players (or completed if highlight exists)
  const activeMatches = matches.filter(m => {
    const isReady = (m.status === 'live' || m.status === 'pending') &&
      m.player1 && m.player2 &&
      m.player1 !== 'Bye' && m.player2 !== 'Bye';
    
    // Also include if match COMPLETED but we have a highlight to show
    const isCompletedWithHighlight = m.status === 'completed' && highlights[m.id];
    
    return isReady || isCompletedWithHighlight;
  }).sort((a, b) => a.matchNumber - b.matchNumber);

  const generateHighlight = (match: TournamentBracketMatch, newScore1: number, newScore2: number, winner?: string) => {
    const text = generateCommentary(
      [match.player1!, match.player2!],
      match.tableNumber,
      winner,
      { s1: newScore1, s2: newScore2 },
      match.bestOf,
      clubSettings.clubName
    );

    setHighlights(prev => ({ ...prev, [match.id]: { text, copied: false } }));
  };

  const handleScoreChange = (match: TournamentBracketMatch, player: 1 | 2, increment: boolean) => {
    const newScore1 = player === 1
      ? (increment ? match.score1 + 1 : Math.max(0, match.score1 - 1))
      : match.score1;
    const newScore2 = player === 2
      ? (increment ? match.score2 + 1 : Math.max(0, match.score2 - 1))
      : match.score2;

    const framesToWin = Math.ceil(match.bestOf / 2);
    const changedScore = player === 1 ? newScore1 : newScore2;

    let status: TournamentBracketMatch['status'] = 'live';
    let winner: string | undefined;

    if (changedScore >= framesToWin) {
      status = 'completed';
      winner = player === 1 ? match.player1! : match.player2!;
      toast.success(`🏆 ${winner} wins the match!`);
    }

    onUpdateMatch(match.id, {
      ...(player === 1 ? { score1: newScore1 } : { score2: newScore2 }),
      status,
      winner,
    });

    // Auto-generate highlight text after every score update
    generateHighlight({ ...match, score1: newScore1, score2: newScore2 }, newScore1, newScore2, winner);
  };
  
  const copyHighlight = async (matchId: string) => {
    let h = highlights[matchId];
    
    if (!h) {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;
      
      const framesToWin = Math.ceil(match.bestOf / 2);
      const isCompleted = match.status === 'completed';
      const winner = isCompleted ? (match.score1 > match.score2 ? match.player1 : match.player2) : undefined;
      
      const text = generateCommentary(
        [match.player1 || 'Player 1', match.player2 || 'Player 2'],
        match.tableNumber,
        winner || undefined,
        { s1: match.score1, s2: match.score2 },
        match.bestOf,
        clubSettings.clubName
      );
      
      h = { text, copied: false };
      setHighlights(prev => ({ ...prev, [matchId]: h }));
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(h.text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = h.text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setHighlights(prev => ({ ...prev, [matchId]: { ...h, copied: true } }));
      toast.success('Copied! Paste it in your WhatsApp group. 🎱');
      setTimeout(() => setHighlights(prev => ({ ...prev, [matchId]: { ...prev[matchId], copied: false } })), 2500);
    } catch {
      toast.error('Could not copy — try manually selecting the text.');
    }
  };

  if (activeMatches.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Active Matches</h3>
            <p className="text-muted-foreground">
              There are no matches currently ready for live scoring. Ensure the brackets are generated and players are assigned.
            </p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-medium transition-colors">
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#151515] border border-[#333] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#1A1A1A] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <Activity className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Live Scoring</h2>
              <p className="text-xs text-muted-foreground">{tournament.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {activeMatches.map(match => {
            const framesToWin = Math.ceil(match.bestOf / 2);
            const highlight = highlights[match.id];

            return (
              <div key={match.id} className="space-y-2">
                {/* Match Card */}
                <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm">
                  
                  {/* Match Info Strip */}
                  <div className="bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/5 px-4 py-3 md:w-48 flex md:flex-col justify-between md:justify-center items-center md:items-start text-xs font-medium uppercase tracking-wider text-gray-500">
                    <div>
                      <span className="block text-gray-400 mb-1">Match {match.matchNumber}</span>
                      <span className="text-[10px]">Round {match.round + 1}</span>
                    </div>
                    <div className="flex flex-col items-end md:items-start mt-2">
                      <span className="text-[10px]">Best of {match.bestOf}</span>
                      <span className="text-[10px] text-blue-400 mt-1">First to {framesToWin}</span>
                    </div>
                  </div>

                  {/* Score Controls */}
                  <div className="flex-1 p-4 grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                    
                    {/* Player 1 */}
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-lg mb-4 text-center truncate w-full">{match.player1}</span>
                      <div className="flex items-center gap-3 bg-black/40 rounded-2xl p-2 border border-white/5">
                        <button
                          onClick={() => handleScoreChange(match, 1, false)}
                          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl font-bold transition-colors active:scale-95"
                        >-</button>
                        <span className="text-4xl font-black w-12 text-center text-white font-mono">{match.score1}</span>
                        <button
                          onClick={() => handleScoreChange(match, 1, true)}
                          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl font-bold transition-colors active:scale-95"
                        >+</button>
                      </div>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center justify-center text-muted-foreground px-2">
                      <Swords className="w-5 h-5 mb-2 opacity-50" />
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">VS</span>
                    </div>

                    {/* Player 2 */}
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-lg mb-4 text-center truncate w-full">{match.player2}</span>
                      <div className="flex items-center gap-3 bg-black/40 rounded-2xl p-2 border border-white/5">
                        <button
                          onClick={() => handleScoreChange(match, 2, false)}
                          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl font-bold transition-colors active:scale-95"
                        >-</button>
                        <span className="text-4xl font-black w-12 text-center text-white font-mono">{match.score2}</span>
                        <button
                          onClick={() => handleScoreChange(match, 2, true)}
                          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl font-bold transition-colors active:scale-95"
                        >+</button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── Highlights Panel (auto-shown after any score update) ── */}
                {highlight && (
                  <div className="rounded-2xl bg-[#121212] border border-[hsl(var(--gold))]/20 overflow-hidden animate-fade-in-up">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                        <span className="text-xs font-semibold text-[hsl(var(--gold))]">
                          {highlights[match.id]?.text.includes('Winner') ? '🏆 Match Result — Ready to Share' : '📊 Live Score Update — Ready to Share'}
                        </span>
                      </div>
                      <button
                        onClick={() => setHighlights(prev => { const n = { ...prev }; delete n[match.id]; return n; })}
                        className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
                      >✕</button>
                    </div>

                    {/* Text preview */}
                    <pre className="px-4 py-3 text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">
                      {highlight.text}
                    </pre>

                    {/* Copy button */}
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => copyHighlight(match.id)}
                        className={cn(
                          'w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all',
                          highlight.copied
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                            : 'bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20'
                        )}
                      >
                        {highlight.copied
                          ? <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                          : <><MessageSquare className="w-4 h-4" /> Copy for WhatsApp</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiveScoring;
