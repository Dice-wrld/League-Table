import { useEffect, useMemo, useState } from 'react';
import { cn } from './utils/cn';
import {
  addMatchResult,
  addNewTeam,
  addTournament,
  importTournamentData,
  isTournamentComplete,
  loadTournamentCollection,
  markCelebrationShown,
  recordQueueResult,
  removeTournament,
  removeTeam,
  resetTournament,
  saveTournamentCollection,
  setCurrentTournament,
  setTournamentLength,
  setTournamentMode,
  sortTeams,
  updateTournamentInCollection,
  updateTeamName,
  type TournamentCollection,
} from './lib/tournament';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getFormColor = (result: 'W' | 'D' | 'L') => {
  if (result === 'W') return 'bg-green-500';
  if (result === 'D') return 'bg-gray-500';
  return 'bg-red-500';
};

const getZoneClass = (position: number, total: number) => {
  if (position === 1) return 'border-l-4 border-yellow-400';
  if (position === 2) return 'border-l-4 border-gray-400';
  if (position === 3) return 'border-l-4 border-amber-600';
  if (position === total) return 'border-l-4 border-red-600';
  return 'border-l-4 border-transparent';
};

const getPositionChange = (current: number, previous?: number) => {
  if (!previous || previous === current) return null;
  return previous > current ? 'up' : 'down';
};

// ─── Celebration overlay ─────────────────────────────────────────────────────

