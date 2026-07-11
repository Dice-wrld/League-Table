import { describe, it, expect } from 'vitest';
import {
  sortTeams,
  getWinStreak,
  getH2H,
  addMatchResult,
  recordQueueResult,
  isTournamentComplete,
  createTournamentData,
  resetTournament,
  addNewTeam,
  removeTeam,
  updateTeamName,
  updateTeamAppearance,
  setTournamentLength,
  setTournamentMode,
  type Team,
  type MatchResult,
} from './tournament';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTeam = (overrides: Partial<Team>): Team => ({
  id: 1,
  name: 'Team A',
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
  ...overrides,
});

const makeMatch = (overrides: Partial<MatchResult>): MatchResult => ({
  id: 1,
  homeTeamId: 1,
  awayTeamId: 2,
  homeScore: 1,
  awayScore: 0,
  playedAt: new Date().toISOString(),
  ...overrides,
});

// ─── sortTeams ────────────────────────────────────────────────────────────────

describe('sortTeams', () => {
  it('sorts by points descending', () => {
    const teams = [
      makeTeam({ id: 1, name: 'A', points: 3 }),
      makeTeam({ id: 2, name: 'B', points: 6 }),
      makeTeam({ id: 3, name: 'C', points: 1 }),
    ];
    const sorted = sortTeams(teams);
    expect(sorted.map((t) => t.points)).toEqual([6, 3, 1]);
  });

  it('breaks points tie by goal difference', () => {
    const teams = [
      makeTeam({ id: 1, name: 'A', points: 3, goalDifference: 1 }),
      makeTeam({ id: 2, name: 'B', points: 3, goalDifference: 5 }),
    ];
    const sorted = sortTeams(teams);
    expect(sorted[0].id).toBe(2);
  });

  it('breaks goal difference tie by goals for', () => {
    const teams = [
      makeTeam({ id: 1, name: 'A', points: 3, goalDifference: 2, goalsFor: 2 }),
      makeTeam({ id: 2, name: 'B', points: 3, goalDifference: 2, goalsFor: 8 }),
    ];
    const sorted = sortTeams(teams);
    expect(sorted[0].id).toBe(2);
  });

  it('breaks goals for tie alphabetically', () => {
    const teams = [
      makeTeam({ id: 1, name: 'Zephyr', points: 3, goalDifference: 2, goalsFor: 5 }),
      makeTeam({ id: 2, name: 'Alpha', points: 3, goalDifference: 2, goalsFor: 5 }),
    ];
    const sorted = sortTeams(teams);
    expect(sorted[0].name).toBe('Alpha');
  });

  it('does not mutate the original array', () => {
    const teams = [
      makeTeam({ id: 1, name: 'A', points: 0 }),
      makeTeam({ id: 2, name: 'B', points: 9 }),
    ];
    const original = [...teams];
    sortTeams(teams);
    expect(teams[0].id).toBe(original[0].id);
  });

  it('handles single team', () => {
    const teams = [makeTeam({ id: 1, name: 'Solo', points: 10 })];
    expect(sortTeams(teams)).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(sortTeams([])).toEqual([]);
  });
});

// ─── getWinStreak ─────────────────────────────────────────────────────────────

describe('getWinStreak', () => {
  it('returns 0 for empty form', () => {
    expect(getWinStreak([])).toBe(0);
  });

  it('returns 0 when most recent result is not a win', () => {
    expect(getWinStreak(['L', 'W', 'W'])).toBe(0);
    expect(getWinStreak(['D', 'W', 'W'])).toBe(0);
  });

  it('counts consecutive leading wins', () => {
    expect(getWinStreak(['W', 'W', 'W', 'L'])).toBe(3);
  });

  it('returns full length when all wins', () => {
    expect(getWinStreak(['W', 'W', 'W', 'W', 'W'])).toBe(5);
  });

  it('returns 1 for single win followed by loss', () => {
    expect(getWinStreak(['W', 'L'])).toBe(1);
  });

  it('stops counting at first non-win', () => {
    expect(getWinStreak(['W', 'W', 'D', 'W', 'W'])).toBe(2);
  });
});

// ─── getH2H ──────────────────────────────────────────────────────────────────

