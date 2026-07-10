import { useState } from 'react';
import { type TournamentCollection, type TournamentData, type TournamentMode } from '../lib/tournament';
import { cn } from '../utils/cn';

const PRESET_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffffff','#94a3b8'];
const PRESET_EMOJIS = ['⚽','🏀','🎮','🕹️','🎯','🔥','💀','👑','🦁','🐉','⚡','🌟','🏴‍☠️','👾','🎲','🦊','🐺','🦅'];

// ─── Defined OUTSIDE SettingsPage so React doesn't recreate it on every ───────
// ─── render and cause inputs inside to lose focus after every keystroke. ───────
function Section({
  id, title, children, openSection, setOpenSection,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  openSection: string;
  setOpenSection: (s: string) => void;
}) {
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpenSection(openSection === id ? '' : id)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-white font-semibold text-sm">{title}</span>
        <span className="text-slate-400 text-xs">{openSection === id ? '▲' : '▼'}</span>
      </button>
      {openSection === id && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-4">{children}</div>
      )}
    </div>
  );
}

interface SettingsPageProps {
  tournament: TournamentData;
  collection: TournamentCollection;
  onUpdateName: (name: string) => void;
  onSetMode: (mode: TournamentMode) => void;
  onSetLength: (length: number | null) => void;
  onUpdateTeamName: (id: number, name: string) => void;
  onUpdateAppearance: (id: number, color?: string, emoji?: string) => void;
  onAddTeam: () => void;
  onRemoveTeam: (id: number) => void;
  onResetTournament: () => void;
  onAddTournament: () => void;
  onRemoveTournament: () => void;
  onSelectTournament: (id: number) => void;
  onImport: (json: string) => void;
  onExport: () => void;
  showToast: (msg: string) => void;
}

