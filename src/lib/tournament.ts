export interface Team {
  id: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  previousPosition?: number;
  color?: string;
  emoji?: string;
}

export interface MatchResult {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  playedAt: string;
}

export type TournamentMode = 'league' | 'queue';

export interface TournamentData {
  id: number;
  tournamentName: string;
  teams: Team[];
  matches: MatchResult[];
  tournamentLength: number | null;
  celebrationShown: boolean;
  mode: TournamentMode;
  queueOrder: number[];
  onCourt: [number, number];
}

export interface TournamentCollection {
  currentId: number;
  tournaments: TournamentData[];
}

const STORAGE_KEY = 'tournamentCollectionV1';
const LEGACY_STORAGE_KEY = 'tournamentDataV2';

const createTeam = (id: number, name: string, previousPosition: number): Team => ({
  id, name,
  played: 0, won: 0, drawn: 0, lost: 0,
  goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
  form: [], previousPosition,
});

export const createInitialTeams = (): Team[] => [
  createTeam(1, 'Team Alpha', 1),
  createTeam(2, 'Team Beta', 2),
  createTeam(3, 'Team Gamma', 3),
  createTeam(4, 'Team Delta', 4),
  createTeam(5, 'Team Epsilon', 5),
  createTeam(6, 'Team Zeta', 6),
  createTeam(7, 'Team Eta', 7),
  createTeam(8, 'Team Theta', 8),
];

export const createTournamentData = (name = 'Gaming Tournament', id = Date.now()): TournamentData => {
  const teams = createInitialTeams();
  return {
    id, tournamentName: name, teams, matches: [],
    tournamentLength: null, celebrationShown: false, mode: 'league',
    queueOrder: teams.slice(2).map((t) => t.id),
    onCourt: [teams[0].id, teams[1].id],
  };
};

export const createDefaultTournament = (): TournamentData => createTournamentData();

export const createTournamentCollection = (): TournamentCollection => {
  const t = createDefaultTournament();
  return { currentId: t.id, tournaments: [t] };
};

const normalizeTeam = (team: Partial<Team>): Team => ({
  id: team.id ?? 0,
  name: team.name ?? 'Unnamed Team',
  played: team.played ?? 0,
  won: team.won ?? 0,
  drawn: team.drawn ?? 0,
  lost: team.lost ?? 0,
  goalsFor: team.goalsFor ?? 0,
  goalsAgainst: team.goalsAgainst ?? 0,
  goalDifference: team.goalDifference ?? 0,
  points: team.points ?? 0,
  form: Array.isArray(team.form)
    ? team.form.filter((v): v is 'W' | 'D' | 'L' => v === 'W' || v === 'D' || v === 'L')
    : [],
  previousPosition: team.previousPosition ?? 0,
  color: typeof team.color === 'string' ? team.color : undefined,
  emoji: typeof team.emoji === 'string' ? team.emoji : undefined,
});

const normalizeTournament = (t: Partial<TournamentData>): TournamentData => {
  const teams = Array.isArray(t.teams) && t.teams.length > 0
    ? t.teams.map(normalizeTeam) : createInitialTeams();
  const allIds = teams.map((x) => x.id);
  const raw = t.onCourt;
  const onCourt: [number, number] =
    Array.isArray(raw) && raw.length >= 2 && allIds.includes(raw[0]) && allIds.includes(raw[1])
      ? [raw[0], raw[1]] : [allIds[0] ?? 1, allIds[1] ?? 2];
  const queueOrder = Array.isArray(t.queueOrder)
    ? t.queueOrder.filter((id) => allIds.includes(id) && !onCourt.includes(id))
    : allIds.filter((id) => !onCourt.includes(id));
  return {
    id: t.id ?? Date.now(),
    tournamentName: typeof t.tournamentName === 'string' && t.tournamentName.trim()
      ? t.tournamentName : 'Gaming Tournament',
    teams, matches: Array.isArray(t.matches) ? t.matches.filter(isMatchResult) : [],
    tournamentLength: typeof t.tournamentLength === 'number' && t.tournamentLength > 0
      ? Math.floor(t.tournamentLength) : null,
    celebrationShown: t.celebrationShown === true,
    mode: t.mode === 'queue' ? 'queue' : 'league',
    queueOrder, onCourt,
  };
};

export const saveTournamentCollection = (col: TournamentCollection) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(col));
};

