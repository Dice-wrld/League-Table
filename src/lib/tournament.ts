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
  form: ("W" | "D" | "L")[];
  previousPosition?: number;
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
  // Queue mode state
  queueOrder: number[]; // team IDs waiting in line (excluding the two on court)
  onCourt: [number, number]; // [homeId, awayId] — the two currently playing
}

export interface TournamentCollection {
  currentId: number;
  tournaments: TournamentData[];
}

const STORAGE_KEY = "tournamentCollectionV1";
const LEGACY_STORAGE_KEY = "tournamentDataV2";

const createTeam = (id: number, name: string, previousPosition: number): Team => ({
  id,
  name,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
  previousPosition,
});

export const createInitialTeams = (): Team[] => [
  createTeam(1, "Team Alpha", 1),
  createTeam(2, "Team Beta", 2),
  createTeam(3, "Team Gamma", 3),
  createTeam(4, "Team Delta", 4),
  createTeam(5, "Team Epsilon", 5),
  createTeam(6, "Team Zeta", 6),
  createTeam(7, "Team Eta", 7),
  createTeam(8, "Team Theta", 8),
];

export const createTournamentData = (name = "Gaming Tournament", id = Date.now()): TournamentData => {
  const teams = createInitialTeams();
  return {
    id,
    tournamentName: name,
    teams,
    matches: [],
    tournamentLength: null,
    celebrationShown: false,
    mode: 'league',
    queueOrder: teams.slice(2).map((t) => t.id),
    onCourt: [teams[0].id, teams[1].id],
  };
};

export const createDefaultTournament = (): TournamentData => createTournamentData();

export const createTournamentCollection = (): TournamentCollection => {
  const tournament = createDefaultTournament();
  return { currentId: tournament.id, tournaments: [tournament] };
};

const normalizeTeam = (team: Partial<Team>): Team => ({
  id: team.id ?? 0,
  name: team.name ?? "Unnamed Team",
  played: team.played ?? 0,
  won: team.won ?? 0,
  drawn: team.drawn ?? 0,
  lost: team.lost ?? 0,
  goalsFor: team.goalsFor ?? 0,
  goalsAgainst: team.goalsAgainst ?? 0,
  goalDifference: team.goalDifference ?? 0,
  points: team.points ?? 0,
  form: Array.isArray(team.form)
    ? team.form.filter((v): v is "W" | "D" | "L" => v === "W" || v === "D" || v === "L")
    : [],
  previousPosition: team.previousPosition ?? 0,
});

const normalizeTournament = (tournament: Partial<TournamentData>): TournamentData => {
  const teams =
    Array.isArray(tournament.teams) && tournament.teams.length > 0
      ? tournament.teams.map(normalizeTeam)
      : createInitialTeams();

  const allIds = teams.map((t) => t.id);
  const rawOnCourt = tournament.onCourt;
  const onCourt: [number, number] =
    Array.isArray(rawOnCourt) &&
    rawOnCourt.length >= 2 &&
    allIds.includes(rawOnCourt[0]) &&
    allIds.includes(rawOnCourt[1])
      ? [rawOnCourt[0], rawOnCourt[1]]
      : [allIds[0] ?? 1, allIds[1] ?? 2];

  const queueOrder = Array.isArray(tournament.queueOrder)
    ? tournament.queueOrder.filter((id) => allIds.includes(id) && !onCourt.includes(id))
    : allIds.filter((id) => !onCourt.includes(id));

  return {
    id: tournament.id ?? Date.now(),
    tournamentName:
      typeof tournament.tournamentName === "string" && tournament.tournamentName.trim()
        ? tournament.tournamentName
        : "Gaming Tournament",
    teams,
    matches: Array.isArray(tournament.matches) ? tournament.matches.filter(isMatchResult) : [],
    tournamentLength:
      typeof tournament.tournamentLength === "number" && tournament.tournamentLength > 0
        ? Math.floor(tournament.tournamentLength)
        : null,
    celebrationShown: tournament.celebrationShown === true,
    mode: tournament.mode === 'queue' ? 'queue' : 'league',
    queueOrder,
    onCourt,
  };
};

export const saveTournamentCollection = (collection: TournamentCollection) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
};

export const loadTournamentCollection = (): TournamentCollection => {
  if (typeof window === "undefined") return createTournamentCollection();
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
    if (Array.isArray(parsed.tournaments) && typeof parsed.currentId === "number") {
      const tournaments = parsed.tournaments.map(normalizeTournament);
      const currentId = tournaments.some((t) => t.id === parsed.currentId)
        ? parsed.currentId
        : tournaments[0]?.id ?? Date.now();
      return { currentId, tournaments };
    }
    return createTournamentCollection();
  } catch {
    return createTournamentCollection();
  }
};

