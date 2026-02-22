import { useState, useCallback, useEffect, useRef } from 'react';
import { Tournament, TournamentBracketMatch } from '@/types';
import PlayerStatsPopup from './PlayerStatsPopup';
import {
  ArrowLeft, Calendar, Trophy, Users, MapPin, Video,
  UserPlus, Edit, IndianRupee, X, Plus, Minus, Award, Link, Play,
  Shuffle, CheckCircle, Clock, Flag, GripVertical, Star, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useMembers } from '@/contexts/MembersContext';

interface TournamentDetailModalProps {
  tournament: Tournament;
  onClose: () => void;
  onRegister: () => void;
  onUpdate?: (updated: Tournament) => void;
}

type TabType = 'overview' | 'bracket' | 'leaderboard' | 'matches';

const BEST_OF_OPTIONS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

// Helper: wins needed to win a best-of-N match
const winsNeeded = (bestOf: number) => Math.ceil(bestOf / 2);

// Generate single-elimination bracket from player list
const generateBracketFromPlayers = (players: string[], tables: number[], defaultBestOf = 7): TournamentBracketMatch[] => {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: TournamentBracketMatch[] = [];
  const matchCount = Math.pow(2, Math.ceil(Math.log2(Math.max(shuffled.length, 2))));
  const pairsInRound0 = matchCount / 2;

  // Pad with byes
  while (shuffled.length < matchCount) shuffled.push('BYE');

  let id = 1;
  for (let i = 0; i < pairsInRound0; i++) {
    const p1 = shuffled[i * 2];
    const p2 = shuffled[i * 2 + 1];
    // Auto-advance BYE matches
    const isBye = p1 === 'BYE' || p2 === 'BYE';
    const realPlayer = p1 === 'BYE' ? null : p1;
    const realPlayer2 = p2 === 'BYE' ? null : p2;
    matches.push({
      id: `m${id++}`,
      round: 0,
      matchNumber: i,
      player1: realPlayer,
      player2: isBye ? null : realPlayer2,
      score1: 0,
      score2: 0,
      bestOf: defaultBestOf,
      tableNumber: tables[i % Math.max(tables.length, 1)] ?? 1,
      status: isBye ? 'completed' : 'pending',
      winner: isBye ? (realPlayer ?? undefined) : undefined,
    });
  }

  // Subsequent rounds (placeholders)
  let roundMatches = pairsInRound0;
  let round = 1;
  while (roundMatches > 1) {
    roundMatches = roundMatches / 2;
    for (let i = 0; i < roundMatches; i++) {
      matches.push({
        id: `m${id++}`,
        round,
        matchNumber: i,
        player1: null,
        player2: null,
        score1: 0,
        score2: 0,
        bestOf: defaultBestOf,
        tableNumber: tables[i % Math.max(tables.length, 1)] ?? 1,
        status: 'pending',
      });
    }
    round++;
  }

  // Pre-advance BYE winners into next round
  const byeMatches = matches.filter(m => m.status === 'completed' && m.winner);
  byeMatches.forEach(byeMatch => {
    const nextRoundMatches = matches.filter(m => m.round === byeMatch.round + 1);
    const nextMatchIndex = Math.floor(byeMatch.matchNumber / 2);
    const nextMatch = nextRoundMatches.find(m => m.matchNumber === nextMatchIndex);
    if (nextMatch && byeMatch.winner) {
      const slot = byeMatch.matchNumber % 2 === 0 ? 'player1' : 'player2';
      nextMatch[slot] = byeMatch.winner;
    }
  });

  return matches;
};

const getRoundName = (round: number, totalRounds: number) => {
  if (round === totalRounds - 1) return 'Final';
  if (round === totalRounds - 2) return 'Semi Finals';
  if (round === totalRounds - 3) return 'Quarter Finals';
  return `Round ${round + 1}`;
};