export const loadTournamentCollection = (): TournamentCollection => {
  if (typeof window === 'undefined') return createTournamentCollection();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const t = normalizeTournament(JSON.parse(legacy) as Partial<TournamentData>);
        return { currentId: t.id, tournaments: [t] };
      }
      return createTournamentCollection();
    }
    const parsed = JSON.parse(saved) as Partial<TournamentCollection>;
    if (Array.isArray(parsed.tournaments) && typeof parsed.currentId === 'number') {
      const tournaments = parsed.tournaments.map(normalizeTournament);
      const currentId = tournaments.some((t) => t.id === parsed.currentId)
        ? parsed.currentId : tournaments[0]?.id ?? Date.now();
      return { currentId, tournaments };
    }
    return createTournamentCollection();
  } catch { return createTournamentCollection(); }
};

const isMatchResult = (v: unknown): v is MatchResult => {
  if (!v || typeof v !== 'object') return false;
  const m = v as Partial<MatchResult>;
  return typeof m.id === 'number' && typeof m.homeTeamId === 'number' &&
    typeof m.awayTeamId === 'number' && typeof m.homeScore === 'number' &&
    typeof m.awayScore === 'number' && typeof m.playedAt === 'string';
};

export const sortTeams = (teams: Team[]): Team[] =>
  [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

export const isTournamentComplete = (t: TournamentData): boolean =>
  t.tournamentLength !== null && t.matches.length >= t.tournamentLength;

export const getWinStreak = (form: ('W' | 'D' | 'L')[]): number => {
  let s = 0;
  for (const r of form) { if (r === 'W') s++; else break; }
  return s;
};

export const getH2H = (matches: MatchResult[], id1: number, id2: number) => {
  const relevant = matches.filter(
    (m) => (m.homeTeamId === id1 && m.awayTeamId === id2) ||
            (m.homeTeamId === id2 && m.awayTeamId === id1)
  );
  let w1 = 0, w2 = 0, draws = 0;
  for (const m of relevant) {
    if (m.homeScore === m.awayScore) { draws++; continue; }
    const id1wins = (m.homeTeamId === id1 && m.homeScore > m.awayScore) ||
                    (m.homeTeamId === id2 && m.awayScore > m.homeScore);
    if (id1wins) w1++; else w2++;
  }
  return { w1, w2, draws, total: relevant.length };
};

const applyMatchToTeams = (
  teams: Team[], homeId: number, awayId: number, homeScore: number, awayScore: number
): Team[] =>
  teams.map((team) => {
    if (team.id === homeId) {
      const r: 'W' | 'D' | 'L' = homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D';
      return { ...team, played: team.played + 1,
        won: team.won + (homeScore > awayScore ? 1 : 0),
        drawn: team.drawn + (homeScore === awayScore ? 1 : 0),
        lost: team.lost + (homeScore < awayScore ? 1 : 0),
        goalsFor: team.goalsFor + homeScore, goalsAgainst: team.goalsAgainst + awayScore,
        goalDifference: team.goalDifference + (homeScore - awayScore),
        points: team.points + (homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0),
        form: [r, ...team.form].slice(0, 20) };
    }
    if (team.id === awayId) {
      const r: 'W' | 'D' | 'L' = awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D';
      return { ...team, played: team.played + 1,
        won: team.won + (awayScore > homeScore ? 1 : 0),
        drawn: team.drawn + (homeScore === awayScore ? 1 : 0),
        lost: team.lost + (awayScore < homeScore ? 1 : 0),
        goalsFor: team.goalsFor + awayScore, goalsAgainst: team.goalsAgainst + homeScore,
        goalDifference: team.goalDifference + (awayScore - homeScore),
        points: team.points + (awayScore > homeScore ? 3 : homeScore === awayScore ? 1 : 0),
        form: [r, ...team.form].slice(0, 20) };
    }
    return team;
  });

const afterMatch = (tournament: TournamentData, updatedTeams: Team[], h: number, a: number, hs: number, as_: number): TournamentData => {
  const prev = sortTeams(tournament.teams);
  const sorted = sortTeams(updatedTeams).map((team) => ({
    ...team, previousPosition: prev.findIndex((t) => t.id === team.id) + 1,
  }));
  const match: MatchResult = { id: Date.now(), homeTeamId: h, awayTeamId: a, homeScore: hs, awayScore: as_, playedAt: new Date().toISOString() };
  return { ...tournament, teams: sorted, matches: [match, ...tournament.matches] };
};

export const addMatchResult = (
  t: TournamentData, homeId: number, awayId: number, homeScore: number, awayScore: number
): TournamentData => {
  const updated = applyMatchToTeams(t.teams, homeId, awayId, homeScore, awayScore);
  return afterMatch(t, updated, homeId, awayId, homeScore, awayScore);
};

export const recordQueueResult = (t: TournamentData, homeScore: number, awayScore: number): TournamentData => {
  const [homeId, awayId] = t.onCourt;
  const updated = applyMatchToTeams(t.teams, homeId, awayId, homeScore, awayScore);
  let newOnCourt: [number, number];
  let newQueue: number[];

  if (homeScore > awayScore) {
    const [next, ...rest] = t.queueOrder;
    if (next === undefined) { newOnCourt = [homeId, awayId]; newQueue = []; }
    else { newOnCourt = [homeId, next]; newQueue = [...rest, awayId]; }
  } else if (awayScore > homeScore) {
    const [next, ...rest] = t.queueOrder;
    if (next === undefined) { newOnCourt = [awayId, homeId]; newQueue = []; }
    else { newOnCourt = [awayId, next]; newQueue = [...rest, homeId]; }
  } else {
    const [n1, n2, ...rest] = t.queueOrder;
    if (n1 === undefined) { newOnCourt = [homeId, awayId]; newQueue = []; }
    else if (n2 === undefined) { newOnCourt = [n1, homeId]; newQueue = [awayId]; }
    else { newOnCourt = [n1, n2]; newQueue = [...rest, homeId, awayId]; }
  }
  const base = afterMatch(t, updated, homeId, awayId, homeScore, awayScore);
  return { ...base, onCourt: newOnCourt, queueOrder: newQueue };
};

export const setTournamentMode = (t: TournamentData, mode: TournamentMode): TournamentData => {
  const ids = t.teams.map((x) => x.id);
  return { ...t, mode, onCourt: [ids[0] ?? 1, ids[1] ?? 2], queueOrder: ids.slice(2) };
};

export const setTournamentLength = (t: TournamentData, length: number | null): TournamentData =>
  ({ ...t, tournamentLength: length, celebrationShown: false });

export const markCelebrationShown = (t: TournamentData): TournamentData =>
  ({ ...t, celebrationShown: true });

export const resetTournament = (t: TournamentData): TournamentData => {
  const ids = t.teams.map((x) => x.id);
  return {
    ...t,
    teams: t.teams.map((team, i) => ({ ...team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], previousPosition: i + 1 })),
    matches: [], celebrationShown: false,
    onCourt: [ids[0] ?? 1, ids[1] ?? 2], queueOrder: ids.slice(2),
  };
};