describe('getH2H', () => {
  it('returns zeros when no matches between teams', () => {
    const result = getH2H([], 1, 2);
    expect(result).toEqual({ w1: 0, w2: 0, draws: 0, total: 0 });
  });

  it('counts home win for team 1 correctly', () => {
    const matches = [makeMatch({ homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 })];
    const result = getH2H(matches, 1, 2);
    expect(result.w1).toBe(1);
    expect(result.w2).toBe(0);
    expect(result.draws).toBe(0);
  });

  it('counts away win for team 1 correctly (team 1 is away)', () => {
    const matches = [makeMatch({ homeTeamId: 2, awayTeamId: 1, homeScore: 0, awayScore: 3 })];
    const result = getH2H(matches, 1, 2);
    expect(result.w1).toBe(1);
    expect(result.w2).toBe(0);
  });

  it('counts draws', () => {
    const matches = [makeMatch({ homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1 })];
    const result = getH2H(matches, 1, 2);
    expect(result.draws).toBe(1);
    expect(result.w1).toBe(0);
    expect(result.w2).toBe(0);
  });

  it('ignores matches not involving both teams', () => {
    const matches = [
      makeMatch({ homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 0 }),
      makeMatch({ homeTeamId: 3, awayTeamId: 2, homeScore: 1, awayScore: 0 }),
    ];
    const result = getH2H(matches, 1, 2);
    expect(result.total).toBe(0);
  });

  it('accumulates multiple encounters correctly', () => {
    const matches = [
      makeMatch({ id: 1, homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }),
      makeMatch({ id: 2, homeTeamId: 2, awayTeamId: 1, homeScore: 1, awayScore: 1 }),
      makeMatch({ id: 3, homeTeamId: 1, awayTeamId: 2, homeScore: 0, awayScore: 1 }),
    ];
    const result = getH2H(matches, 1, 2);
    expect(result.w1).toBe(1);
    expect(result.w2).toBe(1);
    expect(result.draws).toBe(1);
    expect(result.total).toBe(3);
  });
});

// ─── addMatchResult ───────────────────────────────────────────────────────────

describe('addMatchResult', () => {
  it('gives 3 points to winner, 0 to loser', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 2, 0);
    const h = result.teams.find((x) => x.id === home.id)!;
    const a = result.teams.find((x) => x.id === away.id)!;
    expect(h.points).toBe(3);
    expect(a.points).toBe(0);
  });

  it('gives 1 point each for a draw', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 1, 1);
    const h = result.teams.find((x) => x.id === home.id)!;
    const a = result.teams.find((x) => x.id === away.id)!;
    expect(h.points).toBe(1);
    expect(a.points).toBe(1);
  });

  it('tracks goals for and against correctly', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 3, 1);
    const h = result.teams.find((x) => x.id === home.id)!;
    const a = result.teams.find((x) => x.id === away.id)!;
    expect(h.goalsFor).toBe(3);
    expect(h.goalsAgainst).toBe(1);
    expect(h.goalDifference).toBe(2);
    expect(a.goalsFor).toBe(1);
    expect(a.goalsAgainst).toBe(3);
    expect(a.goalDifference).toBe(-2);
  });

  it('increments played count for both teams', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 2, 1);
    expect(result.teams.find((x) => x.id === home.id)!.played).toBe(1);
    expect(result.teams.find((x) => x.id === away.id)!.played).toBe(1);
  });

  it('records W in form for winner, L for loser', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 2, 0);
    expect(result.teams.find((x) => x.id === home.id)!.form[0]).toBe('W');
    expect(result.teams.find((x) => x.id === away.id)!.form[0]).toBe('L');
  });

  it('records D in form for both teams on a draw', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 0, 0);
    expect(result.teams.find((x) => x.id === home.id)!.form[0]).toBe('D');
    expect(result.teams.find((x) => x.id === away.id)!.form[0]).toBe('D');
  });

  it('appends match to history', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const result = addMatchResult(t, home.id, away.id, 1, 0);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].homeTeamId).toBe(home.id);
    expect(result.matches[0].homeScore).toBe(1);
  });

  it('does not mutate original tournament', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const original = t.teams.find((x) => x.id === home.id)!.points;
    addMatchResult(t, home.id, away.id, 2, 0);
    expect(t.teams.find((x) => x.id === home.id)!.points).toBe(original);
  });

  it('tracks won/drawn/lost counts separately', () => {
    const t = createTournamentData();
    const [home, away] = t.teams;
    const r1 = addMatchResult(t, home.id, away.id, 2, 0);
    const r2 = addMatchResult(r1, home.id, away.id, 1, 1);
    const r3 = addMatchResult(r2, home.id, away.id, 0, 1);
    const h = r3.teams.find((x) => x.id === home.id)!;
    expect(h.won).toBe(1);
    expect(h.drawn).toBe(1);
    expect(h.lost).toBe(1);
    expect(h.points).toBe(4);
  });
});

