import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from './utils/cn';
import {
  addMatchResult, addNewTeam, addTournament, importTournamentData,
  isTournamentComplete, loadTournamentCollection, markCelebrationShown,
  recordQueueResult, removeTournament, removeTeam, resetTournament,
  saveTournamentCollection, setCurrentTournament, setTournamentLength,
  setTournamentMode, sortTeams, updateTournamentInCollection,
  updateTeamAppearance, updateTeamName,
  type TournamentCollection, type TournamentData, type TournamentMode,
} from './lib/tournament';
import CelebrationOverlay from './components/CelebrationOverlay';
import PlayPage from './pages/PlayPage';
import StandingsPage from './pages/StandingsPage';
import RecordsPage from './pages/RecordsPage';
import SettingsPage from './pages/SettingsPage';

type Tab = 'play' | 'table' | 'records' | 'settings';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'play',     icon: '🎮', label: 'Play'      },
  { key: 'table',    icon: '🏆', label: 'Table'     },
  { key: 'records',  icon: '📊', label: 'Records'   },
  { key: 'settings', icon: '⚙️',  label: 'Settings'  },
];

export default function App() {
  const [collection, setCollection] = useState<TournamentCollection>(() => loadTournamentCollection());
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const [undoSnapshot, setUndoSnapshot] = useState<TournamentData | null>(null);
  const [toast, setToast] = useState('');

  // ── Session timer — lives here so it survives tab switches ──────────────
  const accumulatedRef = useRef(0);
  const lastTickRef = useRef(Date.now());
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);

  useEffect(() => {
    if (timerPaused) return;
    const iv = setInterval(() => {
      const now = Date.now();
      accumulatedRef.current += now - lastTickRef.current;
      lastTickRef.current = now;
      setTimerElapsed(Math.floor(accumulatedRef.current / 1000));
    }, 1000);
    lastTickRef.current = Date.now();
    return () => clearInterval(iv);
  }, [timerPaused]);

  const handlePauseTimer = () => {
    if (!timerPaused) {
      accumulatedRef.current += Date.now() - lastTickRef.current;
      setTimerElapsed(Math.floor(accumulatedRef.current / 1000));
    } else {
      lastTickRef.current = Date.now();
    }
    setTimerPaused((p) => !p);
  };

  const handleResetTimer = () => {
    accumulatedRef.current = 0;
    lastTickRef.current = Date.now();
    setTimerElapsed(0);
    setTimerPaused(false);
  };

  const activeTournament = useMemo(
    () => collection.tournaments.find((t) => t.id === collection.currentId) ?? collection.tournaments[0],
    [collection]
  );
  const sortedTeams = useMemo(() => sortTeams(activeTournament?.teams ?? []), [activeTournament]);
  const isComplete = useMemo(() => !!activeTournament && isTournamentComplete(activeTournament), [activeTournament]);
  const showCelebration = isComplete && !!activeTournament && !activeTournament.celebrationShown;

  useEffect(() => { saveTournamentCollection(collection); }, [collection]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const update = (fn: (t: TournamentData) => TournamentData) => {
    if (!activeTournament) return;
    setCollection((prev) => updateTournamentInCollection(prev, fn(activeTournament)));
  };

  const updateWithUndo = (fn: (t: TournamentData) => TournamentData) => {
    if (!activeTournament) return;
    setUndoSnapshot(activeTournament);
    setCollection((prev) => updateTournamentInCollection(prev, fn(activeTournament)));
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onUndo = () => {
    if (!undoSnapshot) return;
    setCollection((prev) => updateTournamentInCollection(prev, undoSnapshot));
    setUndoSnapshot(null);
    showToast('↩️ Undone!');
  };

  const onAddMatch = (homeId: number, awayId: number, hs: number, as_: number) =>
    updateWithUndo((t) => addMatchResult(t, homeId, awayId, hs, as_));

  const onQueueResult = (hs: number, as_: number) =>
    updateWithUndo((t) => recordQueueResult(t, hs, as_));

  const onArrangeQueue = (order: number[]) =>
    update((t) => ({ ...t, onCourt: [order[0], order[1]] as [number, number], queueOrder: order.slice(2) }));

  const onSetMode = (mode: TournamentMode) => update((t) => setTournamentMode(t, mode));
  const onSetLength = (length: number | null) => update((t) => setTournamentLength(t, length));
  const onUpdateName = (name: string) => update((t) => ({ ...t, tournamentName: name }));
  const onResetTournament = () => { setUndoSnapshot(null); update((t) => resetTournament(t)); };
  const onUpdateTeamName = (id: number, name: string) => update((t) => updateTeamName(t, id, name));
  const onUpdateAppearance = (id: number, color?: string, emoji?: string) => update((t) => updateTeamAppearance(t, id, color, emoji));
  const onAddTeam = () => update((t) => addNewTeam(t));
  const onRemoveTeam = (id: number) => update((t) => removeTeam(t, id));
  const onDismissCelebration = () => update((t) => markCelebrationShown(t));

  const onAddTournament = () => {
    const name = prompt('Tournament name:');
    if (!name?.trim()) return;
    setCollection((prev) => addTournament(prev, name.trim()));
    setUndoSnapshot(null);
  };
  const onRemoveTournament = () => {
    if (collection.tournaments.length <= 1) { showToast('Need at least one tournament'); return; }
    if (!confirm('Delete this tournament?')) return;
    setCollection((prev) => removeTournament(prev, collection.currentId));
    setUndoSnapshot(null);
  };
  const onSelectTournament = (id: number) => {
    setCollection((prev) => setCurrentTournament(prev, id));
    setUndoSnapshot(null);
  };
  const onImport = (json: string) => {
    const imported = importTournamentData(json);
    setCollection((prev) => ({ ...prev, currentId: imported.id, tournaments: [...prev.tournaments, imported] }));
  };
  const onExport = () => {
    if (!activeTournament) return;
    const blob = new Blob([JSON.stringify(activeTournament, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTournament.tournamentName.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeTournament) return null;

  const podium = sortedTeams.slice(0, 3).map((t, i) => ({ name: t.name, points: t.points, position: i + 1, emoji: t.emoji, color: t.color }));

  // Progress pill for header
  const progress = activeTournament.tournamentLength
    ? `${activeTournament.matches.length}/${activeTournament.tournamentLength}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {showCelebration && <CelebrationOverlay podium={podium} onDismiss={onDismissCelebration} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="text-center pt-6 pb-4 px-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white truncate max-w-xs sm:max-w-none">
            {activeTournament.tournamentName}
          </h1>
          {progress && (
            <span className="text-xs bg-purple-800/60 text-purple-300 px-2.5 py-1 rounded-full font-mono">
              {progress}
            </span>
          )}
          {isComplete && (
            <button onClick={() => update((t) => ({ ...t, celebrationShown: false }))} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2.5 py-1 rounded-full transition-colors">
              🏆 Results
            </button>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-purple-300/70">
          <span>{activeTournament.mode === 'queue' ? '🎮 Winner Stays On' : '📊 League'}</span>
          <span>·</span>
          <span>{activeTournament.teams.length} players</span>
          {activeTournament.matches.length > 0 && <><span>·</span><span>{activeTournament.matches.length} matches</span></>}
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          {activeTab === 'play' && (
            <PlayPage
              tournament={activeTournament}
              canUndo={!!undoSnapshot}
              onUndo={onUndo}
              onQueueResult={onQueueResult}
              onAddMatch={onAddMatch}
              onArrangeQueue={onArrangeQueue}
              timerElapsed={timerElapsed}
              timerPaused={timerPaused}
              onPauseTimer={handlePauseTimer}
              onResetTimer={handleResetTimer}
            />
          )}
          {activeTab === 'table' && <StandingsPage tournament={activeTournament} />}
          {activeTab === 'records' && <RecordsPage tournament={activeTournament} showToast={showToast} />}
          {activeTab === 'settings' && (
            <SettingsPage
              tournament={activeTournament}
              collection={collection}
              onUpdateName={onUpdateName}
              onSetMode={onSetMode}
              onSetLength={onSetLength}
              onUpdateTeamName={onUpdateTeamName}
              onUpdateAppearance={onUpdateAppearance}
              onAddTeam={onAddTeam}
              onRemoveTeam={onRemoveTeam}
              onResetTournament={onResetTournament}
              onAddTournament={onAddTournament}
              onRemoveTournament={onRemoveTournament}
              onSelectTournament={onSelectTournament}
              onImport={onImport}
              onExport={onExport}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      {/* ── Bottom navigation ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700/60 z-30 flex-shrink-0">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors',
                activeTab === tab.key ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 w-10 h-0.5 bg-purple-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toast ───────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