export const updateTeamName = (t: TournamentData, id: number, name: string): TournamentData =>
  ({ ...t, teams: t.teams.map((team) => team.id === id ? { ...team, name } : team) });

export const updateTeamAppearance = (t: TournamentData, id: number, color?: string, emoji?: string): TournamentData =>
  ({ ...t, teams: t.teams.map((team) => team.id === id ? { ...team, color, emoji } : team) });

export const addNewTeam = (t: TournamentData): TournamentData => {
  const newId = Math.max(...t.teams.map((x) => x.id), 0) + 1;
  const newTeam = createTeam(newId, `Team ${newId}`, t.teams.length + 1);
  return { ...t, teams: [...t.teams, newTeam], queueOrder: [...t.queueOrder, newId] };
};

export const removeTeam = (t: TournamentData, id: number): TournamentData => {
  if (t.teams.length <= 2) return t;
  const remaining = t.teams.filter((x) => x.id !== id);
  const allIds = remaining.map((x) => x.id);
  const courtValid = t.onCourt.every((cId) => allIds.includes(cId));
  const newOnCourt: [number, number] = courtValid ? t.onCourt : [allIds[0] ?? 1, allIds[1] ?? 2];
  return { ...t, teams: remaining, queueOrder: allIds.filter((i) => !newOnCourt.includes(i)), onCourt: newOnCourt };
};

export const importTournamentData = (json: string, id = Date.now()): TournamentData =>
  normalizeTournament({ ...(JSON.parse(json) as Partial<TournamentData>), id, celebrationShown: false });

export const addTournament = (col: TournamentCollection, name?: string): TournamentCollection => {
  const t = createTournamentData(name ?? `Tournament ${col.tournaments.length + 1}`, Date.now());
  return { ...col, currentId: t.id, tournaments: [...col.tournaments, t] };
};

export const setCurrentTournament = (col: TournamentCollection, id: number): TournamentCollection =>
  col.tournaments.some((t) => t.id === id) ? { ...col, currentId: id } : col;

export const updateTournamentInCollection = (col: TournamentCollection, t: TournamentData): TournamentCollection =>
  ({ ...col, tournaments: col.tournaments.map((item) => item.id === t.id ? t : item) });

export const removeTournament = (col: TournamentCollection, id: number): TournamentCollection => {
  if (col.tournaments.length <= 1) return col;
  const tournaments = col.tournaments.filter((t) => t.id !== id);
  const currentId = tournaments.some((t) => t.id === col.currentId) ? col.currentId : tournaments[0].id;
  return { currentId, tournaments };
};
