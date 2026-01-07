import { useState, useMemo } from 'react';
import { members } from '@/data/mockData';
import { Member } from '@/types';
import Header from '@/components/layout/Header';
import PlayerDetailModal from '@/components/leaderboard/PlayerDetailModal';
import { Trophy, Medal, Target, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortType = 'winRate' | 'wins' | 'games';

const LeaderboardScreen = () => {
  const [sortBy, setSortBy] = useState<SortType>('winRate');
  const [selectedPlayer, setSelectedPlayer] = useState<(Member & { winRate: number }) | null>(null);
  const [selectedRank, setSelectedRank] = useState<number>(0);

  const rankedMembers = useMemo(() => {
    return [...members]
      .map(m => ({
        ...m,
        winRate: m.gamesPlayed > 0 ? Math.round((m.wins / m.gamesPlayed) * 100) : 0
      }))
      .sort((a, b) => {
        if (sortBy === 'winRate') return b.winRate - a.winRate;
        if (sortBy === 'wins') return b.wins - a.wins;
        return b.gamesPlayed - a.gamesPlayed;
      });
  }, [sortBy]);

  const handlePlayerClick = (member: Member & { winRate: number }, rank: number) => {
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
      <Header title="Ranks" />

      {/* Upcoming Tournament Card */}
      <div className="px-4 mb-6">
        <div className="glass-card-live p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-gold" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Upcoming</span>
              </div>
              <h3 className="text-lg font-bold mb-1">New Year's Championship</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Jan 1, 2025 • 4:00 PM</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Prize Pool: ₹10,000</p>
            </div>
            <button className="btn-premium px-4 py-2 text-sm">
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {([
            { id: 'winRate', label: 'Win Rate', icon: TrendingUp },
            { id: 'wins', label: 'Wins', icon: Trophy },
            { id: 'games', label: 'Games', icon: Target },
          ] as const).map(s => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1',
                sortBy === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="px-4 mb-6">
        <div className="flex items-end justify-center gap-3">
          {/* 2nd Place */}
          {rankedMembers[1] && (
            <button
              onClick={() => handlePlayerClick(rankedMembers[1], 2)}
              className="flex-1 text-center transition-transform hover:scale-105"
            >
              <div className="glass-card p-4 rounded-t-3xl">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold">{rankedMembers[1].avatar}</span>
                </div>
                <Medal className="w-8 h-8 trophy-silver mx-auto mb-1" />
                <p className="font-semibold text-sm truncate">{rankedMembers[1].name.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">{rankedMembers[1].winRate}%</p>
              </div>
              <div className="h-16 bg-silver/20 rounded-b-xl" />
            </button>
          )}

          {/* 1st Place */}
          {rankedMembers[0] && (
            <button
              onClick={() => handlePlayerClick(rankedMembers[0], 1)}
              className="flex-1 text-center -mt-4 transition-transform hover:scale-105"
            >
              <div className="glass-card p-4 rounded-t-3xl border-gold/30">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold">{rankedMembers[0].avatar}</span>
                </div>
                <Trophy className="w-10 h-10 trophy-gold mx-auto mb-1" />
                <p className="font-bold truncate">{rankedMembers[0].name.split(' ')[0]}</p>
                <p className="text-sm text-gold font-semibold">{rankedMembers[0].winRate}%</p>
              </div>
              <div className="h-24 bg-gold/20 rounded-b-xl" />
            </button>
          )}

          {/* 3rd Place */}
          {rankedMembers[2] && (
            <button
              onClick={() => handlePlayerClick(rankedMembers[2], 3)}
              className="flex-1 text-center transition-transform hover:scale-105"
            >
              <div className="glass-card p-4 rounded-t-3xl">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold">{rankedMembers[2].avatar}</span>
                </div>
                <Medal className="w-8 h-8 trophy-bronze mx-auto mb-1" />
                <p className="font-semibold text-sm truncate">{rankedMembers[2].name.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">{rankedMembers[2].winRate}%</p>
              </div>
              <div className="h-12 bg-bronze/20 rounded-b-xl" />
            </button>
          )}
        </div>
      </div>

      {/* Full Rankings */}
      <div className="px-4 space-y-2">
        <h3 className="font-semibold mb-3">Full Rankings ({rankedMembers.length} players)</h3>
        {rankedMembers.slice(3).map((member, idx) => (
          <button
            key={member.id}
            onClick={() => handlePlayerClick(member, idx + 4)}
            className="glass-card-hover p-4 flex items-center gap-4 w-full text-left"
          >
            {getRankIcon(idx + 4)}
            
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="font-bold">{member.avatar}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{member.name}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{member.gamesPlayed} games</span>
                <span className="text-available">{member.wins}W</span>
                <span className="text-primary">{member.losses}L</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold">{member.winRate}%</p>
              <div className="w-16 progress-glass mt-1">
                <div className="progress-fill" style={{ width: `${member.winRate}%` }} />
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
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