const TournamentDetailModal = ({ tournament, onClose, onRegister, onUpdate }: TournamentDetailModalProps) => {
  const { tournaments, updateMember, members } = useMembers();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [editingOverview, setEditingOverview] = useState(false);
  const [editEntryFee, setEditEntryFee] = useState(tournament.entryFee);
  const [editMaxPlayers, setEditMaxPlayers] = useState(tournament.maxPlayers);
  const [scoreModal, setScoreModal] = useState<TournamentBracketMatch | null>(null);
  const [breakInputModal, setBreakInputModal] = useState<{ match: TournamentBracketMatch; winner: string } | null>(null);
  const [break1, setBreak1] = useState('');
  const [break2, setBreak2] = useState('');
  const [bestOfModal, setBestOfModal] = useState<string | null>(null); // matchId
  const [customBestOfInput, setCustomBestOfInput] = useState('');
  const [liveLinksModal, setLiveLinksModal] = useState<TournamentBracketMatch | null>(null);
  const [liveLinkText, setLiveLinkText] = useState('');
  const [trophyPlayer, setTrophyPlayer] = useState<string | null>(null);
  const [trophyName, setTrophyName] = useState('');
  const [playerTrophies, setPlayerTrophies] = useState<Record<string, string[]>>(tournament.trophies ?? {});
  // Bracket is loaded from DB (tournament.bracket) or generated locally
  const [localTournament, setLocalTournament] = useState<Tournament>(tournament);
  const [bracket, setBracket] = useState<TournamentBracketMatch[]>(
    (tournament as any).bracket ?? []
  );
  const [bracketGenerated, setBracketGenerated] = useState(
    !!((tournament as any).bracket?.length) || tournament.status === 'in_progress'
  );
  const [swapMode, setSwapMode] = useState<{ matchId: string; slot: 1 | 2 } | null>(null);
  const [endTournamentModal, setEndTournamentModal] = useState(false);
  const [defaultBestOf, setDefaultBestOf] = useState(7);
  const [customDefaultBestOf, setCustomDefaultBestOf] = useState('');
  const bracketSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-persist bracket to Supabase whenever it changes (debounced)
  useEffect(() => {
    if (!bracketGenerated || bracket.length === 0) return;
    if (bracketSaveTimer.current) clearTimeout(bracketSaveTimer.current);
    bracketSaveTimer.current = setTimeout(() => {
      persistUpdate(localTournament, bracket);
    }, 800);
    return () => { if (bracketSaveTimer.current) clearTimeout(bracketSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'bracket', label: 'Bracket' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'matches', label: 'Matches' },
  ];

  const totalRounds = bracket.length > 0
    ? Math.max(...bracket.map(m => m.round)) + 1
    : 0;

  // Persist bracket into tournament object so DB saves it
  const persistUpdate = (updatedTournament: Tournament, updatedBracket: TournamentBracketMatch[]) => {
    const withBracket = { ...updatedTournament, bracket: updatedBracket } as Tournament;
    if (onUpdate) onUpdate(withBracket);
  };

  const handleSaveOverview = () => {
    const updated = { ...localTournament, entryFee: editEntryFee, maxPlayers: editMaxPlayers };
    setLocalTournament(updated);
    persistUpdate(updated, bracket);
    setEditingOverview(false);
    toast.success('Tournament updated!');
  };

  const handleStartTournament = () => {
    if (localTournament.registeredPlayers.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }
    const newBracket = generateBracketFromPlayers(
      localTournament.registeredPlayers,
      localTournament.tables ?? [1],
      defaultBestOf
    );
    setBracket(newBracket);
    setBracketGenerated(true);
    const updated = { ...localTournament, status: 'in_progress' as const };
    setLocalTournament(updated);
    persistUpdate(updated, newBracket);
    toast.success('🏆 Tournament started! Bracket generated.');
    setActiveTab('bracket');
  };

  const handleRegenerateDraws = () => {
    if (!bracketGenerated) return;
    const newBracket = generateBracketFromPlayers(
      localTournament.registeredPlayers,
      localTournament.tables ?? [1],
      defaultBestOf
    );
    setBracket(newBracket);
    persistUpdate(localTournament, newBracket);
    toast.success('Bracket re-drawn!');
  };

  // Swap a player into a match slot
  const handleSwapPlayer = (targetMatchId: string, targetSlot: 1 | 2, newPlayer: string) => {
    setBracket(prev => {
      const newBracket = prev.map(m => ({ ...m }));
      const targetMatch = newBracket.find(m => m.id === targetMatchId);
      if (!targetMatch) return prev;

      const oldPlayer = targetSlot === 1 ? targetMatch.player1 : targetMatch.player2;

      // If the new player is already in another match in round 0, swap them
      const sourceMatch = newBracket.find(m =>
        m.round === 0 && (m.player1 === newPlayer || m.player2 === newPlayer)
      );
      if (sourceMatch) {
        if (sourceMatch.player1 === newPlayer) sourceMatch.player1 = oldPlayer;
        else sourceMatch.player2 = oldPlayer;
      }

      if (targetSlot === 1) targetMatch.player1 = newPlayer;
      else targetMatch.player2 = newPlayer;

      return newBracket;
    });
    setSwapMode(null);
    toast.success('Players swapped!');
  };

  const handleUpdateScore = (matchId: string, player: 1 | 2, delta: number) => {
    setBracket(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      const maxWins = winsNeeded(m.bestOf);
      // Block if someone already reached the winning score
      if (m.score1 >= maxWins || m.score2 >= maxWins) return m;
      const newS1 = player === 1 ? Math.max(0, Math.min(m.score1 + delta, maxWins)) : m.score1;
      const newS2 = player === 2 ? Math.max(0, Math.min(m.score2 + delta, maxWins)) : m.score2;
      return { ...m, score1: newS1, score2: newS2 };
    }));
  };

  const handleChangeBestOf = (matchId: string, bestOf: number) => {
    setBracket(prev => prev.map(m => m.id === matchId ? { ...m, bestOf } : m));
    setBestOfModal(null);
    setCustomBestOfInput('');
    toast.success(`Best of ${bestOf} set!`);
  };

  const handleCompleteMatch = (match: TournamentBracketMatch) => {
    if (match.score1 === 0 && match.score2 === 0) {
      toast.error('Enter scores before completing the match');
      return;
    }
    const winner = match.score1 > match.score2
      ? match.player1
      : match.score2 > match.score1
        ? match.player2
        : null;

    if (!winner) {
      toast.error('Match is tied — adjust scores to determine a winner');
      return;
    }

    // Show break input modal before completing
    setBreak1('');
    setBreak2('');
    setBreakInputModal({ match, winner });
    setScoreModal(null);
  };

  const handleConfirmComplete = () => {
    if (!breakInputModal) return;
    const { match, winner } = breakInputModal;
    const b1 = parseInt(break1) || 0;
    const b2 = parseInt(break2) || 0;

    // Update highest break for each player if new record
    [{ name: match.player1, breakVal: b1 }, { name: match.player2, breakVal: b2 }].forEach(({ name, breakVal }) => {
      if (!name || breakVal <= 0) return;
      const member = members.find(m => m.name === name);
      if (member && breakVal > (member.highestBreak ?? 0)) {
        updateMember(member.id, { highestBreak: breakVal });
      }
    });

    setBracket(prev => {
      const updated = prev.map(m =>
        m.id === match.id ? { ...m, status: 'completed' as const, winner } : m
      );
      const nextRoundMatches = updated.filter(m => m.round === match.round + 1);
      const nextMatchIndex = Math.floor(match.matchNumber / 2);
      const nextMatch = nextRoundMatches.find(m => m.matchNumber === nextMatchIndex);
      if (nextMatch) {
        const slot = match.matchNumber % 2 === 0 ? 'player1' : 'player2';
        return updated.map(m =>
          m.id === nextMatch.id ? { ...m, [slot]: winner } : m
        );
      }
      return updated;
    });

    toast.success(`✅ ${winner} advances!`);
    setBreakInputModal(null);
  };

  const handleStartMatch = (matchId: string) => {
    setBracket(prev => {
      const match = prev.find(m => m.id === matchId);
      if (!match) return prev;
      // BYE: only one player — auto-complete with that player as winner
      if (match.player1 && !match.player2) {
        const winner = match.player1;
        const updated = prev.map(m => m.id === matchId ? { ...m, status: 'completed' as const, winner } : m);
        // Advance winner
        const nextRoundMatches = updated.filter(m => m.round === match.round + 1);
        const nextMatchIndex = Math.floor(match.matchNumber / 2);
        const nextMatch = nextRoundMatches.find(m => m.matchNumber === nextMatchIndex);
        if (nextMatch) {
          const slot = match.matchNumber % 2 === 0 ? 'player1' : 'player2';
          return updated.map(m => m.id === nextMatch.id ? { ...m, [slot]: winner } : m);
        }
        return updated;
      }
      if (!match.player1 && match.player2) {
        const winner = match.player2;
        const updated = prev.map(m => m.id === matchId ? { ...m, status: 'completed' as const, winner } : m);
        const nextRoundMatches = updated.filter(m => m.round === match.round + 1);
        const nextMatchIndex = Math.floor(match.matchNumber / 2);
        const nextMatch = nextRoundMatches.find(m => m.matchNumber === nextMatchIndex);
        if (nextMatch) {
          const slot = match.matchNumber % 2 === 0 ? 'player1' : 'player2';
          return updated.map(m => m.id === nextMatch.id ? { ...m, [slot]: winner } : m);
        }
        return updated;
      }
      return prev.map(m => m.id === matchId ? { ...m, status: 'live' as const } : m);
    });
    const match = bracket.find(m => m.id === matchId);
    if (match && (!match.player1 || !match.player2)) {
      const winner = match.player1 ?? match.player2;
      toast.success(`✅ ${winner} auto-advances (BYE)!`);
    } else {
      toast.success('Match is now LIVE!');
    }
  };

  // Auto-derive winners from bracket results
  const finalMatch = bracket.find(m => m.round === totalRounds - 1 && m.status === 'completed');
  const sfMatches = bracket.filter(m => m.round === totalRounds - 2 && m.status === 'completed');
  const derivedChampion = finalMatch?.winner ?? null;
  const derivedRunnerUp = finalMatch
    ? (finalMatch.winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1)
    : null;
  const derivedThirdPlace = sfMatches
    .map(m => (m.winner === m.player1 ? m.player2 : m.player1))
    .filter((p): p is string => !!p && p !== derivedChampion && p !== derivedRunnerUp);

  const handleEndTournament = () => {
    if (!derivedChampion) {
      toast.error('The final match has not been completed yet');
      return;
    }

    const trophiesUpdate = { ...playerTrophies };
    // Champion
    trophiesUpdate[derivedChampion] = [...(trophiesUpdate[derivedChampion] ?? []), `🏆 Champion — ${localTournament.name}`];
    // Runner-up
    if (derivedRunnerUp) {
      trophiesUpdate[derivedRunnerUp] = [...(trophiesUpdate[derivedRunnerUp] ?? []), `🥈 Runner-up — ${localTournament.name}`];
    }
    // 3rd place
    derivedThirdPlace.forEach(p => {
      trophiesUpdate[p] = [...(trophiesUpdate[p] ?? []), `🥉 3rd Place — ${localTournament.name}`];
    });

    setPlayerTrophies(trophiesUpdate);

    // Update member profiles in context
    [derivedChampion, derivedRunnerUp, ...derivedThirdPlace].filter(Boolean).forEach((playerName, idx) => {
      const member = members.find(m => m.name === playerName);
      if (member) {
        updateMember(member.id, {
          wins: member.wins + (idx === 0 ? 1 : 0),
        });
      }
    });

    const updated: Tournament = {
      ...localTournament,
      status: 'completed',
      winner: derivedChampion,
      trophies: trophiesUpdate,
    };
    setLocalTournament(updated);
    persistUpdate(updated, bracket);
    setEndTournamentModal(false);
    toast.success(`🏆 ${derivedChampion} is the Champion!`);
  };

  const handleAwardTrophy = (player: string) => {
    if (!trophyName.trim()) { toast.error('Enter a trophy name'); return; }
    const updated = { ...playerTrophies, [player]: [...(playerTrophies[player] ?? []), trophyName] };
    setPlayerTrophies(updated);
    const updatedT: Tournament = { ...localTournament, trophies: updated };
    setLocalTournament(updatedT);
    persistUpdate(updatedT, bracket);
    toast.success(`Trophy awarded to ${player}!`);
    setTrophyPlayer(null);
    setTrophyName('');
  };

  const liveMatches = bracket.filter(m => m.status === 'live');
  const pendingMatches = bracket.filter(m => m.status === 'pending' && m.player1 && m.player2);
  const completedBracketMatches = bracket.filter(m => m.status === 'completed');


  const roundNumbers = [...new Set(bracket.map(m => m.round))].sort((a, b) => a - b);

  // All players in round-0 for swap picker
  const round0Players = bracket
    .filter(m => m.round === 0)
    .flatMap(m => [m.player1, m.player2])
    .filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-accent/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Manage Tournament
          </span>
          <div className="w-9" />
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-64px)] pb-32">
        {/* Hero */}
        <div className="relative h-48 bg-gradient-to-br from-secondary via-background to-secondary">
          {localTournament.image && (
            <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${localTournament.image})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {localTournament.status === 'in_progress' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-live/20 text-live flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" /> IN PROGRESS
                </span>
              )}
              {localTournament.status === 'completed' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-available/20 text-available flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> COMPLETED
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]">
                {localTournament.type}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-1">{localTournament.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(localTournament.date, 'MMM d, yyyy')}
                {localTournament.startTime && (
                  <span className="flex items-center gap-1 ml-1">
                    <Clock className="w-3.5 h-3.5" /> {localTournament.startTime}
                  </span>
                )}
              </span>
              {localTournament.prizePool && (
                <span className="flex items-center gap-1 text-[hsl(var(--gold))]">
                  <Trophy className="w-4 h-4" /> ₹{localTournament.prizePool.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {localTournament.registeredPlayers.length}/{localTournament.maxPlayers} Players
              {localTournament.winner && (
                <span className="ml-3 text-[hsl(var(--gold))] font-semibold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" /> {localTournament.winner}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors relative',
                  activeTab === tab.id ? 'text-[hsl(var(--gold))]' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--gold))]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Winner banner */}
              {localTournament.winner && (
                <div className="glass-card p-4 border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/5 text-center">
                  <Trophy className="w-8 h-8 text-[hsl(var(--gold))] mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Champion</p>
                  <p className="text-xl font-bold text-[hsl(var(--gold))]">{localTournament.winner}</p>
                </div>
              )}

              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">About</h3>
                  <button onClick={() => setEditingOverview(!editingOverview)} className="p-1.5 rounded-lg hover:bg-accent/30">
                    <Edit className="w-4 h-4 text-[hsl(var(--gold))]" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{localTournament.description}</p>
              </div>

              <div className="glass-card p-4">
                <h3 className="font-semibold mb-2">Location</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {localTournament.location}
                </div>
              </div>

              {editingOverview ? (
                <div className="glass-card p-4 space-y-4 border border-[hsl(var(--gold))]/30">
                  <h3 className="font-semibold text-[hsl(var(--gold))]">Edit Tournament</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Entry Fee (₹)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--gold))]" />
                        <input type="number" value={editEntryFee} onChange={e => setEditEntryFee(Number(e.target.value))}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Max Players</label>
                      <input type="number" value={editMaxPlayers} onChange={e => setEditMaxPlayers(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveOverview} className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold text-sm">Save Changes</button>
                    <button onClick={() => setEditingOverview(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-2">Entry Fee</h3>
                  <p className="text-2xl font-bold text-[hsl(var(--gold))]">₹{localTournament.entryFee.toLocaleString()}</p>
                  {localTournament.prizePool && (
                    <p className="text-sm text-muted-foreground mt-1">Prize Pool: ₹{localTournament.prizePool.toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Prize Distribution */}
              {localTournament.prizeDistribution && localTournament.prizeDistribution.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-[hsl(var(--gold))]" /> Prize Distribution</h3>
                  <div className="space-y-2">
                    {localTournament.prizeDistribution.filter(p => p.amount > 0).map(prize => (
                      <div key={prize.place} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-sm font-medium">
                          {prize.place === 1 ? '🥇 1st Place' : prize.place === 2 ? '🥈 2nd Place' : prize.place === 3 ? '🥉 3rd Place' : `${prize.place}th Place`}
                          {localTournament.winner && prize.place === 1 && <span className="ml-2 text-xs text-[hsl(var(--gold))]">• {localTournament.winner}</span>}
                        </span>
                        <span className="font-bold text-[hsl(var(--gold))]">₹{prize.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BRACKET ── */}
          {activeTab === 'bracket' && (
            <div className="space-y-4">
              {!bracketGenerated ? (
                <div className="glass-card p-6 text-center">
                  <Trophy className="w-12 h-12 text-[hsl(var(--gold))]/40 mx-auto mb-3" />
                  <p className="font-semibold mb-1">No bracket yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start the tournament to auto-generate the bracket from registered players.
                  </p>

                  {/* Default Best of selector */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Default Best Of (all matches)</p>
                    <div className="flex flex-wrap gap-2 justify-center mb-2">
                      {BEST_OF_OPTIONS.map(n => (
                        <button
                          key={n}
                          onClick={() => { setDefaultBestOf(n); setCustomDefaultBestOf(''); }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                            defaultBestOf === n && !customDefaultBestOf
                              ? 'bg-[hsl(var(--gold))] text-black border-transparent'
                              : 'border-border/50 bg-secondary/50 text-muted-foreground'
                          )}
                        >
                          BO{n}
                        </button>
                      ))}
                    </div>
                    {/* Custom Best Of */}
                    <div className="flex gap-2 items-center justify-center">
                      <input
                        type="number"
                        min={1}
                        value={customDefaultBestOf}
                        onChange={e => setCustomDefaultBestOf(e.target.value)}
                        placeholder="Custom (e.g. 147)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-xs max-w-[160px]"
                      />
                      {customDefaultBestOf && (
                        <button
                          onClick={() => {
                            const val = parseInt(customDefaultBestOf);
                            if (val >= 1) setDefaultBestOf(val);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] text-xs font-semibold"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                    {customDefaultBestOf && parseInt(customDefaultBestOf) >= 1 && (
                      <p className="text-xs text-[hsl(var(--gold))] mt-1 text-center">Custom: Best of {customDefaultBestOf} selected</p>
                    )}
                  </div>


                  {localTournament.registeredPlayers.length < 2 && (
                    <p className="text-xs text-primary mb-4">Register at least 2 players first.</p>
                  )}
                  <button
                    onClick={handleStartTournament}
                    disabled={localTournament.registeredPlayers.length < 2}
                    className="w-full py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Generate Bracket
                  </button>
                </div>
              ) : (
                <>
                  {/* Bracket toolbar */}
                  <div className="flex gap-2">
                    {localTournament.status !== 'completed' && (
                      <button
                        onClick={handleRegenerateDraws}
                        className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent/30 transition-colors"
                      >
                        <Shuffle className="w-4 h-4" /> Re-draw
                      </button>
                    )}
                    {localTournament.status !== 'completed' && (
                      <button
                        onClick={() => setEndTournamentModal(true)}
                        className="flex-1 py-2.5 rounded-xl bg-primary/20 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors"
                      >
                        <Flag className="w-4 h-4" /> End Tournament
                      </button>
                    )}
                  </div>

                  {roundNumbers.map(roundNum => {
                    const roundMatches = bracket.filter(m => m.round === roundNum);
                    return (
                      <div key={roundNum}>
                        <h3 className="text-xs font-bold text-[hsl(var(--gold))] uppercase tracking-widest mb-3">
                          {getRoundName(roundNum, totalRounds)}
                        </h3>
                        <div className="space-y-3">
                          {roundMatches.map(match => (
                            <BracketMatchCard
                              key={match.id}
                              match={match}
                              onStartMatch={() => handleStartMatch(match.id)}
                              onOpenScore={() => setScoreModal(match)}
                              onChangeBestOf={() => setBestOfModal(match.id)}
                              onSwap={(slot) => setSwapMode({ matchId: match.id, slot })}
                              swapActive={swapMode?.matchId === match.id}
                              isRound0={roundNum === 0}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── LEADERBOARD ── */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-2">
              {localTournament.registeredPlayers.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">No players registered yet</p>
                </div>
              ) : (
                localTournament.registeredPlayers.map((player, index) => {
                  const wins = completedBracketMatches.filter(m => m.winner === player).length;
                  const isChampion = localTournament.winner === player;
                  return (
                    <div key={player} className={cn(
                      "glass-card p-3 flex items-center gap-3",
                      isChampion && "border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/5"
                    )}>
                      <button onClick={() => setSelectedPlayer(player)} className="flex items-center gap-3 flex-1 hover:opacity-80">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                          index === 0 ? "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]" :
                          index === 1 ? "bg-muted-foreground/20 text-muted-foreground" :
                          index === 2 ? "bg-orange-500/20 text-orange-400" :
                          "bg-secondary text-muted-foreground"
                        )}>#{index + 1}</div>
                        <div className="flex-1 text-left">
                          <p className="font-medium flex items-center gap-1">
                            {player}
                            {isChampion && <span className="text-[hsl(var(--gold))] text-xs">🏆</span>}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground">{wins} Wins</p>
                            {(playerTrophies[player] ?? []).map((t, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]">{t}</span>
                            ))}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => { setTrophyPlayer(player); setTrophyName(''); }}
                        className="p-2 rounded-lg bg-[hsl(var(--gold))]/10 hover:bg-[hsl(var(--gold))]/20 transition-colors"
                        title="Award Trophy"
                      >
                        <Award className="w-4 h-4 text-[hsl(var(--gold))]" />
                      </button>
                    </div>
                  );
                })
              )}

              {/* Trophy Award Panel */}
              {trophyPlayer && (
                <div className="glass-card p-4 border border-[hsl(var(--gold))]/30 mt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[hsl(var(--gold))]" /> Award Trophy to {trophyPlayer}
                  </h4>
                  <input
                    type="text"
                    value={trophyName}
                    onChange={e => setTrophyName(e.target.value)}
                    placeholder="e.g., Best Break, MVP, Champion"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm mb-3"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleAwardTrophy(trophyPlayer)} className="flex-1 py-2 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold text-sm">Award</button>
                    <button onClick={() => setTrophyPlayer(null)} className="flex-1 py-2 rounded-xl bg-secondary text-foreground font-semibold text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MATCHES ── */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              {bracket.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">Start the tournament to see matches</p>
                </div>
              ) : (
                <>
                  {liveMatches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
                        <span className="font-semibold text-sm">Live Now</span>
                      </div>
                      {liveMatches.map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onPlayerClick={setSelectedPlayer}
                          onUpdateScore={() => setScoreModal(match)}
                          onLiveLink={() => { setLiveLinksModal(match); setLiveLinkText(match.liveLink || ''); }}
                        />
                      ))}
                    </div>
                  )}
                  {pendingMatches.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-3">Upcoming</p>
                      {pendingMatches.map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onPlayerClick={setSelectedPlayer}
                          onStartMatch={() => handleStartMatch(match.id)}
                        />
                      ))}
                    </div>
                  )}
                  {completedBracketMatches.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-3">Completed</p>
                      {completedBracketMatches.map(match => (
                        <MatchCard key={match.id} match={match} onPlayerClick={setSelectedPlayer} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      {localTournament.status === 'upcoming' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-24 bg-background/80 backdrop-blur-xl border-t border-border/50 z-[60] flex gap-3">
          <button
            onClick={onRegister}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" /> Register Player
          </button>
          <button
            onClick={handleStartTournament}
            disabled={localTournament.registeredPlayers.length < 2}
            className="flex-1 py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Play className="w-5 h-5" /> Start Tournament
          </button>
        </div>
      )}
      {localTournament.status === 'in_progress' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-24 bg-background/80 backdrop-blur-xl border-t border-border/50 z-[60] flex gap-3">
          <button
            onClick={onRegister}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" /> Add Player
          </button>
          <button
            onClick={() => setEndTournamentModal(true)}
            className="flex-1 py-3 rounded-xl bg-primary/20 text-primary font-semibold flex items-center justify-center gap-2"
          >
            <Flag className="w-5 h-5" /> End Tournament
          </button>
        </div>
      )}

      {/* Score Update Modal */}
      {scoreModal && (() => {
        const liveMatch = bracket.find(m => m.id === scoreModal.id) ?? scoreModal;
        const maxWins = winsNeeded(liveMatch.bestOf);
        const p1Won = liveMatch.score1 >= maxWins;
        const p2Won = liveMatch.score2 >= maxWins;
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setScoreModal(null)}>
            <div className="w-[90%] max-w-sm glass-card rounded-2xl p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Update Score</h3>
                <button onClick={() => setScoreModal(null)} className="p-1 rounded-lg hover:bg-accent/30"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">Best of {liveMatch.bestOf} — First to {maxWins} wins</p>
                <button
                  onClick={() => setBestOfModal(liveMatch.id)}
                  className="text-xs text-[hsl(var(--gold))] underline"
                >
                  Change
                </button>
              </div>

              {(p1Won || p2Won) && (
                <div className="mb-3 p-2 rounded-lg bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 text-center">
                  <p className="text-xs text-[hsl(var(--gold))] font-semibold">
                    🏆 {p1Won ? liveMatch.player1 : liveMatch.player2} has won! Press Complete to advance.
                  </p>
                </div>
              )}

              {[
                { player: liveMatch.player1, num: 1 as const, score: liveMatch.score1, hasWon: p1Won, opponentWon: p2Won },
                { player: liveMatch.player2, num: 2 as const, score: liveMatch.score2, hasWon: p2Won, opponentWon: p1Won },
              ].map(({ player, num, score, hasWon, opponentWon }) => (
                <div key={num} className={cn(
                  "flex items-center justify-between p-3 rounded-xl mb-2",
                  hasWon ? "bg-available/10 border border-available/30" : "bg-secondary/30"
                )}>
                  <span className="font-medium text-sm flex items-center gap-1.5">
                    {player ?? 'TBD'}
                    {hasWon && <Trophy className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpdateScore(liveMatch.id, num, -1)}
                      disabled={score === 0}
                      className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4 text-primary" />
                    </button>
                    <span className={cn("text-2xl font-bold w-8 text-center", hasWon && "text-available")}>{score}</span>
                    <button
                      onClick={() => handleUpdateScore(liveMatch.id, num, 1)}
                      disabled={hasWon}
                      className="w-8 h-8 rounded-lg bg-available/20 flex items-center justify-center disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4 text-available" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setScoreModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm"
                >
                  Save Score
                </button>
                <button
                  onClick={() => {
                    const updated = bracket.find(m => m.id === scoreModal.id);
                    if (updated) handleCompleteMatch(updated);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> Complete
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Break Input Modal — shown after completing a match */}
      {breakInputModal && (() => {
        const { match } = breakInputModal;
        return (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBreakInputModal(null)}>
            <div className="w-[90%] max-w-sm glass-card rounded-2xl p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Highest Break in Match</h3>
                <button onClick={() => setBreakInputModal(null)} className="p-1 rounded-lg hover:bg-accent/30"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Optional — enter each player's highest break this match. If it's a new personal best, it will be recorded.</p>
              
              <div className="space-y-3">
                {match.player1 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">{match.player1}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={break1}
                      onChange={(e) => setBreak1(e.target.value)}
                      className="input-glass w-full"
                    />
                  </div>
                )}
                {match.player2 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">{match.player2}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={break2}
                      onChange={(e) => setBreak2(e.target.value)}
                      className="input-glass w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleConfirmComplete}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm"
                >
                  Skip
                </button>
                <button
                  onClick={handleConfirmComplete}
                  className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {bestOfModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setBestOfModal(null); setCustomBestOfInput(''); }}>
          <div className="w-[90%] max-w-sm glass-card rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Set Best Of</h3>
              <button onClick={() => { setBestOfModal(null); setCustomBestOfInput(''); }} className="p-1 rounded-lg hover:bg-accent/30"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {BEST_OF_OPTIONS.map(n => {
                const currentBestOf = bracket.find(m => m.id === bestOfModal)?.bestOf;
                return (
                  <button
                    key={n}
                    onClick={() => handleChangeBestOf(bestOfModal, n)}
                    className={cn(
                      'py-3 rounded-xl text-sm font-bold border-2 transition-all',
                      currentBestOf === n
                        ? 'bg-[hsl(var(--gold))] text-black border-transparent'
                        : 'border-border/50 bg-secondary/50 text-foreground hover:bg-secondary'
                    )}
                  >
                    BO{n}
                  </button>
                );
              })}
            </div>
            {/* Custom */}
            <div className="border-t border-border/30 pt-3">
              <p className="text-xs text-muted-foreground mb-2">Custom number of frames</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={customBestOfInput}
                  onChange={e => setCustomBestOfInput(e.target.value)}
                  placeholder="e.g. 147"
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm"
                />
                <button
                  onClick={() => {
                    const val = parseInt(customBestOfInput);
                    if (!val || val < 1) { toast.error('Enter a valid number'); return; }
                    if (bestOfModal) handleChangeBestOf(bestOfModal, val);
                  }}
                  className="px-4 py-2 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold text-sm"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Live Link Modal */}
      {liveLinksModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLiveLinksModal(null)}>
          <div className="w-[90%] max-w-sm glass-card rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Link className="w-4 h-4" /> Live Stream Link</h3>
              <button onClick={() => setLiveLinksModal(null)} className="p-1 rounded-lg hover:bg-accent/30"><X className="w-4 h-4" /></button>
            </div>
            <input type="text" value={liveLinkText} onChange={e => setLiveLinkText(e.target.value)}
              placeholder="Enter live stream URL..." className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/50 text-sm mb-3" />
            <button onClick={() => {
              if (liveLinksModal) {
                const updated = bracket.map(m => m.id === liveLinksModal.id ? { ...m, liveLink: liveLinkText.trim() || undefined } : m);
                setBracket(updated);
                persistUpdate(localTournament, updated);
              }
              toast.success('Live link saved!');
              setLiveLinksModal(null);
            }}
              className="w-full py-2.5 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold text-sm">Save Link</button>
          </div>
        </div>
      )}

      {/* Swap Player Picker */}
      {swapMode && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSwapMode(null)}>
          <div className="w-full max-w-md glass-card rounded-t-3xl p-5 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">Select player to swap in</h3>
            <p className="text-xs text-muted-foreground mb-4">Tap a player to swap them into this slot</p>
            <div className="space-y-2">
              {round0Players.map(p => (
                <button
                  key={p}
                  onClick={() => handleSwapPlayer(swapMode.matchId, swapMode.slot, p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs">
                    {p.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="font-medium text-sm">{p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* End Tournament Modal */}
      {endTournamentModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEndTournamentModal(false)}>
          <div className="w-[90%] max-w-sm glass-card rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Flag className="w-4 h-4 text-primary" /> End Tournament</h3>
              <button onClick={() => setEndTournamentModal(false)} className="p-1 rounded-lg hover:bg-accent/30"><X className="w-4 h-4" /></button>
            </div>

            {!derivedChampion ? (
              <div className="text-center py-4">
                <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1 font-medium">Final match not completed</p>
                <p className="text-xs text-muted-foreground">Complete all bracket matches first. The winner is determined automatically from the bracket results.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">Winners are automatically determined from bracket results. Positions will be added to player profiles.</p>

                {/* Auto-derived podium */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30">
                    <span className="text-xl">🥇</span>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">1st Place — Champion</p>
                      <p className="font-bold text-[hsl(var(--gold))]">{derivedChampion}</p>
                      {finalMatch && <p className="text-xs text-muted-foreground mt-0.5">Won {finalMatch.score1 > finalMatch.score2 ? finalMatch.score1 : finalMatch.score2} – {finalMatch.score1 > finalMatch.score2 ? finalMatch.score2 : finalMatch.score1} in the Final</p>}
                    </div>
                  </div>
                  {derivedRunnerUp && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <span className="text-xl">🥈</span>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">2nd Place — Runner-up</p>
                        <p className="font-semibold">{derivedRunnerUp}</p>
                      </div>
                    </div>
                  )}
                  {derivedThirdPlace.map((p, i) => (
                    <div key={p} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <span className="text-xl">🥉</span>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">3rd Place</p>
                        <p className="font-semibold">{p}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Completed match scores summary */}
                {completedBracketMatches.filter(m => m.score1 + m.score2 > 0).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Match Results</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {completedBracketMatches.filter(m => m.score1 + m.score2 > 0).map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30">
                          <span className={cn('font-medium', m.winner === m.player1 ? 'text-available' : 'text-muted-foreground')}>{m.player1}</span>
                          <span className="font-bold px-2">{m.score1} – {m.score2}</span>
                          <span className={cn('font-medium', m.winner === m.player2 ? 'text-available' : 'text-muted-foreground')}>{m.player2}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prize summary */}
                {localTournament.prizeDistribution && localTournament.prizeDistribution.filter(p => p.amount > 0).length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-secondary border border-border">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Prize Summary</p>
                    {localTournament.prizeDistribution.filter(p => p.amount > 0).map(prize => (
                      <div key={prize.place} className="flex justify-between text-sm py-0.5">
                        <span className="text-foreground">{prize.place === 1 ? '🥇' : prize.place === 2 ? '🥈' : '🥉'} {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : `${prize.place}th`}</span>
                        <span className="font-bold text-[hsl(var(--gold))]">₹{prize.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleEndTournament}
                  className="w-full py-3 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] font-semibold flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Declare Winner & Close
                </button>
              </>
            )}
          </div>
        </div>
      )}


      {/* Player Stats Popup */}
      {selectedPlayer && (
        <PlayerStatsPopup
          playerName={selectedPlayer}
          tournamentTrophies={playerTrophies[selectedPlayer] ?? []}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};

// ── BracketMatchCard ──
interface BracketMatchCardProps {
  match: TournamentBracketMatch;
  onStartMatch?: () => void;
  onOpenScore?: () => void;
  onChangeBestOf?: () => void;
  onSwap?: (slot: 1 | 2) => void;
  swapActive?: boolean;
  isRound0?: boolean;
}

const BracketMatchCard = ({ match, onStartMatch, onOpenScore, onChangeBestOf, onSwap, swapActive, isRound0 }: BracketMatchCardProps) => {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  return (
    <div className={cn(
      "glass-card p-3 rounded-xl border",
      isLive ? "border-live/40" : isCompleted ? "border-available/20" : "border-border/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Table {match.tableNumber}</span>
          <button
            onClick={onChangeBestOf}
            className="text-xs px-2 py-0.5 rounded bg-secondary hover:bg-accent/30 transition-colors text-muted-foreground"
          >
            BO{match.bestOf}
          </button>
        </div>
        {isLive && <span className="text-xs px-2 py-0.5 rounded bg-live/20 text-live font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" /> LIVE</span>}
        {isCompleted && <span className="text-xs px-2 py-0.5 rounded bg-available/20 text-available font-semibold">DONE</span>}
      </div>

      {[{ player: match.player1, score: match.score1, slot: 1 as const }, { player: match.player2, score: match.score2, slot: 2 as const }].map(({ player, score, slot }) => (
        <div key={slot} className={cn(
          "flex items-center justify-between p-2 rounded-lg mb-1",
          isCompleted && match.winner === player ? "bg-available/10" : "bg-secondary/30"
        )}>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium">{player ?? <span className="text-muted-foreground italic text-xs">TBD</span>}</span>
            {isCompleted && match.winner === player && <Trophy className="w-3 h-3 text-[hsl(var(--gold))]" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold w-6 text-center">{score}</span>
            {isRound0 && !isCompleted && player && onSwap && (
              <button onClick={() => onSwap(slot)} className="p-1 rounded hover:bg-accent/30 transition-colors" title="Swap player">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Show Start/Score button for pending+live matches that have both players */}
      {!isCompleted && match.player1 && match.player2 && (
        <div className="flex gap-2 mt-2">
          {!isLive && (
            <button onClick={onStartMatch} className="flex-1 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-accent/30 transition-colors">
              ▶ Start
            </button>
          )}
          {isLive && (
            <button onClick={onOpenScore} className="flex-1 py-1.5 rounded-lg bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] text-xs font-semibold">
              ✏️ Score & Complete
            </button>
          )}
        </div>
      )}

      {/* If only one player present — auto advance via BYE */}
      {!isCompleted && (match.player1 || match.player2) && !(match.player1 && match.player2) && (
        <button
          onClick={onStartMatch}
          className="w-full mt-2 py-1.5 rounded-lg bg-available/20 text-available text-xs font-medium hover:bg-available/30 transition-colors"
        >
          ✓ Auto-advance (BYE)
        </button>
      )}
    </div>
  );
};

// ── MatchCard (for Matches tab) ──
interface MatchCardProps {
  match: TournamentBracketMatch;
  onPlayerClick: (name: string) => void;
  onUpdateScore?: () => void;
  onLiveLink?: () => void;
  onStartMatch?: () => void;
}

const MatchCard = ({ match, onPlayerClick, onUpdateScore, onLiveLink, onStartMatch }: MatchCardProps) => {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  return (
    <div className="glass-card p-4 mb-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-live font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" /> TABLE {match.tableNumber}
            </span>
          ) : `Table ${match.tableNumber}`}
        </span>
        {isLive && <span className="bg-live/20 text-live px-2 py-0.5 rounded text-xs font-semibold">LIVE</span>}
        {isCompleted && <span className="bg-available/20 text-available px-2 py-0.5 rounded text-xs font-semibold">DONE</span>}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => match.player1 && onPlayerClick(match.player1)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className={cn("w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm", isCompleted && match.winner === match.player1 && "ring-2 ring-[hsl(var(--gold))]")}>
            {match.player1 ? match.player1.split(' ').map(n => n[0]).join('') : '?'}
          </div>
          <span className="font-medium text-sm">{match.player1 ?? 'TBD'}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{match.score1}</span>
          <span className="text-xs text-muted-foreground">vs</span>
          <span className="text-2xl font-bold">{match.score2}</span>
        </div>

        <button onClick={() => match.player2 && onPlayerClick(match.player2)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-medium text-sm">{match.player2 ?? 'TBD'}</span>
          <div className={cn("w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm", isCompleted && match.winner === match.player2 && "ring-2 ring-[hsl(var(--gold))]")}>
            {match.player2 ? match.player2.split(' ').map(n => n[0]).join('') : '?'}
          </div>
        </button>
      </div>

      {isLive && (
        <div className="mt-4 flex gap-2">
          <button onClick={onUpdateScore} className="flex-1 py-2 rounded-xl bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))] text-sm font-semibold">
            ✏️ Update Score
          </button>
          <button onClick={onLiveLink} className="p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <Video className="w-4 h-4" />
          </button>
        </div>
      )}
      {!isLive && !isCompleted && match.player1 && match.player2 && (
        <button onClick={onStartMatch} className="w-full mt-4 py-2 rounded-xl bg-secondary/50 text-sm font-medium hover:bg-secondary transition-colors">
          ▶ Start Match
        </button>
      )}
    </div>
  );
};

export default TournamentDetailModal;
