import { useEffect, useState } from 'react';
import { cn } from '../utils/cn';
import { getH2H, sortTeams, type TournamentData } from '../lib/tournament';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

interface PlayPageProps {
  tournament: TournamentData;
  canUndo: boolean;
  onUndo: () => void;
  onQueueResult: (homeScore: number, awayScore: number) => void;
  onAddMatch: (homeId: number, awayId: number, homeScore: number, awayScore: number) => void;
  onArrangeQueue: (order: number[]) => void;
  sessionStart: number;
}

export default function PlayPage({ tournament, canUndo, onUndo, onQueueResult, onAddMatch, onArrangeQueue, sessionStart }: PlayPageProps) {
  const [elapsed, setElapsed] = useState(0);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [scoreMode, setScoreMode] = useState(false);
  const [error, setError] = useState('');
  const [showArrange, setShowArrange] = useState(false);
  const [queueDraft, setQueueDraft] = useState<number[]>([]);
  // League mode
  const [lHomeId, setLHomeId] = useState<number | null>(null);
  const [lAwayId, setLAwayId] = useState<number | null>(null);
  const [lHomeScore, setLHomeScore] = useState('');
  const [lAwayScore, setLAwayScore] = useState('');

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [sessionStart]);

  const sortedTeams = sortTeams(tournament.teams);
  const homeTeam = tournament.teams.find((t) => t.id === tournament.onCourt[0]);
  const awayTeam = tournament.teams.find((t) => t.id === tournament.onCourt[1]);
  const queue = tournament.queueOrder.map((id) => tournament.teams.find((t) => t.id === id)).filter(Boolean);
  const h2h = homeTeam && awayTeam ? getH2H(tournament.matches, homeTeam.id, awayTeam.id) : null;

  const handleQuickResult = (h: number, a: number) => {
    setError(''); setHomeScore(''); setAwayScore('');
    onQueueResult(h, a);
  };

  const handleDetailedResult = () => {
    const h = parseInt(homeScore), a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { setError('Enter valid scores'); return; }
    setError(''); setHomeScore(''); setAwayScore(''); setScoreMode(false);
    onQueueResult(h, a);
  };

  const handleLeagueSubmit = () => {
    if (!lHomeId || !lAwayId || lHomeId === lAwayId) return;
    const h = parseInt(lHomeScore), a = parseInt(lAwayScore);
    if (isNaN(h) || isNaN(a)) return;
    onAddMatch(lHomeId, lAwayId, h, a);
    setLHomeScore(''); setLAwayScore('');
  };

  const moveQueueItem = (from: number, to: number) => {
    setQueueDraft((prev) => { const next = [...prev]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
  };

  const openArrange = () => {
    setQueueDraft([...tournament.onCourt, ...tournament.queueOrder]);
    setShowArrange(true);
  };

  const saveArrange = () => {
    onArrangeQueue(queueDraft);
    setShowArrange(false);
  };

  // ── League mode ──────────────────────────────────────────────────────────
  if (tournament.mode === 'league') {
    return (
      <div className="space-y-4">
        {/* Session timer + undo */}
        <div className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-3">
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Session</span>
            <div className="text-white font-mono font-bold text-xl">{formatTime(elapsed)}</div>
          </div>
          {canUndo && (
            <button onClick={onUndo} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors">
              ↩️ Undo
            </button>
          )}
        </div>

        {/* Add match form */}
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
          <h3 className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">📊 Add Match Result</h3>
          <div className="space-y-3">
            <select value={lHomeId ?? ''} onChange={(e) => setLHomeId(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-400">
              <option value="">Home team…</option>
              {sortedTeams.map((t) => <option key={t.id} value={t.id}>{t.emoji ? `${t.emoji} ` : ''}{t.name}</option>)}
            </select>
            <div className="flex gap-3">
              <input type="number" min="0" value={lHomeScore} onChange={(e) => setLHomeScore(e.target.value)} placeholder="0" className="flex-1 bg-slate-700 border border-slate-600 text-white text-center text-2xl font-bold rounded-lg py-2.5 outline-none focus:border-purple-400" />
              <div className="flex items-center text-slate-500 font-bold">–</div>
              <input type="number" min="0" value={lAwayScore} onChange={(e) => setLAwayScore(e.target.value)} placeholder="0" className="flex-1 bg-slate-700 border border-slate-600 text-white text-center text-2xl font-bold rounded-lg py-2.5 outline-none focus:border-purple-400" />
            </div>
            <select value={lAwayId ?? ''} onChange={(e) => setLAwayId(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-400">
              <option value="">Away team…</option>
              {sortedTeams.map((t) => <option key={t.id} value={t.id}>{t.emoji ? `${t.emoji} ` : ''}{t.name}</option>)}
            </select>
            <button onClick={handleLeagueSubmit} disabled={!lHomeId || !lAwayId || lHomeId === lAwayId} className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors">
              ✅ Add Result
            </button>
          </div>
        </div>

        {/* Recent matches */}
        {tournament.matches.length > 0 && (
          <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
            <h3 className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-3">Recent Matches</h3>
            <div className="space-y-2">
              {tournament.matches.slice(0, 5).map((m) => {
                const home = tournament.teams.find((t) => t.id === m.homeTeamId);
                const away = tournament.teams.find((t) => t.id === m.awayTeamId);
                return (
                  <div key={m.id} className="flex items-center justify-between text-sm bg-slate-700/40 rounded-lg px-3 py-2">
                    <span className="text-white font-medium flex-1 text-right">{home?.emoji}{home?.name}</span>
                    <span className="text-white font-black mx-3">{m.homeScore}–{m.awayScore}</span>
                    <span className="text-white font-medium flex-1">{away?.emoji}{away?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Queue (Winner Stays On) mode ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Session timer + undo row */}
      <div className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-3">
        <div>
          <span className="text-slate-400 text-xs uppercase tracking-wider">Session</span>
          <div className="text-white font-mono font-bold text-xl">{formatTime(elapsed)}</div>
        </div>
        <div className="flex gap-2">
          {canUndo && (
            <button onClick={onUndo} className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors">
              ↩️ Undo
            </button>
          )}
          <button onClick={openArrange} className="px-3 py-2 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded-xl text-xs transition-colors">
            🔀 Arrange
          </button>
        </div>
      </div>

      {/* H2H preview */}
      {h2h && h2h.total > 0 && homeTeam && awayTeam && (
        <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl px-4 py-3 text-center">
          <p className="text-indigo-300 text-xs uppercase tracking-wider mb-2">Head to Head</p>
          <div className="flex items-center justify-center gap-3">
            <div className="text-center flex-1">
              {homeTeam.emoji && <div className="text-lg">{homeTeam.emoji}</div>}
              <div className="text-white font-bold text-sm">{homeTeam.name}</div>
              <div className="text-green-400 font-black text-2xl">{h2h.w1}</div>
            </div>
            <div className="text-slate-400 text-center">
              <div className="text-xs mb-1">Draws</div>
              <div className="text-white font-bold text-lg">{h2h.draws}</div>
              <div className="text-xs mt-1">{h2h.total} played</div>
            </div>
            <div className="text-center flex-1">
              {awayTeam.emoji && <div className="text-lg">{awayTeam.emoji}</div>}
              <div className="text-white font-bold text-sm">{awayTeam.name}</div>
              <div className="text-green-400 font-black text-2xl">{h2h.w2}</div>
            </div>
          </div>
        </div>
      )}

      {/* On court panel */}
      {homeTeam && awayTeam && (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
          <h3 className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-4 text-center">🎮 On Court</h3>

          {/* Player vs player header */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="flex-1 text-center">
              {homeTeam.emoji && <div className="text-2xl">{homeTeam.emoji}</div>}
              <div className="text-white font-bold text-sm mt-1" style={{ color: homeTeam.color }}>{homeTeam.name}</div>
              <div className="text-xs text-purple-300 mt-0.5">P1</div>
            </div>
            <div className="text-slate-500 font-black text-2xl">VS</div>
            <div className="flex-1 text-center">
              {awayTeam.emoji && <div className="text-2xl">{awayTeam.emoji}</div>}
              <div className="text-white font-bold text-sm mt-1" style={{ color: awayTeam.color }}>{awayTeam.name}</div>
              <div className="text-xs text-purple-300 mt-0.5">P2</div>
            </div>
          </div>

          {/* Quick result buttons */}
          {!scoreMode && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button onClick={() => handleQuickResult(1, 0)} className="py-4 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors text-sm flex flex-col items-center gap-1">
                {homeTeam.emoji ?? '🏆'}
                <span>P1 Wins</span>
              </button>
              <button onClick={() => handleQuickResult(0, 0)} className="py-4 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-colors text-sm flex flex-col items-center gap-1">
                🤝<span>Draw</span>
              </button>
              <button onClick={() => handleQuickResult(0, 1)} className="py-4 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm flex flex-col items-center gap-1">
                {awayTeam.emoji ?? '🏆'}
                <span>P2 Wins</span>
              </button>
            </div>
          )}

          {/* Toggle detailed score */}
          <button onClick={() => setScoreMode((v) => !v)} className="w-full text-xs text-slate-400 hover:text-white transition-colors underline decoration-dotted mb-3">
            {scoreMode ? '← Back to quick buttons' : '🔢 Enter exact score instead'}
          </button>

          {scoreMode && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="0" className="flex-1 bg-slate-700 border border-slate-600 text-white text-center text-3xl font-bold rounded-lg py-3 outline-none focus:border-purple-400" />
                <div className="text-slate-400 font-black text-xl">–</div>
                <input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="0" className="flex-1 bg-slate-700 border border-slate-600 text-white text-center text-3xl font-bold rounded-lg py-3 outline-none focus:border-purple-400" />
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button onClick={handleDetailedResult} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">✅ Submit</button>
            </div>
          )}

          {/* Rules reminder */}
          <div className="grid grid-cols-3 gap-1 text-xs text-slate-400 bg-slate-900/40 rounded-lg p-2 mt-3 text-center">
            <div>🏆 Win → stays</div>
            <div>🤝 Draw → both out</div>
            <div>👋 Loss → back</div>
          </div>
        </div>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
          <h3 className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-3">🪑 Queue</h3>
          <div className="space-y-2">
            {queue.map((team, i) => (
              <div key={team!.id} className="flex items-center gap-3 bg-slate-700/40 rounded-lg px-3 py-2.5">
                <span className="text-slate-500 font-mono text-xs">#{i + 1}</span>
                {team!.emoji && <span>{team!.emoji}</span>}
                <span className="text-white text-sm font-medium flex-1" style={{ color: team!.color }}>{team!.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arrange modal */}
      {showArrange && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-1">🔀 Arrange Players</h2>
            <p className="text-slate-400 text-xs mb-4">Top 2 are on court. Rest wait in queue order.</p>
            <div className="space-y-2 mb-6">
              {queueDraft.map((id, i) => {
                const team = tournament.teams.find((t) => t.id === id);
                if (!team) return null;
                return (
                  <div key={id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 border', i < 2 ? 'bg-purple-900/40 border-purple-500/50' : 'bg-slate-700/50 border-slate-600/50')}>
                    <span className="text-slate-400 text-xs w-5 text-center">{i < 2 ? '🎮' : i + 1}</span>
                    {team.emoji && <span>{team.emoji}</span>}
                    <span className="flex-1 text-white text-sm font-medium" style={{ color: team.color }}>{team.name}</span>
                    {i < 2 && <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">{i === 0 ? 'P1' : 'P2'}</span>}
                    <div className="flex flex-col">
                      <button onClick={() => moveQueueItem(i, i - 1)} disabled={i === 0} className="text-slate-400 hover:text-white disabled:opacity-20 text-xs px-1">▲</button>
                      <button onClick={() => moveQueueItem(i, i + 1)} disabled={i === queueDraft.length - 1} className="text-slate-400 hover:text-white disabled:opacity-20 text-xs px-1">▼</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowArrange(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">Cancel</button>
              <button onClick={saveArrange} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
