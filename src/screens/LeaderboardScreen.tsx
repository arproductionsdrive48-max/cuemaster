import { useState, useMemo } from 'react';
import { Member } from '@/types';
import { useMembers } from '@/contexts/MembersContext';
import Header from '@/components/layout/Header';
import PlayerDetailModal from '@/components/leaderboard/PlayerDetailModal';
import { Trophy, Medal, Target, TrendingUp, Calendar, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, isAfter, format } from 'date-fns';

type SortType = 'points' | 'wins' | 'games';
type TimeFilter = 'all' | 'weekly' | 'monthly';

interface LeaderboardScreenProps {
  onBack?: () => void;
}

const calculatePoints = (m: Member) => m.cpp_points || 0;

const LeaderboardScreen = ({ onBack }: LeaderboardScreenProps) => {
  const { members, matchHistory, tournaments } = useMembers();
  const [sortBy, setSortBy] = useState<SortType>('points');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<(Member & { winRate: number; points: number }) | null>(null);
  const [selectedRank, setSelectedRank] = useState<number>(0);

  const rankedMembers = useMemo(() => {
    const now = new Date();
    const filterDate = timeFilter === 'weekly' ? subDays(now, 7) : timeFilter === 'monthly' ? subDays(now, 30) : null;

    return [...members]
      .map(m => {
        if (filterDate) {
          // Calculate from match history within time period
          const playerMatches = matchHistory.filter(mh => 
            isAfter(mh.date, filterDate) &&
            mh.players.some(p => p.name === m.name)
          );
          const wins = playerMatches.filter(mh => 
            mh.players.find(p => p.name === m.name)?.result === 'win'
          ).length;
          const losses = playerMatches.filter(mh => 
            mh.players.find(p => p.name === m.name)?.result === 'loss'
          ).length;
          const games = wins + losses;
          return {
            ...m,
            winRate: games > 0 ? Math.round((wins / games) * 100) : 0,
            points: (wins * 4) + (losses * 1),
            wins,
            losses,
            gamesPlayed: games,
          };
        }
        return {
          ...m,
          winRate: m.gamesPlayed > 0 ? Math.round((m.wins / m.gamesPlayed) * 100) : 0,
          points: calculatePoints(m),
        };
      })
      .sort((a, b) => {
        if (sortBy === 'points') return (b.points || 0) - (a.points || 0);
        if (sortBy === 'wins') return (b.wins || 0) - (a.wins || 0);
        return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
      });
  }, [sortBy, members, matchHistory, timeFilter]);

  const handlePlayerClick = (member: Member & { winRate: number; points: number }, rank: number) => {
    setSelectedPlayer(member);
    setSelectedRank(rank);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 trophy-gold" />;
    if (rank === 2) return <Medal className="w-6 h-6 trophy-silver" />;
    if (rank === 3) return <Medal className="w-6 h-6 trophy-bronze" />;
    return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{rank}</span>;
  };

  return (
    <div className="min-h-screen pb-24">
      {onBack ? (
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center p-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-accent/30 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="ml-2 font-semibold text-lg">Player Rankings</span>
          </div>
        </div>
      ) : (
        <Header title="Ranks" />
      )}

      {/* Time Filter */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {([
            { id: 'all', label: 'All Time' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'weekly', label: 'Weekly' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id)}
              className={cn(
                'flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                timeFilter === f.id
                  ? 'bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Tournament Card — only show if there's a real upcoming tournament */}
      {(() => {
        const upcoming = tournaments.find(t => t.status === 'upcoming');
        if (!upcoming) return null;
        return (
          <div className="px-4 mb-6">
            <div className="glass-card-live p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-gold" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Upcoming</span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{upcoming.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(upcoming.date, 'MMM d, yyyy')}{upcoming.startTime ? ` • ${upcoming.startTime}` : ''}</span>
                  </div>
                  {upcoming.prizePool && (
                    <p className="text-sm text-muted-foreground mt-2">Prize Pool: ₹{upcoming.prizePool.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Sort Options */}
      <div className="px-4 mb-8">
        <div className="bg-[#121212] p-1.5 rounded-2xl border border-white/5 flex gap-1.5">
          {([
            { id: 'points', label: 'Points', icon: Star },
            { id: 'wins', label: 'Wins', icon: Trophy },
            { id: 'games', label: 'Games', icon: Target },
          ] as const).map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-1 uppercase tracking-widest',
                sortBy === s.id
                  ? 'bg-[hsl(var(--gold))] text-black shadow-lg shadow-[hsl(var(--gold))]/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              )}
            >
              <s.icon className={cn("w-3.5 h-3.5", sortBy === s.id ? "text-black" : "text-gray-600")} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Premium Podium */}
      <div className="px-4 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-4 md:gap-6">
          {/* 2nd Place */}
          {rankedMembers[1] && (
            <button
              onClick={() => handlePlayerClick(rankedMembers[1], 2)}
              className="w-full md:w-1/3 order-2 md:order-1 group"
            >
              <div className="relative p-5 rounded-2xl bg-[#1A1A1A] border border-white/5 hover:border-white/10 transition-all group-hover:bg-[#222]">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-[#2A2A2A] border border-white/10 flex items-center justify-center text-silver font-black shadow-xl">
                  #2
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-3 border-2 border-slate-400/30 group-hover:scale-105 transition-transform">
                    <span className="text-xl font-bold">{rankedMembers[1].avatar}</span>
                  </div>
                  <h4 className="font-extrabold text-white mb-1 truncate w-full">{rankedMembers[1].name}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <Medal className="w-4 h-4 text-slate-400" />
                    <span className="text-xl font-black text-white">{rankedMembers[1].points} <span className="text-[10px] text-gray-500 uppercase tracking-widest">Pts</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full pt-4 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Wins</p>
                      <p className="text-sm font-bold text-white">{rankedMembers[1].wins}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Win Rate</p>
                      <p className="text-sm font-bold text-[hsl(var(--gold))]">{rankedMembers[1].winRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* 1st Place */}
          {rankedMembers[0] && (
            <button
              onClick={() => handlePlayerClick(rankedMembers[0], 1)}
              className="w-full md:w-[40%] order-1 md:order-2 group z-10"
            >
              <div className="relative p-6 rounded-3xl bg-[#1A1A1A] border-2 border-[hsl(var(--gold))]/30 hover:border-[hsl(var(--gold))]/50 transition-all group-hover:bg-[#222] shadow-[0_0_50px_rgba(250,204,21,0.05)]">
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-2xl bg-[hsl(var(--gold))] border border-[hsl(var(--gold))]/30 flex items-center justify-center text-black font-black text-xl shadow-2xl">
                  #1
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-3 border-2 border-[hsl(var(--gold))] group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                    <span className="text-2xl font-bold">{rankedMembers[0].avatar}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-1 truncate w-full">{rankedMembers[0].name}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-[hsl(var(--gold))]" />
                    <span className="text-3xl font-black text-[hsl(var(--gold))]">{rankedMembers[0].points} <span className="text-xs text-gray-500 uppercase tracking-widest">Pts</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Matches</p>
                      <p className="text-base font-bold text-white">{rankedMembers[0].gamesPlayed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Win Rate</p>
                      <p className="text-base font-bold text-[hsl(var(--gold))]">{rankedMembers[0].winRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* 3rd Place */}
          {rankedMembers[2] && (
            <button
              onClick={() => handlePlayerClick(rankedMembers[2], 3)}
              className="w-full md:w-1/3 order-3 md:order-3 group"
            >
              <div className="relative p-5 rounded-2xl bg-[#1A1A1A] border border-white/5 hover:border-white/10 transition-all group-hover:bg-[#222]">
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-[#2A2A2A] border border-white/10 flex items-center justify-center text-bronze font-black shadow-xl">
                  #3
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-3 border-2 border-orange-700/30 group-hover:scale-105 transition-transform">
                    <span className="text-xl font-bold">{rankedMembers[2].avatar}</span>
                  </div>
                  <h4 className="font-extrabold text-white mb-1 truncate w-full">{rankedMembers[2].name}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <Medal className="w-4 h-4 text-orange-600" />
                    <span className="text-xl font-black text-white">{rankedMembers[2].points} <span className="text-[10px] text-gray-500 uppercase tracking-widest">Pts</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full pt-4 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Wins</p>
                      <p className="text-sm font-bold text-white">{rankedMembers[2].wins}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Win Rate</p>
                      <p className="text-sm font-bold text-[hsl(var(--gold))]">{rankedMembers[2].winRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Full Rankings Grid */}
      <div className="px-4 space-y-3">
        <h3 className="font-semibold text-lg text-white mb-4">Global Rankings ({rankedMembers.length} players)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rankedMembers.slice(3).map((member, idx) => (
            <button
              key={member.id}
              onClick={() => handlePlayerClick(member, idx + 4)}
              className={cn(
                "flex flex-col text-left transition-all duration-300 w-full overflow-hidden hover:shadow-lg shadow-sm group",
                "bg-[#1A1A1A] border-[#333] border rounded-2xl hover:border-[hsl(var(--gold))]/50 active:scale-[0.98]"
              )}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center font-bold text-gray-400">
                    #{idx + 4}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2A2A2A] flex items-center justify-center border border-white/10 group-hover:border-[hsl(var(--gold))]/30 transition-colors">
                    <span className="text-lg font-bold text-white">{member.avatar}</span>
                  </div>
                  <p className="font-bold text-gray-100 truncate max-w-[120px]">{member.name}</p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-xl font-bold text-[hsl(var(--gold))]">{member.points}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Points</p>
                </div>
              </div>
              
              <div className="p-4 w-full bg-[#121212]/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400 font-medium">{member.gamesPlayed} Matches Played</span>
                  <span className="text-xs text-[hsl(var(--gold))] font-bold">{member.winRate}% Win Rate</span>
                </div>
                <div className="flex gap-2 w-full mt-2">
                  <div className="flex-1 rounded bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 flex items-center justify-center py-1.5">
                    <span className="text-xs font-bold text-[hsl(var(--gold))]">W {member.wins}</span>
                  </div>
                  <div className="flex-1 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center py-1.5">
                    <span className="text-xs font-bold text-red-400">L {member.losses}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          member={selectedPlayer}
          rank={selectedRank}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};

export default LeaderboardScreen;