// ─── recordQueueResult ────────────────────────────────────────────────────────

describe('recordQueueResult', () => {
  const makeQueueTournament = (playerIds: number[]) => {
    const t = createTournamentData();
    const ids = t.teams.slice(0, playerIds.length).map((x) => x.id);
    return {
      ...t,
      onCourt: [ids[0], ids[1]] as [number, number],
      queueOrder: ids.slice(2),
    };
  };

  it('winner stays on court, loser goes to back of queue', () => {
    const t = makeQueueTournament([1, 2, 3, 4]);
    const [p1, p2, p3] = [t.teams[0].id, t.teams[1].id, t.teams[2].id];
    const result = recordQueueResult(t, 1, 0); // home wins
    expect(result.onCourt[0]).toBe(p1); // winner stays
    expect(result.onCourt[1]).toBe(p3); // next in queue
    expect(result.queueOrder).toContain(p2); // loser in queue
    expect(result.queueOrder[result.queueOrder.length - 1]).toBe(p2); // loser at back
  });

  it('away winner moves to P1 position, home loser goes to back of queue', () => {
    const t = makeQueueTournament([1, 2, 3, 4]);
    const [p1, p2, p3] = [t.teams[0].id, t.teams[1].id, t.teams[2].id];
    const result = recordQueueResult(t, 0, 1); // away wins
    expect(result.onCourt[0]).toBe(p2); // away winner moves to home position
    expect(result.onCourt[1]).toBe(p3); // next in queue becomes challenger
    expect(result.queueOrder).toContain(p1); // home loser in queue
  });

  it('draw sends both to back, next two come on', () => {
    const t = makeQueueTournament([1, 2, 3, 4]);
    const [p1, p2, p3, p4] = [t.teams[0].id, t.teams[1].id, t.teams[2].id, t.teams[3].id];
    const result = recordQueueResult(t, 0, 0);
    expect(result.onCourt[0]).toBe(p3);
    expect(result.onCourt[1]).toBe(p4);
    expect(result.queueOrder).toContain(p1);
    expect(result.queueOrder).toContain(p2);
  });

  it('with only 2 players: win keeps winner on, loser stays in game', () => {
    const t = makeQueueTournament([1, 2]);
    const [p1, p2] = [t.teams[0].id, t.teams[1].id];
    const result = recordQueueResult(t, 1, 0);
    expect(result.onCourt[0]).toBe(p1);
    expect(result.onCourt[1]).toBe(p2);
    expect(result.queueOrder).toHaveLength(0);
  });

  it('still records match stats when queue rotates', () => {
    const t = makeQueueTournament([1, 2, 3, 4]);
    const result = recordQueueResult(t, 3, 1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].homeScore).toBe(3);
    expect(result.matches[0].awayScore).toBe(1);
  });

  it('queue length stays consistent after win', () => {
    const t = makeQueueTournament([1, 2, 3, 4]);
    const totalPlayers = t.teams.slice(0, 4).length;
    const result = recordQueueResult(t, 1, 0);
    const onCourtCount = 2;
    expect(result.queueOrder.length).toBe(totalPlayers - onCourtCount);
  });
});

// ─── isTournamentComplete ─────────────────────────────────────────────────────

