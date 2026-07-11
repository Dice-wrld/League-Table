import { cn } from '../utils/cn';
import { getWinStreak, sortTeams, type TournamentData } from '../lib/tournament';

const getFormColor = (r: 'W' | 'D' | 'L') =>
  r === 'W' ? 'bg-green-500' : r === 'D' ? 'bg-gray-500' : 'bg-red-500';

const getZone = (pos: number, total: number) => {
  if (pos === 1) return 'border-l-4 border-yellow-400';
  if (pos === 2) return 'border-l-4 border-gray-400';
  if (pos === 3) return 'border-l-4 border-amber-600';
  if (pos === total) return 'border-l-4 border-red-600';
  return 'border-l-4 border-transparent';
};

interface StandingsPageProps {
  tournament: TournamentData;
}

export default function StandingsPage({ tournament }: StandingsPageProps) {
  const sorted = sortTeams(tournament.teams);

  // King of court: highest current win streak (≥ 3 wins)
  const streaks = sorted.map((t) => getWinStreak(t.form));
  const maxStreak = Math.max(...streaks);
  const kingIdx = maxStreak >= 3 ? streaks.indexOf(maxStreak) : -1;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-300 bg-slate-800/30 rounded-xl p-3">
        <span>🥇 Champion</span>
        <span>🥈 Runner-up</span>
        <span>🥉 Third Place</span>
        <span>🔴 Last Place</span>
        {kingIdx >= 0 && <span>👑 King of Court</span>}
      </div>

      {/* Desktop table */}
      <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <div className="hidden md:block overflow-x-auto scroll-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-16">POS</th>
                <th className="px-4 py-3 text-left">TEAM</th>
                <th className="px-4 py-3 text-center">PL</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">D</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center">GF</th>
                <th className="px-4 py-3 text-center">GA</th>
                <th className="px-4 py-3 text-center">GD</th>
                <th className="px-4 py-3 text-center">FORM</th>
                <th className="px-4 py-3 text-center">PTS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((team, index) => {
                const pos = index + 1;
                const prev = team.previousPosition;
                const posChange = !prev || prev === pos ? null : prev > pos ? 'up' : 'down';
                const diff = Math.abs((prev ?? pos) - pos);
                const streak = streaks[index];
                const isKing = index === kingIdx;
                const isOnCourt = tournament.mode === 'queue' && tournament.onCourt.includes(team.id);
                return (
                  <tr key={team.id} className={cn('border-t border-slate-700/50 transition-all duration-700', getZone(pos, sorted.length), isOnCourt ? 'bg-purple-900/30' : 'hover:bg-slate-700/30')}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-bold">{pos}</span>
                        {posChange === 'up' && <span className="text-green-400 text-xs">↑{diff}</span>}
                        {posChange === 'down' && <span className="text-red-400 text-xs">↓{diff}</span>}
                        {!posChange && <span className="text-slate-500 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {team.emoji && <span className="text-lg">{team.emoji}</span>}
                        <span className="font-semibold" style={{ color: team.color ?? '#ffffff' }}>{team.name}</span>
                        {isKing && <span title="King of Court — longest win streak">👑</span>}
                        {streak >= 3 && <span className="text-orange-400 font-bold text-xs">🔥{streak}</span>}
                        {isOnCourt && <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">ON</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-300">{team.played}</td>
                    <td className="px-4 py-4 text-center text-green-400 font-medium">{team.won}</td>
                    <td className="px-4 py-4 text-center text-slate-300">{team.drawn}</td>
                    <td className="px-4 py-4 text-center text-red-400">{team.lost}</td>
                    <td className="px-4 py-4 text-center text-slate-300">{team.goalsFor}</td>
                    <td className="px-4 py-4 text-center text-slate-300">{team.goalsAgainst}</td>
                    <td className={cn('px-4 py-4 text-center font-medium', team.goalDifference > 0 ? 'text-green-400' : team.goalDifference < 0 ? 'text-red-400' : 'text-slate-300')}>
                      {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {team.form.length > 0
                          ? [...team.form].slice(0, 5).reverse().map((r, i) => (
                              <div key={i} className={cn('w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold', getFormColor(r))}>{r}</div>
                            ))
                          : <span className="text-slate-500 text-sm">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-white font-black text-lg">{team.points}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {sorted.map((team, index) => {
            const pos = index + 1;
            const prev = team.previousPosition;
            const posChange = !prev || prev === pos ? null : prev > pos ? 'up' : 'down';
            const diff = Math.abs((prev ?? pos) - pos);
            const streak = streaks[index];
            const isKing = index === kingIdx;
            const isOnCourt = tournament.mode === 'queue' && tournament.onCourt.includes(team.id);
            return (
              <div key={team.id} className={cn('border-t border-slate-700/50 p-4 transition-all duration-700', getZone(pos, sorted.length), isOnCourt ? 'bg-purple-900/30' : '')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl font-black text-white">{pos}</span>
                    {posChange === 'up' && <span className="text-green-400 text-sm">↑{diff}</span>}
                    {posChange === 'down' && <span className="text-red-400 text-sm">↓{diff}</span>}
                    {!posChange && <span className="text-slate-500 text-sm">—</span>}
                    {team.emoji && <span className="text-lg">{team.emoji}</span>}
                    <span className="font-semibold" style={{ color: team.color ?? '#ffffff' }}>{team.name}</span>
                    {isKing && <span>👑</span>}
                    {streak >= 3 && <span className="text-orange-400 font-bold text-xs">🔥{streak}</span>}
                    {isOnCourt && <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">ON</span>}
                  </div>
                  <div className="text-white font-black text-2xl">{team.points}</div>
                </div>
                <div className="grid grid-cols-6 gap-1 text-center text-xs mb-3">
                  {([
                    ['W',  team.won,                                                          'text-green-400'],
                    ['D',  team.drawn,                                                        'text-slate-300'],
                    ['L',  team.lost,                                                         'text-red-400'  ],
                    ['GF', team.goalsFor,                                                     'text-slate-300'],
                    ['GA', team.goalsAgainst,                                                 'text-slate-300'],
                    ['GD', (team.goalDifference > 0 ? '+' : '') + team.goalDifference,       team.goalDifference > 0 ? 'text-green-400' : team.goalDifference < 0 ? 'text-red-400' : 'text-slate-300'],
                  ] as [string, string | number, string][]).map(([label, val, colour]) => (
                    <div key={label} className="bg-slate-700/50 rounded p-1.5">
                      <div className="text-slate-400 text-xs">{label}</div>
                      <div className={cn('font-bold text-xs', colour)}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {team.form.length > 0
                    ? [...team.form].slice(0, 5).reverse().map((r, i) => (
                        <div key={i} className={cn('flex-1 h-6 rounded flex items-center justify-center text-white text-xs font-bold', getFormColor(r))}>{r}</div>
                      ))
                    : <span className="text-slate-500 text-sm">No matches yet</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-purple-200 text-xs opacity-60">
        PL Played · W Won · D Drawn · L Lost · GF Goals For · GA Goals Against · GD Goal Difference · PTS Points
      </div>
    </div>
  );
}