function CelebrationOverlay({
  podium,
  onDismiss,
}: {
  podium: { name: string; points: number; position: number }[];
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumOrder = [1, 0, 2]; // visual order: 2nd | 1st | 3rd

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-500 px-4',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Trophy */}
      <div className="text-center mb-2">
        <div
          className="text-8xl mb-2 inline-block"
          style={{ animation: 'trophyBounce 0.8s ease-in-out infinite alternate' }}
        >
          🏆
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">Tournament Over!</h1>
        <p className="text-purple-300 text-base sm:text-lg">Here are your champions</p>
      </div>

      {/* Podium — visual order: 2nd | 1st | 3rd */}
      <div className="flex items-end justify-center gap-3 mt-6 mb-8 w-full max-w-sm">
        {podiumOrder.map((idx) => {
          const player = podium[idx];
          if (!player) return null;
          // Indexed by rank (0=1st, 1=2nd, 2=3rd)
          const heights = ['h-36', 'h-28', 'h-20'];      // 1st tallest
          const colors  = ['bg-yellow-400', 'bg-gray-400', 'bg-amber-600']; // gold, silver, bronze
          const textColors = ['text-yellow-900', 'text-gray-900', 'text-amber-100'];
          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="text-2xl mb-1">{medals[idx]}</div>
              <div className="text-white text-xs font-bold text-center mb-1 px-1 leading-tight">
                {player.name}
              </div>
              <div className="text-purple-300 text-xs mb-2">{player.points} pts</div>
              <div
                className={cn(
                  'w-full rounded-t-lg flex items-center justify-center font-black text-xl',
                  heights[idx],
                  colors[idx],
                  textColors[idx]
                )}
              >
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="mt-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-base"
      >
        🎮 Keep Playing
      </button>

      <style>{`
        @keyframes trophyBounce {
          from { transform: translateY(0) rotate(-5deg); }
          to   { transform: translateY(-12px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Queue mode panel ─────────────────────────────────────────────────────────

function QueuePanel({
  tournament,
  onResult,
  onArrange,
}: {
  tournament: ReturnType<typeof loadTournamentCollection>['tournaments'][number];
  onResult: (homeScore: number, awayScore: number) => void;
  onArrange: () => void;
}) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [error, setError] = useState('');

  const homeTeam = tournament.teams.find((t) => t.id === tournament.onCourt[0]);
  const awayTeam = tournament.teams.find((t) => t.id === tournament.onCourt[1]);
  const queue = tournament.queueOrder
    .map((id) => tournament.teams.find((t) => t.id === id))
    .filter(Boolean);

  const handleSubmit = () => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Enter valid scores (0 or above)');
      return;
    }
    setError('');
    setHomeScore('');
    setAwayScore('');
    onResult(h, a);
  };

  if (!homeTeam || !awayTeam) return null;

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-purple-300 text-xs font-bold uppercase tracking-widest">
          🎮 On Court Now
        </h3>
        <button
          onClick={onArrange}
          className="text-xs text-slate-400 hover:text-white transition-colors border border-slate-600 hover:border-slate-400 px-2 py-1 rounded-lg"
        >
          🔀 Arrange Players
        </button>
      </div>

      {/* Score entry */}
      <div className="flex items-center gap-2 justify-center mb-4">
        {/* Home */}
        <div className="flex-1 text-center">
          <div className="text-white font-bold text-sm mb-2 truncate px-1">{homeTeam.name}</div>
          <input
            type="number"
            min="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder="0"
            className="w-full bg-slate-700 border border-slate-600 text-white text-center text-2xl font-bold rounded-lg py-3 outline-none focus:border-purple-400"
          />
        </div>

        <div className="text-slate-400 font-bold text-xl flex-shrink-0">VS</div>

        {/* Away */}
        <div className="flex-1 text-center">
          <div className="text-white font-bold text-sm mb-2 truncate px-1">{awayTeam.name}</div>
          <input
            type="number"
            min="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder="0"
            className="w-full bg-slate-700 border border-slate-600 text-white text-center text-2xl font-bold rounded-lg py-3 outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
      >
        ✅ Submit Result
      </button>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="mt-4">
          <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-2 text-center">
            🪑 Waiting Queue
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {queue.map((team, i) => (
              <div
                key={team!.id}
                className="flex items-center gap-1.5 bg-slate-700/60 px-3 py-1.5 rounded-lg border border-slate-600"
              >
                <span className="text-slate-400 text-xs">#{i + 1}</span>
                <span className="text-white text-sm font-medium">{team!.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg p-3">
        <div>🏆 Win → stays on</div>
        <div>👋 Lose → back of queue</div>
        <div className="col-span-2">🤝 Draw → both go to back, next two step up</div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [collection, setCollection] = useState<TournamentCollection>(() => loadTournamentCollection());
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showLengthSetter, setShowLengthSetter] = useState(false);
  const [showArrangeQueue, setShowArrangeQueue] = useState(false);
  const [queueDraft, setQueueDraft] = useState<number[]>([]);
  const [pendingLength, setPendingLength] = useState('');
  const [homeTeamId, setHomeTeamId] = useState<number | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [importText, setImportText] = useState('');
  const [newTeamNames, setNewTeamNames] = useState<Record<number, string>>({});

  const activeTournament = useMemo(
    () => collection.tournaments.find((t) => t.id === collection.currentId) ?? collection.tournaments[0],
    [collection]
  );

  const sortedTeams = useMemo(() => sortTeams(activeTournament?.teams ?? []), [activeTournament]);

  const isComplete = useMemo(
    () => !!activeTournament && isTournamentComplete(activeTournament),
    [activeTournament]
  );

  const showCelebration = isComplete && !!activeTournament && !activeTournament.celebrationShown;

  useEffect(() => {
    saveTournamentCollection(collection);
  }, [collection]);

  useEffect(() => {
    if (activeTournament) {
      setNewTeamNames(Object.fromEntries(activeTournament.teams.map((t) => [t.id, t.name])));
    }
  }, [activeTournament]);

  const updateCollection = (updater: (t: typeof activeTournament) => typeof activeTournament) => {
    if (!activeTournament) return;
    const updated = updater(activeTournament);
    if (!updated) return;
    setCollection((prev) => updateTournamentInCollection(prev, updated));
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const onUpdateTournamentName = (name: string) => updateCollection((t) => ({ ...t!, tournamentName: name }));

  const onAddMatch = () => {
    if (homeTeamId === null || awayTeamId === null) return;
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a)) return;
    updateCollection((t) => addMatchResult(t!, homeTeamId, awayTeamId, h, a));
    setHomeScore('');
    setAwayScore('');
    setShowAddMatch(false);
  };

  const onQueueResult = (h: number, a: number) => {
    updateCollection((t) => recordQueueResult(t!, h, a));
  };

  const onSetMode = (mode: 'league' | 'queue') => {
    updateCollection((t) => setTournamentMode(t!, mode));
  };

  const onOpenArrangeQueue = () => {
    // Full ordered list: on-court first, then queue
    const full = [...activeTournament.onCourt, ...activeTournament.queueOrder];
    setQueueDraft(full);
    setShowArrangeQueue(true);
  };

  const onMoveQueueItem = (from: number, to: number) => {
    setQueueDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const onSaveQueueOrder = () => {
    updateCollection((t) => ({
      ...t!,
      onCourt: [queueDraft[0], queueDraft[1]] as [number, number],
      queueOrder: queueDraft.slice(2),
    }));
    setShowArrangeQueue(false);
  };

  const onSaveLength = () => {
    const n = parseInt(pendingLength);
    updateCollection((t) => setTournamentLength(t!, isNaN(n) || n <= 0 ? null : n));
    setShowLengthSetter(false);
    setPendingLength('');
  };

  const onDismissCelebration = () => {
    updateCollection((t) => markCelebrationShown(t!));
  };

  const onResetTournament = () => {
    if (!confirm('Reset all match data? Team names will be kept.')) return;
    updateCollection((t) => resetTournament(t!));
  };

  const onAddTeam = () => updateCollection((t) => addNewTeam(t!));

  const onRemoveTeam = (id: number) => {
    if (activeTournament && activeTournament.teams.length <= 2) {
      alert('Need at least 2 teams');
      return;
    }
    if (!confirm('Remove this team?')) return;
    updateCollection((t) => removeTeam(t!, id));
  };

  const onSaveTeamNames = () => {
    let updated = activeTournament!;
    Object.entries(newTeamNames).forEach(([idStr, name]) => {
      if (name.trim()) updated = updateTeamName(updated, parseInt(idStr), name.trim());
    });
    setCollection((prev) => updateTournamentInCollection(prev, updated));
    setShowEditTeams(false);
  };

  const onAddTournament = () => {
    const name = prompt('Tournament name:');
    if (!name?.trim()) return;
    setCollection((prev) => addTournament(prev, name.trim()));
  };

  const onRemoveTournament = () => {
    if (collection.tournaments.length <= 1) { alert('Need at least one tournament'); return; }
    if (!confirm('Delete this tournament?')) return;
    setCollection((prev) => removeTournament(prev, collection.currentId));
  };

  const onImport = () => {
    try {
      const imported = importTournamentData(importText);
      setCollection((prev) => ({
        ...prev,
        currentId: imported.id,
        tournaments: [...prev.tournaments, imported],
      }));
      setImportText('');
      setShowImportExport(false);
    } catch {
      alert('Invalid tournament data');
    }
  };

  const onExport = () => {
    if (!activeTournament) return;
    const data = JSON.stringify(activeTournament, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTournament.tournamentName.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [shareToast, setShareToast] = useState('');

  const showToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(''), 2500);
  };

  const onShare = async () => {
    if (!activeTournament) return;
    const data = JSON.stringify(activeTournament, null, 2);
    const filename = `${activeTournament.tournamentName.replace(/\s+/g, '-')}.json`;

    // 1. Try native file share (works on Android Chrome over HTTPS)
    try {
      const file = new File([data], filename, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: activeTournament.tournamentName });
        return;
      }
    } catch {
      // share was cancelled or failed — fall through
    }

    // 2. Try sharing just the site URL + standings summary as text
    const summary = sortedTeams
      .slice(0, 3)
      .map((t, i) => `${i + 1}. ${t.name} — ${t.points} pts`)
      .join('\n');
    const shareText = `🏆 ${activeTournament.tournamentName}\n\n${summary}\n\ndice-league.netlify.app`;
    try {
      if (navigator.share) {
        await navigator.share({ title: activeTournament.tournamentName, text: shareText });
        return;
      }
    } catch {
      // cancelled or not supported
    }

    // 3. Copy JSON to clipboard
    try {
      await navigator.clipboard.writeText(data);
      showToast('✅ Copied to clipboard!');
      return;
    } catch {
      // clipboard blocked
    }

    // 4. Last resort: download file
    onExport();
    showToast('⬇️ Downloaded as file');
  };

  if (!activeTournament) return null;

  const podiumData = sortedTeams.slice(0, 3).map((t, i) => ({
    name: t.name,
    points: t.points,
    position: i + 1,
  }));

  const matchProgress =
    activeTournament.tournamentLength !== null
      ? `${activeTournament.matches.length} / ${activeTournament.tournamentLength} matches`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay podium={podiumData} onDismiss={onDismissCelebration} />
      )}

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">

        {/* ── Tournament picker + controls ─────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <select
            value={collection.currentId}
            onChange={(e) => setCollection((prev) => setCurrentTournament(prev, parseInt(e.target.value)))}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
          >
            {collection.tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.tournamentName}</option>
            ))}
          </select>
          <button
            onClick={onAddTournament}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + New Tournament
          </button>
          <button
            onClick={onRemoveTournament}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Delete Tournament
          </button>
        </div>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <input
            type="text"
            value={activeTournament.tournamentName}
            onChange={(e) => onUpdateTournamentName(e.target.value)}
            className="w-full max-w-2xl mx-auto text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight bg-transparent border-b-2 border-transparent hover:border-white/30 focus:border-white/50 outline-none text-center transition-colors px-4"
            placeholder="Tournament Name"
          />
          <p className="text-purple-300 text-sm">League Standings</p>

          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => onSetMode('league')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors border',
                activeTournament.mode === 'league'
                  ? 'bg-purple-600 border-purple-400 text-white'
                  : 'bg-transparent border-slate-600 text-slate-400 hover:text-white'
              )}
            >
              📊 League
            </button>
            <button
              onClick={() => onSetMode('queue')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors border',
                activeTournament.mode === 'queue'
                  ? 'bg-purple-600 border-purple-400 text-white'
                  : 'bg-transparent border-slate-600 text-slate-400 hover:text-white'
              )}
            >
              🎮 Winner Stays On
            </button>
          </div>

          {/* Tournament length */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {matchProgress && (
              <span className="text-purple-300 text-xs font-mono bg-purple-900/40 px-3 py-1 rounded-full">
                {matchProgress}
              </span>
            )}
            <button
              onClick={() => { setPendingLength(activeTournament.tournamentLength?.toString() ?? ''); setShowLengthSetter(true); }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-dotted"
            >
              {activeTournament.tournamentLength ? '✏️ Change length' : '⚙️ Set tournament length'}
            </button>
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {activeTournament.mode === 'league' && (
            <button
              onClick={() => setShowAddMatch(true)}
              disabled={isComplete}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
            >
              ➕ Add Match Result
            </button>
          )}
          <button
            onClick={() => setShowEditTeams(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
          >
            ✏️ Edit Teams
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-colors"
          >
            🕐 View History
          </button>
          <button
            onClick={() => setShowImportExport(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors"
          >
            📤 Import / Export
          </button>
          <button
            onClick={onResetTournament}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            🔄 Reset Tournament
          </button>
          {isComplete && (
            <button
              onClick={() => updateCollection((t) => ({ ...t!, celebrationShown: false }))}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-sm font-bold transition-colors"
            >
              🏆 Show Results
            </button>
          )}
        </div>

        {/* ── Queue panel (Winner Stays On mode) ───────────────────── */}
        {activeTournament.mode === 'queue' && !isComplete && (
          <QueuePanel tournament={activeTournament} onResult={onQueueResult} onArrange={onOpenArrangeQueue} />
        )}

        {/* ── Legend ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-300 mb-4 bg-slate-800/30 rounded-lg p-3">
          <span>🟡 Champion</span>
          <span>⬜ Runner-up</span>
          <span>🟫 Third Place</span>
          <span>🔴 Last Place</span>
        </div>

        {/* ── Desktop table ────────────────────────────────────────── */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
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
                {sortedTeams.map((team, index) => {
                  const position = index + 1;
                  const posChange = getPositionChange(position, team.previousPosition);
                  const isOnCourt =
                    activeTournament.mode === 'queue' && activeTournament.onCourt.includes(team.id);
                  return (
                    <tr
                      key={team.id}
                      className={cn(
                        'border-t border-slate-700/50 transition-all duration-700',
                        getZoneClass(position, sortedTeams.length),
                        isOnCourt ? 'bg-purple-900/30' : 'hover:bg-slate-700/30'
                      )}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-white font-bold">{position}</span>
                          {posChange === 'up' && <span className="text-green-400 text-xs">↑{Math.abs((team.previousPosition ?? position) - position)}</span>}
                          {posChange === 'down' && <span className="text-red-400 text-xs">↓{Math.abs((team.previousPosition ?? position) - position)}</span>}
                          {!posChange && <span className="text-slate-500 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{team.name}</span>
                          {isOnCourt && (
                            <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">ON</span>
                          )}
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
                            ? [...team.form].reverse().map((result, i) => (
                                <div
                                  key={i}
                                  className={cn('w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold', getFormColor(result))}
                                  title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
                                >
                                  {result}
                                </div>
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

          {/* ── Mobile cards ─────────────────────────────────────────── */}
          <div className="md:hidden">
            {sortedTeams.map((team, index) => {
              const position = index + 1;
              const posChange = getPositionChange(position, team.previousPosition);
              const isOnCourt =
                activeTournament.mode === 'queue' && activeTournament.onCourt.includes(team.id);
              return (
                <div
                  key={team.id}
                  className={cn(
                    'border-t border-slate-700/50 p-4 transition-all duration-700',
                    getZoneClass(position, sortedTeams.length),
                    isOnCourt ? 'bg-purple-900/30' : ''
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white">{position}</span>
                      {posChange === 'up' && <span className="text-green-400 text-sm">↑{Math.abs((team.previousPosition ?? position) - position)}</span>}
                      {posChange === 'down' && <span className="text-red-400 text-sm">↓{Math.abs((team.previousPosition ?? position) - position)}</span>}
                      {!posChange && <span className="text-slate-500 text-sm">—</span>}
                      <span className="text-white font-semibold">{team.name}</span>
                      {isOnCourt && (
                        <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">ON</span>
                      )}
                    </div>
                    <div className="text-white font-black text-2xl">{team.points}</div>
                  </div>
                  <div className="grid grid-cols-6 gap-1 text-center text-xs mb-3">
                    {[['PL', team.played], ['W', team.won], ['D', team.drawn], ['L', team.lost], ['GF', team.goalsFor], ['GA', team.goalsAgainst]].map(([label, val]) => (
                      <div key={label as string} className="bg-slate-700/50 rounded p-1.5">
                        <div className="text-slate-400 text-xs">{label}</div>
                        <div className="text-white font-bold">{val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {team.form.length > 0
                      ? [...team.form].reverse().map((result, i) => (
                          <div
                            key={i}
                            className={cn('flex-1 h-7 rounded flex items-center justify-center text-white text-xs font-bold', getFormColor(result))}
                          >
                            {result}
                          </div>
                        ))
                      : <span className="text-slate-500 text-sm">No matches yet</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer info ───────────────────────────────────────────── */}
        <div className="mt-6 text-center text-purple-200 text-sm">
          <p>PL = Played, W = Won, D = Drawn, L = Lost</p>
          <p>GF = Goals/Points For, GA = Goals/Points Against, GD = Goal/Point Difference, PTS = Points</p>
          <p className="mt-2 text-purple-300">💾 Your data is automatically saved in your browser</p>
          <p className="mt-4 text-purple-300/70 text-xs">
            🎮 Vibe-coded with way too much coffee by{' '}
            <a
              href="https://github.com/Dice-wrld"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-200 hover:text-white underline decoration-dotted transition-colors"
            >
              Dice-wrld
            </a>
          </p>
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* ── Tournament length setter ─────────────────────────────── */}
      {showLengthSetter && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-2">⚙️ Tournament Length</h2>
            <p className="text-slate-400 text-sm mb-4">
              Set a total number of matches. The tournament ends and a winner is declared when that number is reached. Leave blank for an unlimited tournament.
            </p>
            <input
              type="number"
              min="1"
              value={pendingLength}
              onChange={(e) => setPendingLength(e.target.value)}
              placeholder="e.g. 20"
              className="w-full bg-slate-700 border border-slate-600 text-white text-center text-2xl font-bold rounded-xl py-3 outline-none focus:border-purple-400 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowLengthSetter(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
                Cancel
              </button>
              {activeTournament.tournamentLength && (
                <button
                  onClick={() => { updateCollection((t) => setTournamentLength(t!, null)); setShowLengthSetter(false); }}
                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl transition-colors"
                >
                  Clear
                </button>
              )}
              <button onClick={onSaveLength} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Match (league mode) ──────────────────────────────── */}
      {showAddMatch && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Add Match Result</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Home Team</label>
                <select value={homeTeamId ?? ''} onChange={(e) => setHomeTeamId(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400">
                  <option value="">Select team…</option>
                  {activeTournament.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-slate-400 text-sm mb-1 block">Home Score</label>
                  <input type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white text-center text-xl rounded-lg py-2 outline-none focus:border-purple-400" placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="text-slate-400 text-sm mb-1 block">Away Score</label>
                  <input type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white text-center text-xl rounded-lg py-2 outline-none focus:border-purple-400" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Away Team</label>
                <select value={awayTeamId ?? ''} onChange={(e) => setAwayTeamId(parseInt(e.target.value))} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400">
                  <option value="">Select team…</option>
                  {activeTournament.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddMatch(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">Cancel</button>
              <button onClick={onAddMatch} disabled={!homeTeamId || !awayTeamId || homeTeamId === awayTeamId} className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors">Add Result</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Teams ──────────────────────────────────────────────── */}
      {showEditTeams && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">✏️ Edit Teams</h2>
            <div className="space-y-3 mb-4">
              {activeTournament.teams.map((team) => (
                <div key={team.id} className="flex gap-2">
                  <input
                    type="text"
                    value={newTeamNames[team.id] ?? team.name}
                    onChange={(e) => setNewTeamNames((prev) => ({ ...prev, [team.id]: e.target.value }))}
                    className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-400"
                  />
                  <button onClick={() => onRemoveTeam(team.id)} className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm">✕</button>
                </div>
              ))}
            </div>
            <button onClick={onAddTeam} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl mb-4 transition-colors text-sm">+ Add Team</button>
            <div className="flex gap-2">
              <button onClick={() => setShowEditTeams(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">Cancel</button>
              <button onClick={onSaveTeamNames} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Match History ────────────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">🕐 Match History</h2>
            {activeTournament.matches.length === 0
              ? <p className="text-slate-400 text-center py-8">No matches yet</p>
              : (
                <div className="space-y-2">
                  {activeTournament.matches.map((match) => {
                    const home = activeTournament.teams.find((t) => t.id === match.homeTeamId);
                    const away = activeTournament.teams.find((t) => t.id === match.awayTeamId);
                    return (
                      <div key={match.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-white text-sm font-medium flex-1 text-right">{home?.name}</span>
                        <span className="text-white font-black mx-3 text-lg">{match.homeScore} – {match.awayScore}</span>
                        <span className="text-white text-sm font-medium flex-1">{away?.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            <button onClick={() => setShowHistory(false)} className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* ── Import / Export ──────────────────────────────────────── */}
      {showImportExport && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">📤 Import / Export</h2>
            <div className="space-y-3 mb-4">
              <button onClick={onExport} className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors">⬇️ Download JSON</button>
              <button onClick={onShare} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors">📲 Share</button>
            </div>
            <hr className="border-slate-600 mb-4" />
            <label className="text-slate-400 text-sm mb-2 block">Import JSON</label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste tournament JSON here…"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-purple-400 text-sm h-28 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowImportExport(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">Cancel</button>
              <button onClick={onImport} disabled={!importText.trim()} className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors">Import</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Arrange Queue ────────────────────────────────────────── */}
      {showArrangeQueue && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-1">🔀 Arrange Players</h2>
            <p className="text-slate-400 text-xs mb-4">
              The top 2 start on court. Everyone below waits in queue order. Use ↑ ↓ to reorder.
            </p>

            <div className="space-y-2 mb-6">
              {queueDraft.map((id, i) => {
                const team = activeTournament.teams.find((t) => t.id === id);
                if (!team) return null;
                const isOnCourt = i < 2;
                return (
                  <div
                    key={id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 border',
                      isOnCourt
                        ? 'bg-purple-900/40 border-purple-500/50'
                        : 'bg-slate-700/50 border-slate-600/50'
                    )}
                  >
                    <span className="text-slate-400 text-xs w-5 text-center font-mono">
                      {isOnCourt ? '🎮' : i + 1}
                    </span>
                    <span className="flex-1 text-white text-sm font-medium">{team.name}</span>
                    {isOnCourt && (
                      <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">
                        {i === 0 ? 'P1' : 'P2'}
                      </span>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => onMoveQueueItem(i, i - 1)}
                        disabled={i === 0}
                        className="text-slate-400 hover:text-white disabled:opacity-20 text-xs leading-none px-1"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMoveQueueItem(i, i + 1)}
                        disabled={i === queueDraft.length - 1}
                        className="text-slate-400 hover:text-white disabled:opacity-20 text-xs leading-none px-1"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowArrangeQueue(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSaveQueueOrder}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50">
          {shareToast}
        </div>
      )}
    </div>
  );
}
