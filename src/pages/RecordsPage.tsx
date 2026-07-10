import { useState } from 'react';
import { getH2H, getWinStreak, sortTeams, type TournamentData } from '../lib/tournament';
import { generateStandingsImage } from '../utils/canvas';

interface RecordsPageProps {
  tournament: TournamentData;
  showToast: (msg: string) => void;
}

type RecordsTab = 'history' | 'h2h' | 'stats';

export default function RecordsPage({ tournament, showToast }: RecordsPageProps) {
  const [activeTab, setActiveTab] = useState<RecordsTab>('history');
  const [h2hTeam1, setH2hTeam1] = useState<number | null>(null);
  const [h2hTeam2, setH2hTeam2] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  const sorted = sortTeams(tournament.teams);

  const handleShareImage = async () => {
    setSharing(true);
    try {
      const blob = await generateStandingsImage(sorted, tournament.tournamentName);
      if (!blob) { showToast('❌ Could not generate image'); return; }
      const file = new File([blob], 'standings.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: tournament.tournamentName });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'standings.png'; a.click();
        URL.revokeObjectURL(url);
        showToast('📸 Image downloaded!');
      }
    } catch (e) {
      const err = e as Error;
      if (!err.message?.includes('cancel')) showToast('❌ Share failed');
    } finally { setSharing(false); }
  };

  // Session stats
  const totalMatches = tournament.matches.length;
  const topScorer = [...sorted].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestStreak = sorted.reduce((best, t) => {
    const s = getWinStreak(t.form);
    return s > best.streak ? { name: t.name, streak: s, emoji: t.emoji } : best;
  }, { name: '', streak: 0, emoji: undefined as string | undefined });
  const biggestWin = tournament.matches.reduce<{ diff: number; home: string; away: string; score: string } | null>((best, m) => {
    const diff = Math.abs(m.homeScore - m.awayScore);
    if (!best || diff > best.diff) {
      const home = tournament.teams.find((t) => t.id === m.homeTeamId);
      const away = tournament.teams.find((t) => t.id === m.awayTeamId);
      return { diff, home: home?.name ?? '?', away: away?.name ?? '?', score: `${m.homeScore}–${m.awayScore}` };
    }
    return best;
  }, null);

  const h2hResult = h2hTeam1 && h2hTeam2 && h2hTeam1 !== h2hTeam2
    ? getH2H(tournament.matches, h2hTeam1, h2hTeam2) : null;
  const t1 = tournament.teams.find((t) => t.id === h2hTeam1);
  const t2 = tournament.teams.find((t) => t.id === h2hTeam2);

  const tabs: { key: RecordsTab; label: string }[] = [
    { key: 'history', label: '📜 History' },
    { key: 'h2h', label: '⚔️ H2H' },
    { key: 'stats', label: '📊 Stats' },
  ];

  return (
    <div className="space-y-4">
      {/* Share image button */}
      <button onClick={handleShareImage} disabled={sharing || totalMatches === 0} className="w-full py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
        {sharing ? '⏳ Generating…' : '📸 Share Standings as Image'}
      </button>

      {/* Sub-tabs */}
      <div className="flex bg-slate-800/60 rounded-xl p-1 gap-1">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {tournament.matches.length === 0
            ? <div className="text-center text-slate-400 py-12">No matches played yet</div>
            : (
              <div className="divide-y divide-slate-700/50 max-h-[60vh] overflow-y-auto">
                {tournament.matches.map((m, i) => {
                  const home = tournament.teams.find((t) => t.id === m.homeTeamId);
                  const away = tournament.teams.find((t) => t.id === m.awayTeamId);
                  const winner = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
                  return (
                    <div key={m.id} className="flex items-center px-4 py-3 gap-2">
                      <span className="text-slate-500 text-xs w-6 text-center">{tournament.matches.length - i}</span>
                      <span className={`flex-1 text-right text-sm font-medium ${winner === 'home' ? 'text-white' : 'text-slate-400'}`}>
                        {home?.emoji}{home?.name}
                      </span>
                      <span className="text-white font-black mx-2 text-base min-w-[52px] text-center">{m.homeScore}–{m.awayScore}</span>
                      <span className={`flex-1 text-sm font-medium ${winner === 'away' ? 'text-white' : 'text-slate-400'}`}>
                        {away?.emoji}{away?.name}
                      </span>
                      {winner === 'draw' && <span className="text-xs text-slate-500 ml-1">D</span>}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* H2H tab */}
      {activeTab === 'h2h' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Player 1</label>
              <select value={h2hTeam1 ?? ''} onChange={(e) => setH2hTeam1(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400 text-sm">
                <option value="">Select…</option>
                {sorted.map((t) => <option key={t.id} value={t.id}>{t.emoji}{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Player 2</label>
              <select value={h2hTeam2 ?? ''} onChange={(e) => setH2hTeam2(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400 text-sm">
                <option value="">Select…</option>
                {sorted.map((t) => <option key={t.id} value={t.id}>{t.emoji}{t.name}</option>)}
              </select>
            </div>
          </div>

          {h2hResult && t1 && t2 && (
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-5">
              {h2hResult.total === 0
                ? <p className="text-slate-400 text-center py-4">These two haven't played each other yet</p>
                : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-center flex-1">
                        {t1.emoji && <div className="text-3xl mb-1">{t1.emoji}</div>}
                        <div className="text-white font-bold" style={{ color: t1.color }}>{t1.name}</div>
                      </div>
                      <div className="text-slate-500 text-sm px-4">vs</div>
                      <div className="text-center flex-1">
                        {t2.emoji && <div className="text-3xl mb-1">{t2.emoji}</div>}
                        <div className="text-white font-bold" style={{ color: t2.color }}>{t2.name}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 text-center">
                      <div>
                        <div className="text-green-400 font-black text-4xl">{h2hResult.w1}</div>
                        <div className="text-slate-400 text-xs mt-1">Wins</div>
                      </div>
                      <div>
                        <div className="text-slate-300 font-black text-4xl">{h2hResult.draws}</div>
                        <div className="text-slate-400 text-xs mt-1">Draws</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-black text-4xl">{h2hResult.w2}</div>
                        <div className="text-slate-400 text-xs mt-1">Wins</div>
                      </div>
                    </div>
                    <div className="text-center text-slate-500 text-xs mt-4">{h2hResult.total} match{h2hResult.total !== 1 ? 'es' : ''} total</div>
                    {/* Bar */}
                    <div className="flex rounded-full overflow-hidden mt-4 h-2">
                      <div className="bg-blue-500 transition-all" style={{ width: `${h2hResult.total ? (h2hResult.w1 / h2hResult.total) * 100 : 0}%` }} />
                      <div className="bg-slate-500 transition-all" style={{ width: `${h2hResult.total ? (h2hResult.draws / h2hResult.total) * 100 : 0}%` }} />
                      <div className="bg-orange-500 transition-all" style={{ width: `${h2hResult.total ? (h2hResult.w2 / h2hResult.total) * 100 : 0}%` }} />
                    </div>
                  </>
                )}
            </div>
          )}
        </div>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {totalMatches === 0
            ? <div className="text-center text-slate-400 py-12">No matches played yet</div>
            : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 text-center">
                    <div className="text-3xl font-black text-white">{totalMatches}</div>
                    <div className="text-slate-400 text-xs mt-1">Total Matches</div>
                  </div>
                  {bestStreak.streak >= 2 && (
                    <div className="bg-orange-900/30 border border-orange-700/50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-black text-orange-400">🔥{bestStreak.streak}</div>
                      <div className="text-white text-sm font-medium mt-1">{bestStreak.emoji}{bestStreak.name}</div>
                      <div className="text-slate-400 text-xs">Best streak</div>
                    </div>
                  )}
                </div>

                {topScorer && topScorer.goalsFor > 0 && (
                  <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex items-center gap-4">
                    <div className="text-3xl">{topScorer.emoji ?? '⚽'}</div>
                    <div className="flex-1">
                      <div className="text-white font-bold" style={{ color: topScorer.color }}>{topScorer.name}</div>
                      <div className="text-slate-400 text-xs">Most Goals Scored</div>
                    </div>
                    <div className="text-green-400 font-black text-2xl">{topScorer.goalsFor}</div>
                  </div>
                )}

                {biggestWin && biggestWin.diff > 1 && (
                  <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
                    <div className="text-slate-400 text-xs mb-2">Biggest Win</div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{biggestWin.home}</span>
                      <span className="text-white font-black text-lg mx-2">{biggestWin.score}</span>
                      <span className="text-slate-400 font-medium">{biggestWin.away}</span>
                    </div>
                  </div>
                )}

                {/* Full leaderboard */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                    Full Standings
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {sorted.map((team, i) => {
                      const streak = getWinStreak(team.form);
                      return (
                        <div key={team.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="text-slate-400 w-5 text-sm">{i + 1}</span>
                          {team.emoji && <span>{team.emoji}</span>}
                          <span className="flex-1 text-white text-sm font-medium" style={{ color: team.color }}>{team.name}</span>
                          {streak >= 3 && <span className="text-orange-400 text-xs font-bold">🔥{streak}</span>}
                          <div className="text-right">
                            <div className="text-white font-bold">{team.points} pts</div>
                            <div className="text-slate-400 text-xs">{team.won}W {team.drawn}D {team.lost}L</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
        </div>
      )}
    </div>
  );
}