const isMatchResult = (value: unknown): value is MatchResult => {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<MatchResult>;
  return (
    typeof m.id === "number" &&
    typeof m.homeTeamId === "number" &&
    typeof m.awayTeamId === "number" &&
    typeof m.homeScore === "number" &&
    typeof m.awayScore === "number" &&
    typeof m.playedAt === "string"
  );
};

export const sortTeams = (teamsToSort: Team[]): Team[] =>
  [...teamsToSort].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

export const isTournamentComplete = (tournament: TournamentData): boolean =>
  tournament.tournamentLength !== null &&
  tournament.matches.length >= tournament.tournamentLength;

const applyMatchToTeams = (
  teams: Team[],
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number
): Team[] =>
  teams.map((team) => {
    if (team.id === homeTeamId) {
      const result: "W" | "D" | "L" = homeScore > awayScore ? "W" : homeScore < awayScore ? "L" : "D";
      return {
        ...team,
        played: team.played + 1,
        won: team.won + (homeScore > awayScore ? 1 : 0),
        drawn: team.drawn + (homeScore === awayScore ? 1 : 0),
        lost: team.lost + (homeScore < awayScore ? 1 : 0),
        goalsFor: team.goalsFor + homeScore,
        goalsAgainst: team.goalsAgainst + awayScore,
        goalDifference: team.goalDifference + (homeScore - awayScore),
        points: team.points + (homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0),
        form: [result, ...team.form].slice(0, 5),
      };
    }
    if (team.id === awayTeamId) {
      const result: "W" | "D" | "L" = awayScore > homeScore ? "W" : awayScore < homeScore ? "L" : "D";
      return {
        ...team,
        played: team.played + 1,
        won: team.won + (awayScore > homeScore ? 1 : 0),
        drawn: team.drawn + (homeScore === awayScore ? 1 : 0),
        lost: team.lost + (awayScore < homeScore ? 1 : 0),
        goalsFor: team.goalsFor + awayScore,
        goalsAgainst: team.goalsAgainst + homeScore,
        goalDifference: team.goalDifference + (awayScore - homeScore),
        points: team.points + (awayScore > homeScore ? 3 : homeScore === awayScore ? 1 : 0),
        form: [result, ...team.form].slice(0, 5),
      };
    }
    return team;
  });

// ─── League mode ────────────────────────────────────────────────────────────
export const addMatchResult = (
  tournament: TournamentData,
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number
): TournamentData => {
  const updatedTeams = applyMatchToTeams(tournament.teams, homeTeamId, awayTeamId, homeScore, awayScore);
  const previousStandings = sortTeams(tournament.teams);
  const sortedTeams = sortTeams(updatedTeams).map((team) => ({
    ...team,
    previousPosition: previousStandings.findIndex((t) => t.id === team.id) + 1,
  }));
  const match: MatchResult = {
    id: Date.now(),
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    playedAt: new Date().toISOString(),
  };
  return {
    ...tournament,
    teams: sortedTeams,
    matches: [match, ...tournament.matches].slice(0, 50),
  };
};

// ─── Queue (Winner Stays On) mode ───────────────────────────────────────────
//
// Rules:
//   Win  → winner stays on court (same side), loser goes to back of queue,
//           next person in queue steps on as challenger
//   Draw → both players go to back of queue,
//           next two in queue step on court
//
// Queue is circular — when the list empties it wraps (shouldn't happen
// since there are always ≥2 people and the cycle is infinite).
//
export const recordQueueResult = (
  tournament: TournamentData,
  homeScore: number,
  awayScore: number
): TournamentData => {
  const [homeId, awayId] = tournament.onCourt;
  const updatedTeams = applyMatchToTeams(tournament.teams, homeId, awayId, homeScore, awayScore);

  const previousStandings = sortTeams(tournament.teams);
  const sortedTeams = sortTeams(updatedTeams).map((team) => ({
    ...team,
    previousPosition: previousStandings.findIndex((t) => t.id === team.id) + 1,
  }));

  const match: MatchResult = {
    id: Date.now(),
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore,
    awayScore,
    playedAt: new Date().toISOString(),
  };

  let newOnCourt: [number, number];
  let newQueue: number[];

  if (homeScore > awayScore) {
    // Home wins: stays on, away goes to back of queue, next challenger steps up
    const [next, ...rest] = tournament.queueOrder;
    if (next === undefined) {
      // Only 2 players — just swap challenger
      newOnCourt = [homeId, awayId];
      newQueue = [];
    } else {
      newOnCourt = [homeId, next];
      newQueue = [...rest, awayId];
    }
  } else if (awayScore > homeScore) {
    // Away wins: stays on (moves to home position), home goes to back of queue
    const [next, ...rest] = tournament.queueOrder;
    if (next === undefined) {
      newOnCourt = [awayId, homeId];
      newQueue = [];
    } else {
      newOnCourt = [awayId, next];
      newQueue = [...rest, homeId];
    }
  } else {
    // Draw: both go to back of queue, next two step on
    const [next1, next2, ...rest] = tournament.queueOrder;
    if (next1 === undefined) {
      // Only 2 players — keep them on (draw re-play)
      newOnCourt = [homeId, awayId];
      newQueue = [];
    } else if (next2 === undefined) {
      // 3 players: one in queue, one of the draw pair rotates in
      newOnCourt = [next1, homeId];
      newQueue = [awayId];
    } else {
      newOnCourt = [next1, next2];
      newQueue = [...rest, homeId, awayId];
    }
  }

  return {
    ...tournament,
    teams: sortedTeams,
    matches: [match, ...tournament.matches].slice(0, 50),
    onCourt: newOnCourt,
    queueOrder: newQueue,
  };
};