describe('isTournamentComplete', () => {
  it('returns false when no length is set', () => {
    const t = createTournamentData();
    expect(isTournamentComplete(t)).toBe(false);
  });

  it('returns false when matches played < length', () => {
    const t = setTournamentLength(createTournamentData(), 10);
    const [h, a] = t.teams;
    const withMatch = addMatchResult(t, h.id, a.id, 1, 0);
    expect(isTournamentComplete(withMatch)).toBe(false);
  });

  it('returns true when matches played === length', () => {
    const t = setTournamentLength(createTournamentData(), 1);
    const [h, a] = t.teams;
    const withMatch = addMatchResult(t, h.id, a.id, 1, 0);
    expect(isTournamentComplete(withMatch)).toBe(true);
  });

  it('returns true when matches played > length', () => {
    const t = setTournamentLength(createTournamentData(), 1);
    const [h, a] = t.teams;
    let result = addMatchResult(t, h.id, a.id, 1, 0);
    result = addMatchResult(result, h.id, a.id, 2, 0);
    expect(isTournamentComplete(result)).toBe(true);
  });
});

// ─── resetTournament ─────────────────────────────────────────────────────────

describe('resetTournament', () => {
  it('clears all stats and match history', () => {
    const t = createTournamentData();
    const [h, a] = t.teams;
    const played = addMatchResult(t, h.id, a.id, 3, 0);
    const reset = resetTournament(played);
    expect(reset.matches).toHaveLength(0);
    reset.teams.forEach((team) => {
      expect(team.played).toBe(0);
      expect(team.won).toBe(0);
      expect(team.points).toBe(0);
      expect(team.form).toHaveLength(0);
    });
  });

  it('preserves team names and appearance', () => {
    const t = createTournamentData();
    const named = updateTeamName(t, t.teams[0].id, 'Teddy');
    const coloured = updateTeamAppearance(named, named.teams[0].id, '#ef4444', '⚽');
    const reset = resetTournament(coloured);
    const team = reset.teams.find((x) => x.id === t.teams[0].id)!;
    expect(team.name).toBe('Teddy');
    expect(team.color).toBe('#ef4444');
    expect(team.emoji).toBe('⚽');
  });

  it('resets celebrationShown to false', () => {
    const t = { ...createTournamentData(), celebrationShown: true };
    expect(resetTournament(t).celebrationShown).toBe(false);
  });
});

// ─── addNewTeam / removeTeam ──────────────────────────────────────────────────

describe('addNewTeam', () => {
  it('adds a team with a unique id', () => {
    const t = createTournamentData();
    const before = t.teams.length;
    const result = addNewTeam(t);
    expect(result.teams).toHaveLength(before + 1);
    const ids = result.teams.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });

  it('adds new team to queue in queue mode', () => {
    const t = setTournamentMode(createTournamentData(), 'queue');
    const result = addNewTeam(t);
    const newTeam = result.teams[result.teams.length - 1];
    expect(result.queueOrder).toContain(newTeam.id);
  });
});

describe('removeTeam', () => {
  it('removes the specified team', () => {
    const t = createTournamentData();
    const target = t.teams[2];
    const result = removeTeam(t, target.id);
    expect(result.teams.find((x) => x.id === target.id)).toBeUndefined();
  });

  it('refuses to remove when only 2 teams remain', () => {
    const t = createTournamentData();
    // remove down to 2
    let current = t;
    while (current.teams.length > 2) {
      current = removeTeam(current, current.teams[current.teams.length - 1].id);
    }
    const before = current.teams.length;
    const result = removeTeam(current, current.teams[0].id);
    expect(result.teams.length).toBe(before);
  });
});

// ─── setTournamentLength ──────────────────────────────────────────────────────

describe('setTournamentLength', () => {
  it('sets the length', () => {
    const t = setTournamentLength(createTournamentData(), 20);
    expect(t.tournamentLength).toBe(20);
  });

  it('clears the length with null', () => {
    const t = setTournamentLength(createTournamentData(), 20);
    expect(setTournamentLength(t, null).tournamentLength).toBeNull();
  });

  it('resets celebrationShown when length changes', () => {
    const t = { ...createTournamentData(), celebrationShown: true };
    expect(setTournamentLength(t, 5).celebrationShown).toBe(false);
  });
});