export default function SettingsPage({
  tournament, collection,
  onUpdateName, onSetMode, onSetLength,
  onUpdateTeamName, onUpdateAppearance, onAddTeam, onRemoveTeam, onResetTournament,
  onAddTournament, onRemoveTournament, onSelectTournament,
  onImport, onExport, showToast,
}: SettingsPageProps) {
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [teamNames, setTeamNames] = useState<Record<number, string>>(() =>
    Object.fromEntries(tournament.teams.map((t) => [t.id, t.name]))
  );
  const [pendingLength, setPendingLength] = useState(tournament.tournamentLength?.toString() ?? '');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [openSection, setOpenSection] = useState<string>('teams');

  const sp = { openSection, setOpenSection };

  return (
    <div className="space-y-3">

      {/* Tournament */}
      <Section id="tournament" title="🏆 Tournament" {...sp}>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Name</label>
            <input
              type="text"
              value={tournament.tournamentName}
              onChange={(e) => onUpdateName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-2 block">Mode</label>
            <div className="flex gap-2">
              {(['league', 'queue'] as TournamentMode[]).map((m) => (
                <button key={m} onClick={() => onSetMode(m)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors border',
                    tournament.mode === m
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-transparent border-slate-600 text-slate-400 hover:text-white')}>
                  {m === 'league' ? '📊 League' : '🎮 Winner Stays On'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Tournament Length (total matches)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={pendingLength}
                onChange={(e) => setPendingLength(e.target.value)}
                placeholder="Unlimited"
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-400"
              />
              <button
                onClick={() => {
                  const n = parseInt(pendingLength);
                  onSetLength(isNaN(n) || n <= 0 ? null : n);
                  showToast('✅ Saved');
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Save
              </button>
            </div>
            {tournament.tournamentLength && (
              <button
                onClick={() => { onSetLength(null); setPendingLength(''); showToast('Removed length limit'); }}
                className="text-xs text-red-400 hover:text-red-300 mt-2 underline decoration-dotted"
              >
                Remove limit
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onAddTournament} className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
              + New Tournament
            </button>
            {collection.tournaments.length > 1 && (
              <select
                value={collection.currentId}
                onChange={(e) => onSelectTournament(parseInt(e.target.value))}
                className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-2 text-sm focus:outline-none"
              >
                {collection.tournaments.map((t) => <option key={t.id} value={t.id}>{t.tournamentName}</option>)}
              </select>
            )}
            {collection.tournaments.length > 1 && (
              <button onClick={onRemoveTournament} className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">🗑</button>
            )}
          </div>
        </div>
      </Section>

      {/* Teams */}
      <Section id="teams" title="👥 Teams" {...sp}>
        <div className="space-y-2">
          {tournament.teams.map((team) => (
            <div key={team.id}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex-shrink-0 border border-slate-600" style={{ background: team.color ?? '#475569' }} />
                <div className="text-lg w-7 text-center flex-shrink-0">{team.emoji ?? '—'}</div>
                <input
                  type="text"
                  value={teamNames[team.id] ?? team.name}
                  onChange={(e) => setTeamNames((p) => ({ ...p, [team.id]: e.target.value }))}
                  onBlur={() => { if (teamNames[team.id]?.trim()) onUpdateTeamName(team.id, teamNames[team.id].trim()); }}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
                />
                <button
                  onClick={() => setEditingTeam(editingTeam === team.id ? null : team.id)}
                  className="px-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition-colors"
                >🎨</button>
                <button
                  onClick={() => {
                    if (tournament.teams.length <= 2) { showToast('Need at least 2 teams'); return; }
                    if (confirm('Remove this team?')) onRemoveTeam(team.id);
                  }}
                  className="px-2 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs transition-colors"
                >✕</button>
              </div>

              {editingTeam === team.id && (
                <div className="mt-2 ml-8 bg-slate-900/60 rounded-xl p-3 border border-slate-600">
                  <p className="text-slate-400 text-xs mb-2">Pick colour</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => onUpdateAppearance(team.id, c, team.emoji)}
                        className={cn('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                          team.color === c ? 'border-white scale-110' : 'border-transparent')}
                        style={{ background: c }} />
                    ))}
                    <button onClick={() => onUpdateAppearance(team.id, undefined, team.emoji)}
                      className="w-7 h-7 rounded-full border-2 border-slate-600 text-slate-400 text-xs hover:border-white transition-colors flex items-center justify-center">✕</button>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">Pick emoji</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_EMOJIS.map((e) => (
                      <button key={e} onClick={() => onUpdateAppearance(team.id, team.color, e)}
                        className={cn('w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors',
                          team.emoji === e ? 'bg-purple-600' : 'bg-slate-700 hover:bg-slate-600')}>
                        {e}
                      </button>
                    ))}
                    <button onClick={() => onUpdateAppearance(team.id, team.color, undefined)}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs flex items-center justify-center transition-colors">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={onAddTeam} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors mt-1">
            + Add Team
          </button>
        </div>
      </Section>

      {/* Data */}
      <Section id="data" title="💾 Data & Export" {...sp}>
        <div className="space-y-3">
          <button onClick={onExport} className="w-full py-2.5 bg-orange-700 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm">
            ⬇️ Download JSON Backup
          </button>
          <button onClick={() => setShowImport(!showImport)} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm">
            {showImport ? '✕ Cancel Import' : '📥 Import JSON'}
          </button>
          {showImport && (
            <div className="space-y-2">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste tournament JSON…"
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-3 outline-none focus:border-purple-400 text-sm h-24 resize-none"
              />
              <button
                onClick={() => { try { onImport(importText); setImportText(''); setShowImport(false); showToast('✅ Imported!'); } catch { showToast('❌ Invalid JSON'); } }}
                disabled={!importText.trim()}
                className="w-full py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-sm"
              >Import</button>
            </div>
          )}
        </div>
      </Section>

      {/* Reset */}
      <Section id="danger" title="⚠️ Reset" {...sp}>
        <div className="space-y-2">
          <p className="text-slate-400 text-xs">Resets all match data and stats. Team names and settings are kept.</p>
          <button
            onClick={() => { if (confirm('Reset all match data?')) onResetTournament(); }}
            className="w-full py-2.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-sm"
          >🔄 Reset Tournament</button>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-purple-300/50 text-xs">
          🎮 Vibe-coded with way too much coffee by{' '}
          <a href="https://github.com/Dice-wrld" target="_blank" rel="noopener noreferrer"
            className="text-purple-200/70 hover:text-white underline decoration-dotted transition-colors">
            Dice-wrld
          </a>
        </p>
        <p className="text-slate-600 text-xs mt-1">💾 Data auto-saved in your browser</p>
      </div>
    </div>
  );
}