// ─── Shared mutations ────────────────────────────────────────────────────────
export const setTournamentMode = (tournament: TournamentData, mode: TournamentMode): TournamentData => {
  const allIds = tournament.teams.map((t) => t.id);
  return {
    ...tournament,
    mode,
    onCourt: [allIds[0] ?? 1, allIds[1] ?? 2],
    queueOrder: allIds.slice(2),
  };
};

export const setTournamentLength = (tournament: TournamentData, length: number | null): TournamentData => ({
  ...tournament,
  tournamentLength: length,
  celebrationShown: false,
});

export const markCelebrationShown = (tournament: TournamentData): TournamentData => ({
  ...tournament,
  celebrationShown: true,
});

export const resetTournament = (tournament: TournamentData): TournamentData => {
  const allIds = tournament.teams.map((t) => t.id);
  return {
    ...tournament,
    teams: tournament.teams.map((team, index) => ({
      ...team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
      previousPosition: index + 1,
    })),
    matches: [],
    celebrationShown: false,
    onCourt: [allIds[0] ?? 1, allIds[1] ?? 2],
    queueOrder: allIds.slice(2),
  };
};

export const updateTeamName = (tournament: TournamentData, id: number, newName: string): TournamentData => ({
  ...tournament,
  teams: tournament.teams.map((team) => (team.id === id ? { ...team, name: newName } : team)),
});

export const addNewTeam = (tournament: TournamentData): TournamentData => {
  const newId = Math.max(...tournament.teams.map((t) => t.id), 0) + 1;
  const newTeam = createTeam(newId, `Team ${newId}`, tournament.teams.length + 1);
  return {
    ...tournament,
    teams: [...tournament.teams, newTeam],
    queueOrder: [...tournament.queueOrder, newId],
  };
};

export const removeTeam = (tournament: TournamentData, id: number): TournamentData => {
  if (tournament.teams.length <= 2) return tournament;
  const remaining = tournament.teams.filter((t) => t.id !== id);
  const allIds = remaining.map((t) => t.id);
  // If a court player is removed, reset court from remaining
  const courtValid = tournament.onCourt.every((cId) => allIds.includes(cId));
  const newOnCourt: [number, number] = courtValid
    ? tournament.onCourt
    : [allIds[0] ?? 1, allIds[1] ?? 2];
  const newQueue = allIds.filter((i) => !newOnCourt.includes(i));
  return {
    ...tournament,
    teams: remaining,
    queueOrder: newQueue,
    onCourt: newOnCourt,
  };
};

export const importTournamentData = (json: string, id = Date.now()): TournamentData => {
  const parsed = JSON.parse(json) as Partial<TournamentData>;
  return normalizeTournament({ ...parsed, id, celebrationShown: false });
};

export const addTournament = (collection: TournamentCollection, name?: string): TournamentCollection => {
  const tournamentName = name ?? `Tournament ${collection.tournaments.length + 1}`;
  const tournament = createTournamentData(tournamentName, Date.now());
  return { ...collection, currentId: tournament.id, tournaments: [...collection.tournaments, tournament] };
};

export const setCurrentTournament = (collection: TournamentCollection, id: number): TournamentCollection =>
  collection.tournaments.some((t) => t.id === id) ? { ...collection, currentId: id } : collection;

export const updateTournamentInCollection = (
  collection: TournamentCollection,
  tournament: TournamentData
): TournamentCollection => ({
  ...collection,
  tournaments: collection.tournaments.map((item) => (item.id === tournament.id ? tournament : item)),
});

export const removeTournament = (collection: TournamentCollection, id: number): TournamentCollection => {
  if (collection.tournaments.length <= 1) return collection;
  const tournaments = collection.tournaments.filter((t) => t.id !== id);
  const currentId = tournaments.some((t) => t.id === collection.currentId)
    ? collection.currentId
    : tournaments[0].id;
  return { currentId, tournaments };
};
