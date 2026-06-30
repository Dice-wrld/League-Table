import { useEffect, useMemo, useState } from 'react';
import { cn } from './utils/cn';
import {
  addMatchResult,
  addNewTeam,
  addTournament,
  importTournamentData,
  loadTournamentCollection,
  removeTournament,
  removeTeam,
  resetTournament,
  saveTournamentCollection,
  setCurrentTournament,
  sortTeams,
  updateTournamentInCollection,
  updateTeamName,
  type TournamentCollection,
} from './lib/tournament';

function App() {
  const [collection, setCollection] = useState<TournamentCollection>(() => loadTournamentCollection());
  const [showAnimation, setShowAnimation] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [team1Id, setTeam1Id] = useState<number>(1);
  const [team2Id, setTeam2Id] = useState<number>(2);
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');
  const [importText, setImportText] = useState('');

  useEffect(() => {
    setTimeout(() => setShowAnimation(true), 100);
  }, []);

  useEffect(() => {
    saveTournamentCollection(collection);
  }, [collection]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // ignore registration failures in unsupported environments
      });
    }
  }, []);

  const activeTournament = collection.tournaments.find((t) => t.id === collection.currentId) ?? collection.tournaments[0];

  useEffect(() => {
    if (!activeTournament) {
      return;
    }

    setTeam1Id(activeTournament.teams[0]?.id ?? 1);
    setTeam2Id(activeTournament.teams[1]?.id ?? 2);
  }, [activeTournament]);

  const teams = activeTournament?.teams ?? [];
  const matches = activeTournament?.matches ?? [];

  const addResult = () => {
    const score1 = Number.parseInt(team1Score, 10);
    const score2 = Number.parseInt(team2Score, 10);

    if (Number.isNaN(score1) || Number.isNaN(score2) || score1 < 0 || score2 < 0) {
      alert('Please enter valid scores');
      return;
    }

    if (team1Id === team2Id) {
      alert('Please select different teams');
      return;
    }

    if (!activeTournament) {
      return;
    }

    setShowAnimation(false);
    const updatedTournament = addMatchResult(activeTournament, team1Id, team2Id, score1, score2);
    setCollection((current) => updateTournamentInCollection(current, updatedTournament));
    setTeam1Score('');
    setTeam2Score('');
    setShowAddMatch(false);

    setTimeout(() => setShowAnimation(true), 100);
  };

  const onResetTournament = () => {
    if (!activeTournament) {
      return;
    }

    if (confirm('Are you sure you want to reset all stats? This cannot be undone.')) {
      const updatedTournament = resetTournament(activeTournament);
      setCollection((current) => updateTournamentInCollection(current, updatedTournament));
    }
  };

  const onUpdateTournamentName = (newName: string) => {
    if (!activeTournament) {
      return;
    }

    const updatedTournament = { ...activeTournament, tournamentName: newName };
    setCollection((current) => updateTournamentInCollection(current, updatedTournament));
  };

  const onUpdateTeamName = (id: number, newName: string) => {
    if (!activeTournament) {
      return;
    }

    const updatedTournament = updateTeamName(activeTournament, id, newName);
    setCollection((current) => updateTournamentInCollection(current, updatedTournament));
  };

  const onAddNewTeam = () => {
    if (!activeTournament) {
      return;
    }

    const updatedTournament = addNewTeam(activeTournament);
    setCollection((current) => updateTournamentInCollection(current, updatedTournament));
  };

  const onRemoveTeam = (id: number) => {
    if (!activeTournament) {
      return;
    }

    if (teams.length <= 2) {
      alert('You need at least 2 teams!');
      return;
    }

    if (confirm('Are you sure you want to remove this team?')) {
      const updatedTournament = removeTeam(activeTournament, id);
      setCollection((current) => updateTournamentInCollection(current, updatedTournament));
    }
  };

  const onImportTournament = () => {
    try {
      const imported = importTournamentData(importText);
      setCollection((current) => {
        const updatedCollection = addTournament(current, imported.tournamentName);
        return updateTournamentInCollection(updatedCollection, { ...imported, id: updatedCollection.currentId });
      });
      setImportText('');
      setShowImportExport(false);
    } catch {
      alert('Invalid tournament data');
    }
  };

  const onExportTournament = () => {
    if (!activeTournament) {
      return;
    }

    const data = JSON.stringify(activeTournament, null, 2);
    setImportText(data);
    setShowImportExport(true);
  };

  const copyImportText = async () => {
    if (!importText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(importText);
      alert('Tournament JSON copied to clipboard');
    } catch {
      alert('Copy failed. Please copy manually.');
    }
  };

  const downloadTournament = () => {
    if (!importText) {
      return;
    }

    const filename = `${activeTournament?.tournamentName.replace(/[^a-zA-Z0-9-_]/g, '_') ?? 'tournament'}.json`;
    const blob = new Blob([importText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareTournament = async () => {
    if (!activeTournament) {
      return;
    }

    const data = JSON.stringify(activeTournament, null, 2);
    const filename = `${activeTournament.tournamentName.replace(/[^a-zA-Z0-9-_]/g, '_') ?? 'tournament'}.json`;
    const file = new File([data], `${filename}.json`, { type: 'application/json' });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: activeTournament.tournamentName,
          text: 'Tournament data export',
        });
        return;
      }
    } catch {
      // continue to text share fallback
    }

    try {
      await navigator.share({
        title: activeTournament.tournamentName,
        text: data,
      });
      return;
    } catch {
      alert('Sharing is not supported on this device. Please use Copy JSON or Download JSON instead.');
    }
  };

  const getPositionChange = (currentPosition: number, previousPosition?: number) => {
    if (!previousPosition) return null;
    const change = previousPosition - currentPosition;
    if (change > 0) return { direction: 'up', value: change };
    if (change < 0) return { direction: 'down', value: Math.abs(change) };
    return { direction: 'same', value: 0 };
  };

  const getZoneClass = (position: number, totalTeams: number) => {
    if (position === 1) return 'border-l-4 border-l-yellow-400 bg-yellow-500/10';
    if (position === 2) return 'border-l-4 border-l-gray-300 bg-gray-300/10';
    if (position === 3) return 'border-l-4 border-l-orange-600 bg-orange-600/10';
    if (position === totalTeams) return 'border-l-4 border-l-red-500 bg-red-500/10';
    return 'border-l-4 border-l-slate-600';
  };

  const getFormColor = (result: 'W' | 'D' | 'L') => {
    switch (result) {
      case 'W': return 'bg-green-500';
      case 'D': return 'bg-gray-400';
      case 'L': return 'bg-red-500';
    }
  };

  const sortedTeams = useMemo(() => sortTeams(teams), [teams]);
  const recentMatches = useMemo(() => matches.slice(0, 6), [matches]);

  const onAddNewTournament = () => {
    setCollection((current) => addTournament(current));
  };

  const onDeleteTournament = () => {
    if (collection.tournaments.length <= 1) {
      alert('You must keep at least one tournament.');
      return;
    }

    if (confirm('Delete this tournament?')) {
      setCollection((current) => removeTournament(current, current.currentId));
    }
  };

  const onSelectTournament = (id: number) => {
    setCollection((current) => setCurrentTournament(current, id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            <select
              value={activeTournament?.id ?? ''}
              onChange={(e) => onSelectTournament(Number(e.target.value))}
              className="bg-slate-800 text-white rounded-lg px-4 py-3 shadow-lg border border-slate-700"
            >
              {collection.tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.tournamentName}
                </option>
              ))}
            </select>
            <button
              onClick={onAddNewTournament}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              + New Tournament
            </button>
            <button
              onClick={onDeleteTournament}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              Delete Tournament
            </button>
          </div>

          <input
            type="text"
            value={activeTournament?.tournamentName ?? ''}
            onChange={(e) => onUpdateTournamentName(e.target.value)}
            className="text-5xl font-bold text-white mb-2 tracking-tight bg-transparent border-b-2 border-transparent hover:border-white/30 focus:border-white/50 outline-none text-center transition-colors px-4"
            placeholder="Tournament Name"
          />
          <p className="text-purple-200 text-lg">League Standings</p>
          
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <button
              onClick={() => setShowAddMatch(true)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              ➕ Add Match Result
            </button>
            <button
              onClick={() => setShowEditTeams(!showEditTeams)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              ✏️ {showEditTeams ? 'Done Editing' : 'Edit Teams'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              🕘 {showHistory ? 'Hide History' : 'View History'}
            </button>
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              📦 Import / Export
            </button>
            <button
              onClick={onResetTournament}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg"
            >
              🔄 Reset Tournament
            </button>
          </div>
        </div>

        {showImportExport && (
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 mb-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Import / Export Tournament</h3>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-36 bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600"
              placeholder="Paste tournament JSON here"
            />
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={onImportTournament}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Import
              </button>
              <button
                onClick={onExportTournament}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Export
              </button>
              <button
                onClick={shareTournament}
                className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg"
              >
                Share
              </button>
              <button
                onClick={copyImportText}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Copy JSON
              </button>
              <button
                onClick={downloadTournament}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Download JSON
              </button>
              <button
                onClick={() => setShowImportExport(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Add Match Modal */}
        {showAddMatch && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4">Add Match Result</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 mb-2">Team 1</label>
                  <select
                    value={team1Id}
                    onChange={(e) => setTeam1Id(parseInt(e.target.value))}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-2">Score</label>
                    <input
                      type="number"
                      min="0"
                      value={team1Score}
                      onChange={(e) => setTeam1Score(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-2">Score</label>
                    <input
                      type="number"
                      min="0"
                      value={team2Score}
                      onChange={(e) => setTeam2Score(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-2">Team 2</label>
                  <select
                    value={team2Id}
                    onChange={(e) => setTeam2Id(parseInt(e.target.value))}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
                  >
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={addResult}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-medium transition-colors"
                >
                  Add Result
                </button>
                <button
                  onClick={() => setShowAddMatch(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg py-2 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Teams Section */}
        {showEditTeams && (
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 mb-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Edit Teams</h3>
            <div className="space-y-3">
              {teams.map(team => (
                <div key={team.id} className="flex gap-3">
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => onUpdateTeamName(team.id, e.target.value)}
                    className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
                  />
                  <button
                    onClick={() => onRemoveTeam(team.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={onAddNewTeam}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium transition-colors"
              >
                + Add New Team
              </button>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 mb-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Recent Match History</h3>
            <div className="space-y-2">
              {recentMatches.length > 0 ? recentMatches.map((match) => {
                const homeTeam = teams.find((team) => team.id === match.homeTeamId);
                const awayTeam = teams.find((team) => team.id === match.awayTeamId);
                return (
                  <div key={match.id} className="rounded-lg bg-slate-700/70 p-3 text-slate-200">
                    <span className="font-semibold text-white">{homeTeam?.name ?? 'Unknown'}</span> {match.homeScore} - {match.awayScore} <span className="font-semibold text-white">{awayTeam?.name ?? 'Unknown'}</span>
                  </div>
                );
              }) : <p className="text-slate-400">No matches recorded yet.</p>}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-l-yellow-400 bg-yellow-500/20"></div>
              <span className="text-slate-300">🥇 Champion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-l-gray-300 bg-gray-300/20"></div>
              <span className="text-slate-300">🥈 Runner-up</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-l-orange-600 bg-orange-600/20"></div>
              <span className="text-slate-300">🥉 Third Place</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-l-4 border-l-red-500 bg-red-500/20"></div>
              <span className="text-slate-300">Last Place</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/80 text-slate-300 text-sm uppercase tracking-wider">
                  <th className="px-4 py-4 text-left w-16">Pos</th>
                  <th className="px-4 py-4 text-left">Team</th>
                  <th className="px-4 py-4 text-center w-16">PL</th>
                  <th className="px-4 py-4 text-center w-16">W</th>
                  <th className="px-4 py-4 text-center w-16">D</th>
                  <th className="px-4 py-4 text-center w-16">L</th>
                  <th className="px-4 py-4 text-center w-24">GF</th>
                  <th className="px-4 py-4 text-center w-24">GA</th>
                  <th className="px-4 py-4 text-center w-24">GD</th>
                  <th className="px-4 py-4 text-left w-48">Form</th>
                  <th className="px-4 py-4 text-center w-20 font-bold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => {
                  const position = index + 1;
                  const positionChange = getPositionChange(position, team.previousPosition);
                  
                  return (
                    <tr
                      key={team.id}
                      className={cn(
                        'border-b border-slate-700/50 hover:bg-slate-700/30 transition-all duration-300',
                        getZoneClass(position, sortedTeams.length),
                        showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      )}
                      style={{ transitionDelay: `${index * 30}ms` }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-lg">{position}</span>
                          {positionChange && (
                            <div className="flex flex-col items-center">
                              {positionChange.direction === 'up' && (
                                <span className="text-green-400 text-xs flex items-center">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                                  </svg>
                                  {positionChange.value}
                                </span>
                              )}
                              {positionChange.direction === 'down' && (
                                <span className="text-red-400 text-xs flex items-center">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                                  </svg>
                                  {positionChange.value}
                                </span>
                              )}
                              {positionChange.direction === 'same' && (
                                <span className="text-gray-400 text-xs">─</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white font-semibold">{team.name}</span>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-300">{team.played}</td>
                      <td className="px-4 py-4 text-center text-slate-300">{team.won}</td>
                      <td className="px-4 py-4 text-center text-slate-300">{team.drawn}</td>
                      <td className="px-4 py-4 text-center text-slate-300">{team.lost}</td>
                      <td className="px-4 py-4 text-center text-slate-300">{team.goalsFor}</td>
                      <td className="px-4 py-4 text-center text-slate-300">{team.goalsAgainst}</td>
                      <td className={cn(
                        'px-4 py-4 text-center font-semibold',
                        team.goalDifference > 0 ? 'text-green-400' : team.goalDifference < 0 ? 'text-red-400' : 'text-slate-300'
                      )}>
                        {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          {team.form.length > 0 ? [...team.form].reverse().map((result, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold',
                                getFormColor(result)
                              )}
                              title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
                            >
                              {result}
                            </div>
                          )) : (
                            <span className="text-slate-500 text-sm">No matches yet</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-white font-bold text-lg">{team.points}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden">
            {sortedTeams.map((team, index) => {
              const position = index + 1;
              const positionChange = getPositionChange(position, team.previousPosition);
              
              return (
                <div
                  key={team.id}
                  className={cn(
                    'border-b border-slate-700/50 p-4 transition-all duration-300',
                    getZoneClass(position, sortedTeams.length),
                    showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  )}
                  style={{ transitionDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-white text-xl">{position}</span>
                        {positionChange && positionChange.direction !== 'same' && (
                          <span className={cn(
                            'text-xs flex items-center',
                            positionChange.direction === 'up' ? 'text-green-400' : 'text-red-400'
                          )}>
                            {positionChange.direction === 'up' ? '↑' : '↓'}{positionChange.value}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg">{team.name}</div>
                        <div className="text-slate-400 text-sm">
                          {team.won}W - {team.drawn}D - {team.lost}L
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-2xl">{team.points}</div>
                      <div className="text-slate-400 text-xs">PTS</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                    <div className="text-slate-300">
                      <span className="text-slate-400">GF:</span> {team.goalsFor}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">GA:</span> {team.goalsAgainst}
                    </div>
                    <div className={cn(
                      'font-semibold',
                      team.goalDifference > 0 ? 'text-green-400' : team.goalDifference < 0 ? 'text-red-400' : 'text-slate-300'
                    )}>
                      <span className="text-slate-400 font-normal">GD:</span> {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    {team.form.length > 0 ? [...team.form].reverse().map((result, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 h-7 rounded flex items-center justify-center text-white text-xs font-bold',
                          getFormColor(result)
                        )}
                      >
                        {result}
                      </div>
                    )) : (
                      <span className="text-slate-500 text-sm">No matches yet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
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
    </div>
  );
}

export default App;
